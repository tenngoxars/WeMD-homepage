/* 观看演示：点击后才加载并播放视频（用户手势内调用 play，有声播放不会被浏览器拦截）。 */

const dialog = document.getElementById('demo-dialog');
const video = dialog?.querySelector('video');

if (dialog && video) {
    document.querySelector('[data-demo-open]')?.addEventListener('click', () => {
        dialog.showModal();
        video.currentTime = 0;
        video.play().catch(() => {});
    });

    dialog.querySelector('[data-demo-close]')?.addEventListener('click', () => dialog.close());

    // 点击遮罩关闭：遮罩区域的点击目标是 dialog 本身
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });

    dialog.addEventListener('close', () => video.pause());
}
