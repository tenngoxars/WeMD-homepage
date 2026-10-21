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

let canvas, ctx, cols = 0, rows = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let dens = null;
let next = null;
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
  window.addEventListener('mouseleave', () => { mx = my = lastMx = lastMy = -9999; });

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

// 速度场：低频旋涡 + 鼠标附近的强涡
function flowAt(c, r, time) {
  let vx = Math.sin(r * 0.15 + time * 0.55) * Math.cos(c * 0.065 - time * 0.25) * 0.30;
  let vy = Math.cos(c * 0.12 - time * 0.4) * Math.sin(r * 0.075 + time * 0.22) * 0.30;

  if (mx > 0) {
    const dx = c - mx / CW;
    const dy = r - my / CH;
    const d = Math.hypot(dx, dy) + 0.001;
    if (d < 9) {
      const f = Math.pow(1 - d / 9, 2);
      vx += (-dy / d) * f * 1.2;
      vy += (dx / d) * f * 1.2;
    }
  }
  return [vx, vy];
}

function sampleClamped(arr, x, y) {
  x = Math.max(0, Math.min(cols - 1.001, x));
  y = Math.max(0, Math.min(rows - 1.001, y));
  const xi = x | 0, yi = y | 0;
  const fx = x - xi, fy = y - yi;
  const i = xi + yi * cols;
  const a = arr[i];
  const b = arr[i + 1];
  const c2 = arr[i + cols];
  const d = arr[i + cols + 1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c2 * (1 - fx) * fy + d * fx * fy;
}

function step() {
  t += 0.016;
  frameCount++;

  // 偶发的一滴墨，让静止时也有东西在化开
  if (frameCount > nextDrip) {
    nextDrip = frameCount + DRIP_INTERVAL + Math.random() * DRIP_INTERVAL * 0.8;
    inject(Math.random() * cols, Math.random() * rows, 4.5, 1.5);
  }

  // 半拉格朗日输运：密度沿着速度场往回取样
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [vx, vy] = flowAt(c, r, t);
      const i = c + r * cols;
      next[i] = sampleClamped(dens, c - vx, r - vy) * 0.997;
    }
  }

  [dens, next] = [next, dens];
}

function draw() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  ctx.clearRect(0, 0, w, h);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = dens[c + r * cols];
      if (v < 0.05) continue;

      // 抖动一点点阈值，避免密度等值线排成整齐的虚线
      const dith = (Math.sin(c * 12.9898 + r * 78.233) * 43758.5453 % 1) * 0.03;
      const vv = Math.abs(v + dith);
      const idx = Math.min(RAMP.length - 1, 1 + Math.floor(Math.min(1, vv) * (RAMP.length - 2)));
      const ch = RAMP[idx];
      if (ch === ' ') continue;

      const alpha = 0.06 + Math.pow(Math.min(1, vv), 0.9) * 0.9;
      ctx.fillStyle = `rgba(${inkRGB}, ${alpha})`;
      ctx.fillText(ch, c * CW + CW / 2, r * CH + CH / 2);
    }
  }
}

function frame() {
  step();
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
