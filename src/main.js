import './style.css';
import { createIcons, BookOpen, Github, Palette, HardDrive, Copy, UploadCloud, Laptop, Code2, ArrowRight, Menu, X, Moon, Image, Star } from 'lucide';
import { marked } from 'marked';
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

// Visual Cloak
document.addEventListener('DOMContentLoaded', () => {
    // Instant reveal using RAF to ensure next frame paint
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
        document.body.style.pointerEvents = 'auto';
    });

    // Icons
    createIcons({
        icons: {
            BookOpen,
            Github,
            Palette,
            HardDrive,
            Copy,
            CloudUpload: UploadCloud,
            Laptop,
            Code2,
            ArrowRight,
            Menu,
            X,
            Moon,
            Image,
            Star
        }
    });

    // Mobile Menu Logic
    initMobileMenu();

    // Live Editor Logic
    initEditor();

    // Visual Enhancements
    initSpotlight();
    initHeroTilt();

    initScrollReveal();

    // Misc
    initMiscFeatures();
});

function initMiscFeatures() {
    // 1. GitHub Stars (with Caching)
    const container = document.getElementById('github-star-container');
    const countEl = document.getElementById('github-star-count');
    const CACHE_KEY = 'wemd_stars_cache';
    const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

    const renderStars = (count) => {
        if (!count || !container || !countEl) return;
        const formatted = count >= 1000 ? (count / 1000).toFixed(1) + 'k' : count;
        countEl.textContent = formatted;
        container.classList.remove('hidden');
        createIcons({ icons: { Star }, attrs: { class: "w-3.5 h-3.5 text-yellow-400 fill-yellow-400" }, nameAttr: 'data-lucide' });
    };

    if (container && countEl) {
        const cached = localStorage.getItem(CACHE_KEY);
        let validCacheFound = false;

        if (cached) {
            try {
                const { count, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    renderStars(count);
                    validCacheFound = true;
                }
            } catch (e) { localStorage.removeItem(CACHE_KEY); }
        }

        if (!validCacheFound) {
            fetch('https://api.github.com/repos/tenngoxars/WeMD')
                .then(res => {
                    if (!res.ok) throw new Error(res.statusText);
                    return res.json();
                })
                .then(data => {
                    if (data.stargazers_count) {
                        const count = data.stargazers_count;
                        renderStars(count);
                        localStorage.setItem(CACHE_KEY, JSON.stringify({
                            count: count,
                            timestamp: Date.now()
                        }));
                    }
                })
                .catch(e => {
                    console.warn('Stars fetch failed:', e);
                    if (cached && !validCacheFound) {
                        try {
                            const { count } = JSON.parse(cached);
                            renderStars(count);
                        } catch (_) { }
                    }
                });
        }
    }

    // 2. Logo Interaction (Spin on scroll top)
    const logo = document.getElementById('nav-logo');
    let lastScrollY = window.scrollY;

    if (logo) {
        window.addEventListener('scroll', () => {
            const currentY = window.scrollY;
            if (currentY < 10 && lastScrollY > 20) {
                logo.style.transform = 'rotate(360deg)';
                setTimeout(() => {
                    logo.style.transition = 'none';
                    logo.style.transform = 'rotate(0deg)';
                    logo.offsetHeight; // Force reflow
                    logo.style.transition = 'transform 0.7s ease-in-out';
                }, 700);
            }
            lastScrollY = currentY;
        });

        logo.addEventListener('mouseenter', () => {
            logo.style.transform = 'scale(1.1) rotate(5deg)';
        });
        logo.addEventListener('mouseleave', () => {
            logo.style.transform = 'scale(1) rotate(0deg)';
        });
    }
}


// Spotlight Effect
function initSpotlight() {
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

// Hero 3D Tilt
function initHeroTilt() {
    const heroSection = document.querySelector('.perspective-container');
    const heroWindow = document.getElementById('hero-window');

    if (!heroSection || !heroWindow) return;

    heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate percentage from center (-1 to 1)
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -2; // Max +/- 2deg
        const rotateY = ((x - centerX) / centerX) * 2;

        heroWindow.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    heroSection.addEventListener('mouseleave', () => {
        heroWindow.style.transform = `rotateX(0deg) rotateY(0deg)`;
    });
}

// Scroll Reveal
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger effect based on index/order
                setTimeout(() => {
                    entry.target.classList.add('reveal-visible');
                }, index * 100); // 100ms delay per item
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '50px'
    });

    document.querySelectorAll('.glass-card').forEach(el => observer.observe(el));
}

// Mobile Menu Toggle
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('mobile-menu-close');
    const menu = document.getElementById('mobile-menu');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    const drawer = document.getElementById('mobile-menu-drawer');

    if (!menuBtn || !menu) return;

    const openMenu = () => {
        // Clear inline styles preventing FOUC
        menu.style.opacity = '';
        menu.style.pointerEvents = '';
        drawer.style.transform = '';

        menu.classList.remove('pointer-events-none', 'opacity-0');
        menu.classList.add('pointer-events-auto', 'opacity-100');
        drawer.classList.remove('translate-x-full');
        document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
        menu.classList.add('pointer-events-none', 'opacity-0');
        menu.classList.remove('pointer-events-auto', 'opacity-100');
        drawer.classList.add('translate-x-full');
        document.body.style.overflow = '';
    };

    menuBtn.addEventListener('click', openMenu);
    closeBtn?.addEventListener('click', closeMenu);
    backdrop?.addEventListener('click', closeMenu);

    // Close on link click
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.classList.contains('pointer-events-none')) {
            closeMenu();
        }
    });
}

// Editor & Preview Logic
function initEditor() {
    const textarea = document.getElementById('editor-input');
    const highlight = document.getElementById('editor-highlight');
    const preview = document.getElementById('preview-render');

    if (!textarea || !highlight || !preview) return;

    const targetContent = `# WeMD

> 秩序产生美。

将 Markdown 的理性，转化为 **视觉的表达**。

## 核心特性
- **自定义样式**：内置多款精选主题。
- **本地化存储**：数据完全私有。
- **一键发布**：完美支持微信公众号。

## 代码演示
\`\`\`javascript
console.log("Hello, WeMD!");
\`\`\`

*现在就开始创作吧！*`;

    // Typewriter Logic
    const typeWriter = async () => {
        textarea.value = ''; // Start empty
        textarea.setAttribute('readonly', 'readonly'); // Block user input during demo

        // Initial pause
        await new Promise(r => setTimeout(r, 800));

        let i = 0;
        const speed = 60; // ms per char

        const typeChar = () => {
            if (i < targetContent.length) {
                textarea.value += targetContent.charAt(i);
                render(); // Update visual
                syncScroll();
                i++;

                // Randomize speed slightly for realism
                const randomDelay = speed + (Math.random() * 20 - 10);
                setTimeout(typeChar, randomDelay);
            } else {
                // Done
                textarea.removeAttribute('readonly');
                // Mobile check again
                if (window.innerWidth < 768) {
                    textarea.setAttribute('readonly', 'readonly');
                }
            }
        };

        typeChar();
    };

    // Start auto-typing if fresh visit (simple heuristic: empty value)
    if (!textarea.value) {
        typeWriter();
    }

    // Disable editing on mobile devices
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.cursor = 'default';
    }

    // --- 1. Custom Preview Renderer (Right Side) ---
    const renderer = new marked.Renderer();

    // Strong (Bold) with semantic coloring
    renderer.strong = (token) => {
        const text = (typeof token === 'object' && token) ? (token.text || token.content || '') : token;
        const content = String(text || '');

        if (content.includes('视觉的表达')) {
            return `<span style="color: #07c160; font-weight: bold;">${content}</span>`;
        } else if (content.includes('自定义样式') || content.includes('本地化存储')) {
            return `<strong style="color: #1F2937; font-weight: bold;">${content}</strong>`;
        }
        return `<strong style="color: #1F2937; font-weight: bold;">${content}</strong>`;
        // ...
    };

    marked.use(markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    }));

    marked.use({ renderer, breaks: true });
    console.log('Marked loaded with Highlight.js');

    // --- 2. Source Highlighter (Left Side) ---
    const highlightSource = (text) => {
        // Escape HTML first to prevent injection in the pre tag
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Helper for coloring
        const color = (pattern, className) => {
            html = html.replace(pattern, (match) => `<span class="${className}">${match}</span>`);
        };

        // Apply strict coloring rules based on specific patterns

        // H1: # WeMD (Primary Blue)
        html = html.replace(/^# (.*)$/gm, '<span style="color: #07c160; font-weight: bold;"># $1</span>');

        // H2: ## Core (Dark Gray)
        html = html.replace(/^## (.*)$/gm, '<span style="color: #1F2937; font-weight: bold;">## $1</span>');

        // H3: ### Subtitle (Medium Gray)
        html = html.replace(/^### (.*)$/gm, '<span style="color: #4B5563; font-weight: bold;">### $1</span>');

        // Blockquote (Neutral Gray)
        html = html.replace(/^> (.*)$/gm, '<span style="color: #6B7280;">> $1</span>');

        // Universal Bold highlighting (Dark Gray default, Orange special)
        html = html.replace(/\*\*(.*?)\*\*/g, (match, content) => {
            if (content.includes('视觉的表达')) {
                return `<span style="color: #07c160; font-weight: bold;">**${content}**</span>`;
            }
            return `<span style="color: #1F2937; font-weight: bold;">**${content}**</span>`;
        });

        // Inline Code: `...` (Pink accent)
        html = html.replace(/`([^`]+)`/g, '<span style="color: #FF6B9D; background-color: #F3F4F6; padding: 0.125rem 0.25rem; border-radius: 0.25rem;">`$1`</span>');

        // Italic: *...* (Purple accent)
        html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<span style="color: #7C3AED; font-style: italic;">*$1*</span>');

        // Links: [text](url) (Primary Blue)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="color: #07c160;">[$1]($2)</span>');

        // List Bullets: - or * or 1. at clear start of line (Gray)
        html = html.replace(/^(\s*)([-*+]|\d+\.) /gm, '$1<span style="color: #6B7280; font-weight: bold;">$2 </span>');

        // HR: ---
        html = html.replace(/^---$/gm, '<span class="text-gray-300">---</span>');

        return html;
    };


    // --- 3. Render Loop ---
    const render = () => {
        try {
            const markdown = textarea.value;

            // Update Highlight Layer (Left)
            // Add a trailing space to handle newline at end of file correctly in pre
            highlight.innerHTML = highlightSource(markdown) + '<br>';

            // Update Preview Render (Right)
            const html = marked.parse(markdown);
            preview.innerHTML = html;

        } catch (e) {
            console.error('Render Error:', e);
            preview.innerHTML = `<div class="text-red-500 p-4">Render Error: ${e.message}</div>`;
        }
    };

    // --- 4. Constraints (Max 20 Lines) ---
    const MAX_LINES = 20;

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const lines = textarea.value.split('\n').length;
            // If we are already at max lines, prevent adding more
            // Note: This is a simple check. If user is in middle of line and hits enter, it splits line.
            // We should check the resulting lines, but preventing Enter at limit is a safe heuristic for this demo.
            if (lines >= MAX_LINES) {
                e.preventDefault();
                // No visual feedback requested
            }
        }
    });

    // Sync scrolling & Render
    const syncScroll = () => {
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
    };

    // Initial
    render();

    // Events
    textarea.addEventListener('input', () => {
        // Post-input validation for paste
        const lines = textarea.value.split('\n');
        if (lines.length > MAX_LINES) {
            textarea.value = lines.slice(0, MAX_LINES).join('\n');
        }
        render();
    });
    textarea.addEventListener('scroll', syncScroll);

    // Static cursor visibility
    const staticCursor = document.getElementById('static-cursor');
    if (staticCursor) {
        textarea.addEventListener('focus', () => {
            staticCursor.style.display = 'none';
        });
        textarea.addEventListener('blur', () => {
            staticCursor.style.display = 'block';
        });
    }
}
