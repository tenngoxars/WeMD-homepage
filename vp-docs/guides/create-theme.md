# 创建自定义主题

WeMD 提供两种创建自定义主题的方式：**可视化设计器**（推荐）和**手写 CSS**。

---

## 可视化设计器（推荐）

点击 **「主题管理」** → **「新建主题」** → 选择 **「可视化设计模式」**。

可视化设计器将主题样式拆分为多个分类，通过交互式控件调整：

| 分类 | 可配置项 |
|------|----------|
| 全局 | 字体、字号、行高、正文颜色、主题色、加粗样式 |
| 标题 | H1-H4 样式预设、字号、颜色、边距 |
| 段落 | 段落间距、首行缩进、两端对齐 |
| 引用 | 样式预设、背景色、边框色、文字颜色 |
| 列表 | 符号样式、间距、标识颜色 |
| 代码 | 行内代码样式、代码块主题、Mac 风格控制栏 |
| 图片 | 边距、圆角、说明文字样式 |
| 表格 | 表头背景、边框颜色、斑马纹 |
| 其他 | 链接、斜体、删除线、高亮、脚注 |

设计器会自动生成 CSS，**无需任何 CSS 知识**。


---

## 手写 CSS（进阶）

如果你熟悉 CSS，可以选择 **「手写 CSS 模式」** 进行更精细的控制。

以下内容针对手写 CSS 模式。

### 基础知识

#### WeMD 如何渲染文章

你写的 Markdown 会被转换成 HTML，包裹在一个 `<section id="wemd">` 容器里：

```html
<section id="wemd">
    <h1><span class="prefix"></span><span class="content">标题</span><span class="suffix"></span></h1>
    <p>正文段落</p>
    ...
</section>
```

**所以你的 CSS 选择器必须以 `#wemd` 开头**，比如 `#wemd p { ... }`。

#### 主题 CSS 的作用

主题就是一段 CSS 代码，告诉浏览器：
- 标题用什么字体、颜色、大小
- 段落行距多少、对齐方式
- 引用块什么背景色、边框
- ...等等

#### 深色模式适配

WeMD 内置深色模式预览算法，你的主题 CSS **无需单独编写深色版**，算法会自动转换（还原度约 90%）。

**设计建议：**
- 颜色使用 HEX 格式（如 `#333`），不要使用颜色名称（如 `black`）
- 背景色建议使用 `transparent` 或浅色
- 高饱和度的品牌色会被自动保护

---

### 各元素详解

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

### 13. 提示块

提示块使用 GitHub 风格的 Alert 语法：`> [!NOTE]`、`> [!TIP]`、`> [!IMPORTANT]`、`> [!WARNING]`、`> [!CAUTION]`

```css
/* 基础样式 */
#wemd .callout {
    margin: 20px 0;
    padding: 16px 20px;
    background: #f5f5f5;
    border-left: 4px solid #ddd;
    border-radius: 4px;
}

#wemd .callout-title {
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 15px;
}

/* 不同类型 */
#wemd .callout-note { border-left-color: #6366f1; background: #f5f5ff; }
#wemd .callout-tip { border-left-color: #10b981; background: #ecfdf5; }
#wemd .callout-important { border-left-color: #8b5cf6; background: #f5f3ff; }
#wemd .callout-warning { border-left-color: #f59e0b; background: #fffbeb; }
#wemd .callout-caution { border-left-color: #ef4444; background: #fff5f5; }
```

---

### 14. 多图片滑动展示

多图片滑动展示是 WeMD 的多图轮播语法（`<![alt](src), ![alt](src)>`），需要配合以下 CSS 才能生效：

```css
/* 容器：横向滚动 */
#wemd .imageflow-layer1 {
    margin: 20px 0;
    overflow-x: auto;
    white-space: nowrap;
}

#wemd .imageflow-layer2 {
    display: inline-flex;
    gap: 10px; /* 图片间距 */
}

/* 单个图片容器 */
#wemd .imageflow-layer3 {
    display: inline-block;
    vertical-align: top;
    width: 80%; /* 图片默认显示宽度 */
    flex-shrink: 0;
}

/* 图片本体 */
#wemd .imageflow-img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: contain;
    border-radius: 4px;
}

/* 图片说明 */
#wemd .imageflow-caption {
    text-align: center;
    color: #888;
    margin-top: 4px;
    font-size: 14px;
}
```

---

## 参考模板

如果不想从零开始，可以参考 [templates 目录](https://github.com/tenngoxars/WeMD/tree/main/templates) 里的完整主题文件。
