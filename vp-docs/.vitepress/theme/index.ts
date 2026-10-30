/**
 * WeMD 文档主题入口
 * 
 * 按照 VitePress 官方文档推荐的方式扩展默认主题：
 * https://vitepress.dev/zh/guide/extending-default-theme
 */

import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
// 全站用霞鹜文楷；按 unicode-range 分片，只下载页面用到的字
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css'
import 'lxgw-wenkai-webfont/lxgwwenkai-bold.css'
import '@fontsource/jetbrains-mono/400.css'
import './style.css'

export default {
    extends: DefaultTheme,
    // 使用自定义 Layout 组件覆盖默认 Layout
    // 参考：https://vitepress.dev/zh/guide/extending-default-theme#layout-slots
    Layout
} satisfies Theme
