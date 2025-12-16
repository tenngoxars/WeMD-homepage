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
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                wemd: '#0025F5',
                'wemd-green': '#07c160',
                'wemd-green-light': '#E1F8EB',
                paper: '#F2F2F2',
            },
            boxShadow: {
                'hard': '4px 4px 0px 0px #000000',
                'soft': '0 4px 6px -1px rgba(7, 193, 96, 0.1), 0 2px 4px -1px rgba(7, 193, 96, 0.06)',
                'premium': '0 20px 40px -10px rgba(0,0,0,0.1), 0 0 20px -5px rgba(7, 193, 96, 0.15)',
                'glow': '0 0 20px rgba(7, 193, 96, 0.5)',
                'button-primary': '0 2px 10px -2px rgba(7, 193, 96, 0.4)',
                'button-primary-hover': '0 4px 16px -4px rgba(7, 193, 96, 0.5)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-glow': 'conic-gradient(from 90deg at 50% 50%, #ffffff 0%, #f0fdf4 50%, #ffffff 100%)',
            },
            backgroundImage: {
                'grid-pattern': "linear-gradient(to right, #D1D5DB 1px, transparent 1px), linear-gradient(to bottom, #D1D5DB 1px, transparent 1px)",
                'dot-pattern': "radial-gradient(circle, #D1D5DB 1px, transparent 1px)",
            },
            keyframes: {
                scroll: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                },
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in-down': {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '100%': { transform: 'translateX(100%)' },
                }
            },
            animation: {
                'scroll': 'scroll 15s linear infinite',
                'blink': 'blink 1s step-end infinite',
                'blob': 'blob 7s infinite',
                'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
                'fade-in-down': 'fade-in-down 0.8s ease-out forwards',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
