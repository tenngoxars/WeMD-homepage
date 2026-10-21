/* 背景控制器：默认 ASCII 墨水，空白处点击切到 WebGL 流体。
   两套引擎不会同时渲染；流体按需加载，切走即暂停。 */

import './ascii-background.js';

const stage = document.getElementById('fluid-canvas');
const asciiCanvas = stage.querySelector('canvas.bg-ascii');
asciiCanvas.style.position = 'absolute';
asciiCanvas.style.inset = '0';
asciiCanvas.style.width = '100%';
asciiCanvas.style.height = '100%';
asciiCanvas.style.opacity = '1';

let fluidCanvas = null;
let fluidLoading = null;

function loadFluid() {
    if (fluidCanvas) return Promise.resolve();
    if (!fluidLoading) {
        fluidLoading = import('./main.js').then(() => {
            fluidCanvas = stage.querySelector('canvas.bg-fluid');
            fluidCanvas.style.position = 'absolute';
            fluidCanvas.style.inset = '0';
            fluidCanvas.style.opacity = '0.2';
        }).catch((err) => {
            fluidLoading = null;
            throw err;
        });
    }
    return fluidLoading;
}

let mode = new URLSearchParams(location.search).get('bg') === 'fluid' ? 'fluid' : 'ascii';
let switching = false;

// 背景交替：旧背景先化开、再淡出；新背景从模糊里显影，避免硬切
let dissolveRaf = null;

function dissolve(incoming, outgoing, done) {
    if (dissolveRaf) cancelAnimationFrame(dissolveRaf);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DURATION = reduced ? 0 : 760;
    const start = performance.now();
    const inOpacity = incoming === asciiCanvas ? 1 : 0.2;
    const outOpacity = outgoing === asciiCanvas ? 1 : 0.2;

    incoming.style.zIndex = '2';
    if (outgoing) outgoing.style.zIndex = '1';
    incoming.style.willChange = 'opacity, filter, transform';
    if (outgoing) outgoing.style.willChange = 'opacity, filter, transform';

    const finish = () => {
        dissolveRaf = null;
        incoming.style.filter = '';
        incoming.style.opacity = String(inOpacity);
        incoming.style.transform = '';
        incoming.style.zIndex = '';
        incoming.style.willChange = '';
        if (outgoing) {
            outgoing.style.filter = '';
            outgoing.style.opacity = '';
            outgoing.style.transform = '';
            outgoing.style.zIndex = '';
            outgoing.style.willChange = '';
        }
        done?.();
    };

    if (reduced) {
        finish();
        return;
    }

    const step = (now) => {
        const p = Math.min(1, (now - start) / DURATION);
        // easeInOutCubic：起手轻，收尾也轻
        const q = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        // 新背景：模糊收束、微微缩回、透明度抬升
        incoming.style.filter = `blur(${(12 * (1 - q)).toFixed(2)}px)`;
        incoming.style.opacity = String(inOpacity * (0.55 + 0.45 * q));
        incoming.style.transform = `scale(${(1 + 0.015 * (1 - q)).toFixed(4)})`;

        // 旧背景：先轻微化开，再淡出
        if (outgoing) {
            outgoing.style.filter = `blur(${(2 * q + 9 * q * q).toFixed(2)}px)`;
            outgoing.style.opacity = String(outOpacity * (1 - q));
            outgoing.style.transform = `scale(${(1 + 0.02 * q).toFixed(4)})`;
        }

        if (p < 1) {
            dissolveRaf = requestAnimationFrame(step);
        } else {
            finish();
        }
    };
    dissolveRaf = requestAnimationFrame(step);
}

// 最近 1.2 秒的指针轨迹：切换背景时补进另一套，让拖拽痕迹接得上
const trail = [];
let replaying = false;
let replayTimer = null;

window.addEventListener('mousemove', (e) => {
    if (replaying) return;
    trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    const cutoff = performance.now() - 1200;
    while (trail.length && trail[0].t < cutoff) trail.shift();
});

function replayTrail(next) {
    if (replayTimer) { clearInterval(replayTimer); replayTimer = null; }
    replaying = false;

    // 静止一段时间后再切换，旧轨迹不应被重放
    const cutoff = performance.now() - 1200;
    while (trail.length && trail[0].t < cutoff) trail.shift();
    if (trail.length < 2) return;

    if (next === 'ascii') {
        window.__asciiBg.stirPath(trail);
        return;
    }
    if (!fluidCanvas) return;

    // 流体需要逐帧收到移动，才能把轨迹变成染料
    const points = trail.filter((_, i) => i % 2 === 0).slice(-16);
    replaying = true;
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: points[0].x, clientY: points[0].y }));
    let i = 1;
    replayTimer = setInterval(() => {
        if (i >= points.length || mode !== 'fluid') {
            clearInterval(replayTimer);
            replayTimer = null;
            replaying = false;
            return;
        }
        const p = points[i++];
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: p.x, clientY: p.y }));
    }, 16);
}

async function apply(next, origin) {
    if (next === 'fluid') await loadFluid();

    const ascii = next === 'ascii';
    const incoming = ascii ? asciiCanvas : fluidCanvas;
    const outgoing = ascii ? fluidCanvas : asciiCanvas;
    const previous = mode;
    mode = next;

    if (ascii) {
        window.__asciiBg.resume();
        window.__weMDApp?.pause?.();
    } else {
        window.__asciiBg.pause();
        window.__weMDApp?.resume?.();
    }

    incoming.style.display = 'block';
    incoming.style.zIndex = '2';
    if (outgoing) outgoing.style.zIndex = '1';

    const finish = () => {
        if (outgoing) {
            outgoing.style.display = 'none';
            outgoing.style.zIndex = '';
        }
    };

    if (previous !== next && origin) {
        dissolve(incoming, outgoing, finish);
    } else {
        finish();
    }

    replayTrail(next);
    const url = new URL(location.href);
    url.searchParams.set('bg', next);
    history.replaceState(null, '', url);
}

// 空白处点击：瞬时切换背景，不重新渲染页面元素
document.addEventListener('click', async (e) => {
    if (switching) return;
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('a, button, .interactive, .info-node, input, textarea, select, label')) return;
    switching = true;
    try {
        await apply(mode === 'ascii' ? 'fluid' : 'ascii', { x: e.clientX, y: e.clientY });
    } catch (err) {
        console.error('[background] switch failed', err);
    } finally {
        switching = false;
    }
});

// 初始化期间先挡住点击，避免和 ?bg=fluid 的加载竞争
switching = true;
apply(mode)
    .catch((err) => console.error('[background] init failed', err))
    .finally(() => { switching = false; });
