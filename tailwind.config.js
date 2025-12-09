/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./docs/**/*.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Space Grotesk', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
                serif: ['Noto Serif SC', 'serif'],
            },
            colors: {
                wemd: '#0025F5', /* 极致的克莱因蓝 */
                paper: '#F2F2F2',
            },
            boxShadow: {
                'hard': '4px 4px 0px 0px #000000',
                'hard-sm': '2px 2px 0px 0px #000000',
                'hard-lg': '8px 8px 0px 0px #000000',
            },
            backgroundImage: {
                'grid-pattern': "linear-gradient(to right, #D1D5DB 1px, transparent 1px), linear-gradient(to bottom, #D1D5DB 1px, transparent 1px)",
                'dot-pattern': "radial-gradient(circle, #D1D5DB 1px, transparent 1px)",
            },
            keyframes: {
                scroll: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' }, // Corrected to -50% for infinite scroll continuity if content is duplicated, or -100%
                },
                blink: {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0 },
                }
            },
            animation: {
                'scroll': 'scroll 15s linear infinite',
                'blink': 'blink 1s step-end infinite',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
