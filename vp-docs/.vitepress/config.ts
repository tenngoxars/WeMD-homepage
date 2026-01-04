import { defineConfig } from 'vitepress'

export default defineConfig({
    title: 'WeMD 文档',
    description: 'WeMD 是一款专为微信公众号设计的 Markdown 排版编辑器',
    lang: 'zh-CN',
    base: '/docs/',
    sitemap: {
        hostname: 'https://wemd.app'
    },

    head: [
        ['link', { rel: 'icon', href: '/favicon.svg' }],
        ['meta', { name: 'theme-color', content: '#07c160' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:site_name', content: 'WeMD' }],
    ],

    themeConfig: {
        logo: { light: '/logo-dark.svg', dark: '/logo-light.svg' },

        nav: [
            { text: '首页', link: 'https://wemd.app' },
            { text: '在线编辑', link: 'https://edit.wemd.app' },
            { text: 'GitHub', link: 'https://github.com/tenngoxars/WeMD' }
        ],

        sidebar: [
            {
                text: '入门教程',
                items: [
                    { text: '用户快速上手', link: '/tutorials/quick-start-user' },
                    { text: '开发者快速上手', link: '/tutorials/quick-start-dev' }
                ]
            },
            {
                text: '操作指南',
                items: [
                    { text: '配置图床', link: '/guides/setup-image-hosting' },
                    { text: '新增自定义主题', link: '/guides/create-theme' }
                ]
            },
            {
                text: '技术参考',
                items: [
                    { text: '快捷键列表', link: '/reference/hotkeys' },
                    { text: '项目结构', link: '/reference/project-structure' },
                    { text: '深色模式算法', link: '/reference/dark-mode-algorithm' }
                ]
            },
            {
                text: '关于',
                items: [
                    { text: '关于 WeMD', link: '/about/about' },
                    { text: '更新日志', link: '/about/changelog' },
                    { text: '常见问题', link: '/about/faq' }
                ]
            }
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/tenngoxars/WeMD' }
        ],

        footer: {
            message: '专为微信公众号设计的 Markdown 编辑器',
            copyright: '© 2025 WeMD Team'
        },

        search: {
            provider: 'local',
            options: {
                translations: {
                    button: {
                        buttonText: '搜索文档',
                        buttonAriaLabel: '搜索文档'
                    },
                    modal: {
                        noResultsText: '没有找到相关结果',
                        resetButtonTitle: '清除查询',
                        footer: {
                            selectText: '选择',
                            navigateText: '切换'
                        }
                    }
                }
            }
        },

        outline: {
            label: '本页目录',
            level: [2, 3]
        },

        docFooter: {
            prev: '上一篇',
            next: '下一篇'
        },

        lastUpdated: {
            text: '最后更新于'
        },

        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式'
    }
})
