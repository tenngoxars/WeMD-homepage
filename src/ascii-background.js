// 字体自托管：霞鹜文楷按 unicode-range 分片按需下载，不再依赖 Google Fonts
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css';
import 'lxgw-wenkai-webfont/lxgwwenkai-bold.css';
import '@fontsource/jetbrains-mono/400.css';
import './style.css';

/* ============================================================
   ASCII 墨水背景：替换原来的 WebGL 流体。
   一张真正的“墨水池”：
   - 密度场每帧沿着速度场被输运，墨团会被拉成丝、卷成涡
   - 鼠标沿轨迹滴墨，并让附近的水流转起来
   - 无人操作时，随机位置偶尔滴入一滴，画面自己慢慢化开
   最后把密度映射成字符阶梯，保留纸面留白。
   ============================================================ */

const container = document.getElementById('fluid-canvas');

const CW = 18;
const CH = 28;
const RAMP = ' .·:-=+*#';
const DRIP_INTERVAL = 55;    // 约每 1.2 秒自动滴一滴墨
const DRIP_FRAMES = 26;      // 一滴墨分这么多帧注入，由小到大晕开，不是一帧突现
const FLOW = 1.8;            // 环境水流的峰值速度，像素/帧
const EVAP = 0.0006;         // 每帧蒸发掉的固定墨量：薄处先干，化开的薄雾不会铺成一片点阵
const INK_LO = 0.05;         // 低于这个密度不显示
const INK_HI = 0.24;         // 高于这个密度按原样显示；两者之间平滑过渡，收掉化开后的薄雾

// 水流由流函数求旋度得到，天然无散：墨只会被拉长、卷起，不会被挤成一团或摊成一片。
// 流函数是三道斜向平面波之和。方向不能和网格平行，否则墨会沿整行整列排成直线。
// 每项：波长（像素）、方向角、速度占比、相位角速度、初相。速度按像素算，再换算成格。
const WAVES = [[820, 0.44, 0.45, 0.22, 0], [560, 1.75, 0.35, -0.17, 1.3], [380, -0.7, 0.3, 0.29, 4.1]]
  .map(([len, ang, share, om, ph]) => {
    const k = (2 * Math.PI) / len;
    return {
      kx: k * Math.cos(ang) * CW, ky: k * Math.sin(ang) * CH,
      u: FLOW * share * Math.sin(ang) / CW, v: -FLOW * share * Math.cos(ang) / CH,
      om, ph,
    };
  });
const TEXT_PAD = 6;          // 文字外留白，像素
const TEXT_FEATHER = 28;     // 留白外的渐变宽度，像素
const MASK_EVERY = 20;       // 每隔多少帧重算一次文字位置，跟上入场动画和展开的侧栏

let canvas, ctx, cols = 0, rows = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let dens = null;
let next = null;
let back = null;            // MacCormack 输运的回程缓冲
let velX = null, velY = null;
let mask = null;            // 每格墨色系数：1 为原样，0 为完全让开文字
const drips = [];           // 正在晕开的墨滴
let mx = -9999, my = -9999;
let lastMx = -9999, lastMy = -9999;
let t = 0;
let frameCount = 0;
let nextDrip = 40;
let rafId = null;
let running = true;
let suspended = false; // 被背景切换暂停，而不是页面隐藏
let inkRGB = '4, 78, 59';

function init() {
  if (!container) {
    document.body.style.opacity = '1';
    return;
  }

  canvas = document.createElement('canvas');
  canvas.className = 'bg-ascii';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  ctx = canvas.getContext('2d');

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMove, { passive: true });
  // mouseleave 不冒泡，挂在 window 上收不到；收不到时指针再进入会从离开点拉一条直线
  document.documentElement.addEventListener('mouseleave', () => { mx = my = lastMx = lastMy = -9999; });

  const inkVar = getComputedStyle(document.documentElement).getPropertyValue('--ascii-ink-rgb').trim();
  if (inkVar) inkRGB = inkVar;

  document.body.style.opacity = '1';
  updateGithubStars();
  loop();

  window.__asciiBg = {
    pause() { suspended = true; running = false; lastMx = lastMy = -9999; if (rafId) cancelAnimationFrame(rafId); },
    resume() { suspended = false; if (!running) { running = true; loop(); } },
    // 把最近一段指针轨迹补进墨水池，用于切换时衔接
    stirPath(points) {
      for (let i = 1; i < points.length; i++) {
        injectLine(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
      }
      if (points.length) {
        lastMx = points[points.length - 1].x;
        lastMy = points[points.length - 1].y;
      }
    }
  };
}

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = '15px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  cols = Math.ceil(w / CW);
  rows = Math.ceil(h / CH);
  dens = new Float32Array(cols * rows);
  next = new Float32Array(cols * rows);
  back = new Float32Array(cols * rows);
  velX = new Float32Array(cols * rows);
  velY = new Float32Array(cols * rows);
  mask = new Float32Array(cols * rows).fill(1);
  updateMask();
}

// 文字所在区域的可见范围：沿祖先链裁掉 overflow 隐藏的部分（如收起的侧栏条目）
function visibleBox(el, root) {
  let l = -Infinity, t = -Infinity, r = Infinity, b = Infinity;
  for (let e = el; e && e !== root.parentElement; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    if (cs.overflow !== 'visible') {
      const box = e.getBoundingClientRect();
      l = Math.max(l, box.left); t = Math.max(t, box.top);
      r = Math.min(r, box.right); b = Math.min(b, box.bottom);
    }
  }
  return r - l > 1 && b - t > 1 ? { l, t, r, b } : null;
}

// 按页面上每一行文字的实际位置算出让位系数，墨水流到文字附近会自然淡出
function updateMask() {
  const root = document.querySelector('main');
  if (!root || !mask) return;
  const base = container.getBoundingClientRect();
  const rects = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const clip = visibleBox(n.parentElement, root);
    if (!clip) continue;
    // 按钮、徽标这类带边框的链接按整个外框让位，只按文字行算会让墨水压到边框上
    const control = n.parentElement.closest('a, button');
    let lines;
    if (control && root.contains(control)) {
      lines = [control.getBoundingClientRect()];
    } else {
      range.selectNodeContents(n);
      lines = range.getClientRects();
    }
    for (const q of lines) {
      const l = Math.max(q.left, clip.l), t = Math.max(q.top, clip.t);
      const r = Math.min(q.right, clip.r), b = Math.min(q.bottom, clip.b);
      if (r - l < 1 || b - t < 1) continue;
      rects.push(l - base.left, t - base.top, r - base.left, b - base.top);
    }
  }

  for (let row = 0; row < rows; row++) {
    const y = row * CH + CH / 2;
    for (let c = 0; c < cols; c++) {
      const x = c * CW + CW / 2;
      let d = Infinity;
      for (let k = 0; k < rects.length; k += 4) {
        const dx = Math.max(rects[k] - x, 0, x - rects[k + 2]);
        const dy = Math.max(rects[k + 1] - y, 0, y - rects[k + 3]);
        d = Math.min(d, Math.hypot(dx, dy));
      }
      const s = Math.min(1, Math.max(0, (d - TEXT_PAD) / TEXT_FEATHER));
      mask[c + row * cols] = s * s * (3 - 2 * s);
    }
  }
}

function onMove(e) {
  if (!running) return;
  const rect = container.getBoundingClientRect();
  const nx = e.clientX - rect.left;
  const ny = e.clientY - rect.top;
  if (lastMx > -9999) injectLine(lastMx, lastMy, nx, ny);
  lastMx = nx;
  lastMy = ny;
  mx = nx;
  my = ny;
}

function injectLine(x0, y0, x1, y1) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 5));
  for (let s = 0; s <= steps; s++) {
    const px = x0 + (x1 - x0) * (s / steps);
    const py = y0 + (y1 - y0) * (s / steps);
    inject(px / CW, py / CH, 2.4, 0.9);
  }
}

// 在指定格点附近加一滴墨
function inject(cx, cy, radius, amount) {
  for (let r = Math.floor(cy - radius); r <= cy + radius; r++) {
    for (let c = Math.floor(cx - radius); c <= cx + radius; c++) {
      if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
      const d = Math.hypot(c - cx, (r - cy) * 0.9);
      if (d > radius) continue;
      const i = c + r * cols;
      dens[i] = Math.min(1.4, dens[i] + Math.pow(1 - d / radius, 2) * amount);
    }
  }
}

// 取样点落在画面外时返回 outside。正向取样传 0：画面外是清水，流进来的不带墨；
// 夹到边缘取样的话，贴边的墨会一直被复制进来，拖出一条直线
function sample(arr, x, y, outside) {
  if (x < 0 || y < 0 || x > cols - 1 || y > rows - 1) return outside;
  x = Math.min(cols - 1.001, x);
  y = Math.min(rows - 1.001, y);
  const xi = x | 0, yi = y | 0;
  const fx = x - xi, fy = y - yi;
  const i = xi + yi * cols;
  const a = arr[i];
  const b = arr[i + 1];
  const c2 = arr[i + cols];
  const d = arr[i + cols + 1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c2 * (1 - fx) * fy + d * fx * fy;
}

// 修正后的值夹回出发点四邻的范围，修正过头会凭空长出亮斑
function clampToSource(arr, x, y, v) {
  if (x < 0 || y < 0 || x > cols - 1 || y > rows - 1) return 0;
  x = Math.min(cols - 1.001, x);
  y = Math.min(rows - 1.001, y);
  const i = (x | 0) + (y | 0) * cols;
  const a = arr[i], b = arr[i + 1], c2 = arr[i + cols], d = arr[i + cols + 1];
  return Math.max(Math.min(a, b, c2, d), Math.min(Math.max(a, b, c2, d), v));
}

function step() {
  t += 0.016;
  frameCount++;

  // 偶发的一滴墨，让静止时也有东西在化开
  if (frameCount > nextDrip) {
    nextDrip = frameCount + DRIP_INTERVAL + Math.random() * DRIP_INTERVAL * 0.8;
    drips.push({ x: Math.random() * cols, y: Math.random() * rows, age: 0 });
  }
  for (let i = drips.length - 1; i >= 0; i--) {
    const d = drips[i];
    const k = ++d.age / DRIP_FRAMES;
    inject(d.x, d.y, 1.2 + 3.3 * k, 0.11);
    if (d.age >= DRIP_FRAMES) drips.splice(i, 1);
  }

  // 这一帧的速度场：环境水流 + 鼠标附近的强涡
  const mcx = mx / CW, mcy = my / CH;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // u = ∂ψ/∂y，v = -∂ψ/∂x
      let vx = 0, vy = 0;
      for (const w of WAVES) {
        const cs = Math.cos(w.kx * c + w.ky * r + w.om * t + w.ph);
        vx += w.u * cs;
        vy += w.v * cs;
      }

      if (mx > 0) {
        const dx = c - mcx;
        const dy = r - mcy;
        const d = Math.hypot(dx, dy) + 0.001;
        if (d < 9) {
          const f = Math.pow(1 - d / 9, 2);
          vx += (-dy / d) * f * 1.2;
          vy += (dx / d) * f * 1.2;
        }
      }
      velX[c + r * cols] = vx;
      velY[c + r * cols] = vy;
    }
  }

  // MacCormack 输运：往回取样一次，再原路送回去，用来回的偏差修正。
  // 只取样一次的话，每帧的双线性插值都会抹平一点，墨几秒内就糊成一片点。
  for (let r = 0, i = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, i++) next[i] = sample(dens, c - velX[i], r - velY[i], 0);
  }
  // 回程落在画面外的格子不做修正（偏差记为 0），否则流出边缘的墨会粘在最后一行一列上
  for (let r = 0, i = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, i++) back[i] = sample(next, c + velX[i], r + velY[i], dens[i]);
  }
  for (let r = 0, i = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, i++) {
      const v = next[i] + 0.5 * (dens[i] - back[i]);
      back[i] = Math.max(0, clampToSource(dens, c - velX[i], r - velY[i], v) * 0.997 - EVAP);
    }
  }

  [dens, back] = [back, dens];
}

function draw() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  ctx.clearRect(0, 0, w, h);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = dens[c + r * cols];
      if (v < INK_LO) continue;

      // 抖动一点点阈值，避免密度等值线排成整齐的虚线
      const dith = (Math.sin(c * 12.9898 + r * 78.233) * 43758.5453 % 1) * 0.03;
      const vv = Math.abs(v + dith);
      const idx = Math.min(RAMP.length - 1, 1 + Math.floor(Math.min(1, vv) * (RAMP.length - 2)));
      const ch = RAMP[idx];
      if (ch === ' ') continue;

      const s = Math.min(1, (vv - INK_LO) / (INK_HI - INK_LO));
      const fade = s <= 0 ? 0 : s * s * (3 - 2 * s);
      const alpha = fade * (0.06 + Math.pow(Math.min(1, vv), 0.9) * 0.9) * mask[c + r * cols];
      if (alpha < 0.02) continue;
      ctx.fillStyle = `rgba(${inkRGB}, ${alpha})`;
      ctx.fillText(ch, c * CW + CW / 2, r * CH + CH / 2);
    }
  }
}

function frame() {
  step();
  if (frameCount % MASK_EVERY === 0) updateMask();
  draw();
  rafId = requestAnimationFrame(frame);
}

function loop() {
  if (!running) return;
  frame();
}

async function updateGithubStars() {
  try {
    const response = await fetch('https://api.github.com/repos/tenngoxars/WeMD');
    const data = await response.json();
    const starCount = document.getElementById('star-count');
    if (starCount && data.stargazers_count !== undefined) {
      starCount.textContent = `· ${data.stargazers_count} Stars`;
    }
  } catch (e) { }
}

// 页面隐藏时停掉动画，省电
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  } else if (!running && !suspended) {
    running = true;
    loop();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
