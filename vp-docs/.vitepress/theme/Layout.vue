<!--
  WeMD 文档自定义布局 (v4 - 高性能版)
  
  核心设计：纯CSS静态渐变背景，零动画，零性能开销
-->
<script setup>
import DefaultTheme from 'vitepress/theme'
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #layout-top>
      <div class="wemd-gradient-bg" aria-hidden="true"></div>
    </template>
  </Layout>
</template>

<style>
/* 高性能静态渐变背景 - 无动画，单层渲染 */
.wemd-gradient-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  
  /* 多层径向渐变叠加，模拟柔和光晕效果 */
  background: 
    /* 右上角 - 微信绿光晕 */
    radial-gradient(ellipse 80% 60% at 85% 15%, rgba(7, 193, 96, 0.12) 0%, transparent 60%),
    /* 左下角 - 淡蓝光晕 */
    radial-gradient(ellipse 70% 50% at 10% 90%, rgba(100, 180, 255, 0.08) 0%, transparent 50%),
    /* 中央 - 极淡的暖色调 */
    radial-gradient(ellipse 100% 80% at 50% 50%, rgba(255, 250, 245, 0.5) 0%, transparent 70%),
    /* 底色 */
    #fafbfc;
}

/* 深色模式 */
.dark .wemd-gradient-bg {
  background: 
    /* 右上角 - 微信绿光晕 */
    radial-gradient(ellipse 80% 60% at 85% 15%, rgba(7, 193, 96, 0.08) 0%, transparent 60%),
    /* 左下角 - 淡蓝光晕 */
    radial-gradient(ellipse 70% 50% at 10% 90%, rgba(80, 140, 200, 0.06) 0%, transparent 50%),
    /* 底色 */
    #0f1419;
}
</style>
