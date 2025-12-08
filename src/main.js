import './style.css';
import { createIcons, icons } from 'lucide';
import { marked } from 'marked';

// Visual Cloak
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';

    // Icons
    createIcons({ icons });

    // Live Editor Logic
    initEditor();
});

// Editor & Preview Logic
function initEditor() {
    const textarea = document.getElementById('editor-input');
    const highlight = document.getElementById('editor-highlight');
    const preview = document.getElementById('preview-render');

    if (!textarea || !highlight || !preview) return;

    const defaultContent = `# WeMD

> 秩序产生美。

将 Markdown 的理性，转化为 **视觉的表达**。

## 核心
- **自定义样式**
- **本地化存储**`;

    if (!textarea.value) {
        textarea.value = defaultContent;
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
        try {
            // Marked 5.x+ passes a token object { text: '...', ... }
            const text = (typeof token === 'object' && token) ? (token.text || token.content || '') : token;
            const content = String(text || '');

            if (content.includes('视觉的表达')) {
                return `<span style="color: #FF6B35; font-weight: bold;">${content}</span>`;
            } else if (content.includes('自定义样式') || content.includes('本地化存储')) {
                return `<strong style="color: #1F2937; font-weight: bold;">${content}</strong>`;
            }
            return `<strong style="color: #1F2937; font-weight: bold;">${content}</strong>`;
        } catch (e) {
            console.error(e);
            return `<strong>${String(token)}</strong>`;
        }
    };

    marked.use({ renderer, breaks: true });
    console.log('Marked loaded');

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
        html = html.replace(/^# (.*)$/gm, '<span style="color: #0025F5; font-weight: bold;"># $1</span>');

        // H2: ## Core (Dark Gray)
        html = html.replace(/^## (.*)$/gm, '<span style="color: #1F2937; font-weight: bold;">## $1</span>');

        // H3: ### Subtitle (Medium Gray)
        html = html.replace(/^### (.*)$/gm, '<span style="color: #4B5563; font-weight: bold;">### $1</span>');

        // Blockquote (Neutral Gray)
        html = html.replace(/^> (.*)$/gm, '<span style="color: #6B7280;">> $1</span>');

        // Universal Bold highlighting (Dark Gray default, Orange special)
        html = html.replace(/\*\*(.*?)\*\*/g, (match, content) => {
            if (content.includes('视觉的表达')) {
                return `<span style="color: #FF6B35; font-weight: bold;">**${content}**</span>`;
            }
            return `<span style="color: #1F2937; font-weight: bold;">**${content}**</span>`;
        });

        // Inline Code: `...` (Pink accent)
        html = html.replace(/`([^`]+)`/g, '<span style="color: #FF6B9D; background-color: #F9FAFB; padding: 0.125rem 0.25rem; border-radius: 0.25rem;">`$1`</span>');

        // Italic: *...* (Purple accent)
        html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<span style="color: #7C3AED; font-style: italic;">*$1*</span>');

        // Links: [text](url) (Primary Blue)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="color: #0025F5;">[$1]($2)</span>');

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

    // --- 4. Constraints (Max 10 Lines) ---
    const MAX_LINES = 10;

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
