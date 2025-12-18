/**
 * WeMD 文档主题入口
 * 
 * 按照 VitePress 官方文档推荐的方式扩展默认主题：
 * https://vitepress.dev/zh/guide/extending-default-theme
 */

import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './style.css'

export default {
    extends: DefaultTheme,
    // 使用自定义 Layout 组件覆盖默认 Layout
    // 参考：https://vitepress.dev/zh/guide/extending-default-theme#layout-slots
    Layout
} satisfies Theme
