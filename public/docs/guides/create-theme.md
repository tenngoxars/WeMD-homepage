# 创建自定义主题

本文档教你理解 WeMD 主题的 CSS 结构，让你能**从零设计**或**按需修改**任何主题。

---

## 基础知识

### WeMD 如何渲染文章

你写的 Markdown 会被转换成 HTML，包裹在一个 `<section id="wemd">` 容器里：

```html
<section id="wemd">
    <h1><span class="prefix"></span><span class="content">标题</span><span class="suffix"></span></h1>
    <p>正文段落</p>
    ...
</section>
```

**所以你的 CSS 选择器必须以 `#wemd` 开头**，比如 `#wemd p { ... }`。

### 主题 CSS 的作用

主题就是一段 CSS 代码，告诉浏览器：
- 标题用什么字体、颜色、大小
- 段落行距多少、对齐方式
- 引用块什么背景色、边框
- ...等等

---

## 各元素详解

以下逐一讲解每个 Markdown 元素对应的 HTML 结构和常用样式属性。

### 1. 容器（整体）

控制文章的最大宽度、内边距、默认字体。

```css
#wemd {
    max-width: 677px;       /* 最大宽度，适合公众号阅读 */
    padding: 30px 20px;     /* 内边距 */
    margin: 0 auto;         /* 居中 */
    font-family: -apple-system, "PingFang SC", sans-serif;
    color: #333;            /* 默认文字颜色 */
    background: #fff;       /* 背景色 */
}
```

---

### 2. 标题

标题的 HTML 结构比较特殊，包含三个 span：

```html
<h1>
    <span class="prefix"></span>      <!-- 前缀装饰 -->
    <span class="content">标题文字</span>
    <span class="suffix"></span>      <!-- 后缀装饰 -->
</h1>
```

**设置标题文字样式**（用 `.content`）：
```css
#wemd h1 .content {
    font-size: 24px;
    font-weight: bold;
    color: #000;
}
```

**设置标题位置和间距**：
```css
#wemd h1 {
    text-align: center;     /* 居中 */
    margin: 40px 0 30px;    /* 上边距 40px，下边距 30px */
}
```

**添加装饰**（用 `.prefix` 或 `.suffix`）：
```css
#wemd h2 .prefix::before {
    content: "📌 ";         /* 在标题前加 emoji */
}
```

**隐藏装饰**（不需要时）：
```css
#wemd h1 .prefix, #wemd h1 .suffix { display: none; }
```

---

### 3. 段落

```css
#wemd p {
    margin: 16px 0;         /* 段落间距 */
    line-height: 1.8;       /* 行高，1.8 比较舒适 */
    text-align: justify;    /* 两端对齐 */
    font-size: 16px;
}
```

---

### 4. 加粗、斜体、高亮

```css
#wemd strong { font-weight: bold; color: #000; }        /* **加粗** */
#wemd em { font-style: italic; }                        /* *斜体* */
#wemd mark { background: #fff3cd; padding: 2px 4px; }   /* ==高亮== */
#wemd del { text-decoration: line-through; color: #999; } /* ~~删除线~~ */
```

---

### 5. 链接

```css
#wemd a {
    color: #1a73e8;
    text-decoration: none;
    border-bottom: 1px solid #1a73e8;   /* 用下边框代替下划线 */
}
```

---

### 6. 行内代码

行内代码出现在段落或列表项里：

```css
#wemd p code, #wemd li code {
    background: #f5f5f5;
    color: #e83e8c;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: Consolas, monospace;
    font-size: 14px;
}
```

---

### 7. 代码块

⚠️ **重要**：代码块使用 `#wemd pre code.hljs`，**不要设置 `color`**，否则会覆盖语法高亮。

```css
#wemd pre code.hljs {
    display: block;
    padding: 16px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.6;
    overflow-x: auto;
    /* 不要写 color: xxx; */
}
```

---

### 8. 引用块

引用支持多级，类名分别是 `.multiquote-1`、`.multiquote-2`、`.multiquote-3`：

```css
#wemd .multiquote-1 {
    background: #f5f5f5;
    border-left: 4px solid #ddd;
    padding: 16px 20px;
    margin: 20px 0;
}
#wemd .multiquote-1 p { margin: 0; color: #666; }
```

---

### 9. 列表

```css
#wemd ul, #wemd ol {
    margin: 15px 0;
    padding-left: 25px;
}
#wemd li section {
    line-height: 1.7;
}
```

---

### 10. 表格

```css
#wemd table { width: 100%; border-collapse: collapse; margin: 20px 0; }
#wemd table tr th {
    background: #f5f5f5;
    border: 1px solid #ddd;
    padding: 10px;
    font-weight: bold;
}
#wemd table tr td {
    border: 1px solid #ddd;
    padding: 10px;
}
```

---

### 11. 图片

```css
#wemd img {
    display: block;
    margin: 20px auto;
    max-width: 100%;
    border-radius: 6px;
}
```

---

### 12. 分割线

```css
#wemd hr {
    margin: 30px 0;
    border: none;
    border-top: 1px solid #ddd;
}
```

---

## 如何使用

1. 点击 **「主题管理」** → **「新建自定义主题」**
2. 输入主题名称
3. 把上面需要的样式组合起来，粘贴到 CSS 编辑区
4. 保存后点击主题名称应用

---

## 参考模板

如果不想从零开始，可以参考 [templates 目录](https://github.com/tenngoxars/WeMD/tree/main/templates) 里的完整主题文件。
