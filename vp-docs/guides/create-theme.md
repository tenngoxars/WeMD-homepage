---
description: 在 WeMD 中创建自定义公众号排版主题：用可视化设计器免写代码调样式，或手写 CSS 精细控制。
---

# 创建自定义主题

WeMD 提供两种编辑模式：**可视化设计**（推荐）和**手写 CSS**。除此之外还有两条捷径：**导入主题**和**复制内置主题**。

## 打开主题面板

点击顶栏的 **「文章主题」**。隐藏标题栏后（以及移动端），入口在浮动工具栏的 **「主题管理」**。

面板左侧有两个创建入口，内置主题另有「复制」：

- **「新建自定义主题」**：先选 **「可视化设计」** 或 **「手写 CSS」**，再进入编辑器
- **「导入主题」**：选择之前导出的 `.json` 主题文件。只有可视化设计主题导出的 JSON 才能导入，纯 CSS 文件导入不了
- **「复制」**：选中任意内置主题，面板底部的「复制」会基于它创建一份自定义主题，原有 CSS 一起带过来

主题的编辑模式在创建时就确定了，之后不能更改：可视化设计主题没有 CSS 输入框，手写 CSS 主题也不会出现设计器。要换模式只能新建一个主题，再把 CSS 复制过去。

## 可视化设计

**「新建自定义主题」** → **「可视化设计」**。

设计器把样式拆成 10 个分类，用交互式控件调整：

| 分类 | 可配置项 |
|------|----------|
| 全局 | 字体、正文字号、行高、全局字间距、段落内部间距、页面两侧间距、正文颜色、主题色、加粗样式 |
| 标题 | H1–H4 各自的样式预设、标题内容居中、字号、字重、字间距、文字颜色、上边距、下边距 |
| 段落 | 段落间距、段落首行缩进、两端对齐；分割线的样式、颜色、高度、上下边距 |
| 引用 | 样式预设、边框样式、边框粗细、引用背景、边框颜色、引用文字颜色、内部间距（水平／垂直）、字体大小、行高、引用文字内容居中 |
| 列表 | 无序列表符号（一级／二级）、有序列表符号（一级／二级）、一级／二级标识颜色、列表项间距、无序列表字号、有序列表字号 |
| 代码 | 行内代码（样式预设、文字颜色、背景颜色）、代码块（高亮主题、字号）、Mac 风格控制栏 |
| 图片 | 边距、圆角、阴影、说明文字颜色、说明文字大小、说明文字对齐 |
| 表格 | 表头背景、表头文字、边框颜色、斑马纹 |
| Mermaid | 基准主题（基础 Base、默认 Default、森林 Forest、中性 Neutral、深色 Dark） |
| 其他 | 链接颜色、显示下划线；文本样式（斜体颜色、删除线颜色、下划线样式、下划线颜色、加粗颜色）；高亮背景、高亮文字；脚注（脚注颜色、详情字号、栏目标题、标题颜色、标题样式） |

设计器会把你调出来的样式生成成 CSS 写进主题，**无需任何 CSS 知识**。之后想再改，回到面板选中这个主题继续调就行。

## 自定义主题存在哪里

主题面板底部会显示当前的保存位置：

- 启用本地文件夹后，自定义主题存在工作区的 `.wemd/themes.json` 里。换浏览器或换设备打开同一个文件夹，主题还在
- 没有本地文件夹时，只存在当前浏览器；之后启用本地文件夹，会随文件夹一起保存
- 文件夹里的主题文件读不出来时，这一次的保存只留在本机

浏览器里同时留有一份自定义主题的镜像，实际以文件夹中的 `themes.json` 为准。

## 手写 CSS（进阶）

如果你熟悉 CSS，可以选 **「手写 CSS」** 做更精细的控制。新建时编辑器是空的，需要自己填内容；以下内容针对手写 CSS 模式。

### 获取起始模板

从零写一套完整主题比较费劲，可以先用下面任意一条路径拿到一份能跑的 CSS：

1. **复制内置主题**：选中任一内置主题，点 **「复制」**，得到一份带完整样式的自定义主题；在编辑器里直接改最省事。内置主题的 CSS 自带基础样式和代码高亮配色
2. **导出可视化主题**：用可视化设计新建并 **「保存为新主题」**，然后在面板底部点 **「导出」** → **「CSS（不支持可视化编辑）」** 下载 `.css` 文件，再新建一个手写 CSS 主题，把内容粘贴进去继续微调
3. **用官方起始模板**：直接下载 [templates/Template.css](https://github.com/tenngoxars/WeMD/blob/main/templates/Template.css)，它带分节注释和深色模式说明。这份模板不含代码高亮配色，需要参照内置主题补上 `hljs` 相关规则

面板底部的 **「导出」** 只出现在自定义主题上，内置主题只有「复制」「取消」「应用主题」。导出菜单里，**「JSON（支持可视化编辑）」** 只在可视化设计主题上出现，导出的 JSON 用于再导入；**「CSS（不支持可视化编辑）」** 导出的就是当前主题的 CSS 源码。顶栏的 **「导出」** 是导出文章（复制 HTML、导出长图），和主题导出不是一回事。

可视化设计器生成的 CSS 会在开头声明一组 **CSS 变量**（以 `--wemd-` 开头），你可以直接改这些变量的值来批量调整样式。

#### 完整变量列表

| 变量名 | 说明 |
|--------|------|
| **全局** | |
| `--wemd-page-padding` | 页面两侧间距 |
| `--wemd-font-size` | 正文字号 |
| `--wemd-line-height` | 行高 |
| `--wemd-paragraph-margin` | 段落间距 |
| `--wemd-paragraph-padding` | 段落内边距 |
| `--wemd-text-color` | 正文颜色 |
| `--wemd-primary-color` | 主题色 |
| `--wemd-primary-color-20` | 主题色衍生物（透明度 12%） |
| `--wemd-primary-color-30` | 主题色衍生物（透明度 18%） |
| `--wemd-primary-color-50` | 主题色衍生物（透明度 50%） |
| `--wemd-letter-spacing` | 全局字间距 |
| `--wemd-underline-style` | 下划线样式 |
| `--wemd-underline-color` | 下划线颜色 |
| **标题** | |
| `--wemd-h1-font-size` | H1 字号（h2/h3/h4 同理） |
| `--wemd-h1-color` | H1 颜色 |
| `--wemd-h1-margin-top` | H1 上边距 |
| `--wemd-h1-margin-bottom` | H1 下边距 |
| **代码** | |
| `--wemd-code-background` | 代码块背景色 |
| `--wemd-code-font-size` | 代码块字号 |
| `--wemd-inline-code-color` | 行内代码颜色 |
| `--wemd-inline-code-background` | 行内代码背景色 |
| **引用** | |
| `--wemd-quote-background` | 引用块背景色 |
| `--wemd-quote-border-color` | 引用块边框颜色 |
| `--wemd-quote-border-width` | 引用块边框宽度 |
| `--wemd-quote-border-style` | 引用块边框样式 |
| `--wemd-quote-text-color` | 引用块文字颜色 |
| `--wemd-quote-font-size` | 引用块字号 |
| `--wemd-quote-line-height` | 引用块行高 |
| `--wemd-quote-padding-x` | 引用块水平内边距 |
| `--wemd-quote-padding-y` | 引用块垂直内边距 |
| **图片** | |
| `--wemd-image-margin` | 图片间距 |
| `--wemd-image-border-radius` | 图片圆角 |
| `--wemd-image-shadow` | 图片阴影（`none` 或 `0 4px 12px rgba(0, 0, 0, 0.12)`） |
| `--wemd-image-caption-color` | 图注颜色 |
| `--wemd-image-caption-font-size` | 图注字号 |
| `--wemd-image-caption-align` | 图注对齐 |
| **链接与文本** | |
| `--wemd-link-color` | 链接颜色 |
| `--wemd-italic-color` | 斜体颜色 |
| `--wemd-del-color` | 删除线颜色 |
| `--wemd-mark-background` | 高亮背景色 |
| `--wemd-mark-color` | 高亮文字颜色 |
| **表格** | |
| `--wemd-table-header-background` | 表头背景色 |
| `--wemd-table-header-color` | 表头文字颜色 |
| `--wemd-table-border-color` | 表格边框颜色 |
| **分割线** | |
| `--wemd-hr-color` | 分割线颜色 |
| `--wemd-hr-height` | 分割线高度 |
| `--wemd-hr-margin` | 分割线上下间距 |
| **列表** | |
| `--wemd-list-spacing` | 列表项间距 |
| `--wemd-list-marker-color` | 列表符号颜色 |
| `--wemd-list-marker-color-l2` | 二级列表符号颜色 |

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

#### 为单个元素指定样式

如果只想调整某一个段落、标题、表格、图片、链接或行内格式，可以在 Markdown 中为它添加局部属性：

```markdown
## 重点章节 {.featured-heading}

这是一段摘要。 {.summary data-kind=abstract}

![文章封面](https://example.com/cover.png){.hero-image}

[查看详情](https://example.com){.cta-link}

这是 **重点内容**{.inline-highlight}。
```

然后在手写 CSS 中使用对应的选择器：

```css
#wemd .featured-heading .content {
    color: #b42318;
}

#wemd .summary[data-kind="abstract"] {
    padding: 12px 16px;
    background: #fff1f0;
    border-left: 4px solid #b42318;
}

#wemd .hero-image {
    border-radius: 12px;
}

#wemd .cta-link {
    color: #1677ff;
}

#wemd .inline-highlight {
    padding: 0 2px;
    background: #fff1b8;
}
```

表格属性需要另起一行，并与表格之间保留一个空行：

```markdown
| 项目 | 状态 |
| --- | --- |
| 局部样式 | 已支持 |

{.compact-table #feature-table}
```

行内属性可用于链接、图片、斜体、粗体、删除线、行内代码、高亮、下划线、上标和下标。段落末尾的纯文本不会生成 `<span>`，属性会挂到所在段落的 `<p>` 上；列表项内的纯文本、分割线、表格单元格和软换行后的属性不会被解析，会原样留在正文里。带标题并被转换为脚注的外链也不再生成 `<a>`，没有可承载属性的目标元素。

属性语法仅允许 `class`、`id` 和 `data-*`，不能覆盖图片 `src`、链接 `href`，也不能直接写入 `style` 或事件属性。复制到微信公众号时，主题 CSS 会先根据这些属性内联到元素上，因此即使公众号清理了部分属性，最终视觉样式仍可保留。

#### 深色模式适配

WeMD 内置深色模式预览算法，你的主题 CSS **无需单独编写深色版**，算法会自动转换并尽量接近微信实机效果。预览与真机仍可能有差异，最终效果以微信里的显示为准。

会被转换的颜色写法：HEX（`#333`、`#333333`）、`rgb()` / `rgba()`、`hsl()` / `hsla()`。值里出现 `var(--xxx)` 时整条声明原样保留，`url()` 的图片不受影响；`transparent`、`currentColor`、`inherit`、`initial`、`unset`、`none` 这些关键字不参与转换，写成颜色名称（如 `black`）也不会转换。

**设计建议：**
- 颜色用 HEX 格式（如 `#333`），不要写颜色名称（如 `black`）
- 背景色建议用 `transparent` 或浅色
- 高饱和度的品牌色会被自动保护

转换规则的完整说明见 [深色模式算法](/reference/dark-mode-algorithm)。

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

### 3. 段落

```css
#wemd p {
    margin: 16px 0;         /* 段落间距 */
    line-height: 1.8;       /* 行高，1.8 比较舒适 */
    text-align: justify;    /* 两端对齐 */
    font-size: 16px;
}
```

### 4. 加粗、斜体、高亮

```css
#wemd strong { font-weight: bold; color: #000; }        /* **加粗** */
#wemd em { font-style: italic; }                        /* *斜体* */
#wemd mark { background: #fff3cd; padding: 2px 4px; }   /* ==高亮== */
#wemd del { text-decoration: line-through; color: #999; } /* ~~删除线~~ */
```

### 5. 链接

```css
#wemd a {
    color: #1a73e8;
    text-decoration: none;
    border-bottom: 1px solid #1a73e8;   /* 用下边框代替下划线 */
}
```

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

### 7. 代码块

**重要**：代码块使用 `#wemd pre code.hljs`，**不要设置 `color`**，否则会覆盖语法高亮。

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

### 8. 引用块

引用最外层会按这整块引用的嵌套层数获得 `.multiquote-1`、`.multiquote-2`、`.multiquote-3`……，层数没有上限。内层 `blockquote` 没有独立类名，要做分层样式得用后代选择器：

```css
#wemd .multiquote-1 {
    background: #f5f5f5;
    border-left: 4px solid #ddd;
    padding: 16px 20px;
    margin: 20px 0;
}
#wemd .multiquote-1 p { margin: 0; color: #666; }

/* 嵌套两层时的内层引用 */
#wemd blockquote blockquote {
    background: #fafafa;
    border-left: 2px solid #ccc;
}
```

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

### 10. 表格

表格会被包进一层 `<section class="table-container">`，横向滚动就由这层负责：

```css
#wemd .table-container { overflow-x: auto; }
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

用属性语法给表格加 class 时，属性落在 `<table>` 上，外层 `table-container` 不受影响。

### 11. 图片

单独成段的图片会连同图注一起包进 `<figure>`，图注是 `<figcaption>`：

```html
<figure>
    <img src="..." alt="...">
    <figcaption>图注文字</figcaption>
</figure>
```

```css
#wemd figure {
    margin: 20px 0;
}

#wemd img {
    display: block;
    margin: 20px auto;
    max-width: 100%;
    border-radius: 6px;
}

#wemd figcaption {
    margin-top: 5px;
    text-align: center;
    color: #888;
    font-size: 14px;
}
```

图注用的是 `<figcaption>`，不是 `<p>` 或 `<span>`，写 `#wemd p` 之类的规则管不到它。

### 12. 分割线

```css
#wemd hr {
    margin: 30px 0;
    border: none;
    border-top: 1px solid #ddd;
}
```

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

/* 标题里的图标是内联 span */
#wemd .callout-icon {
    margin-right: 8px;
    font-size: 18px;
}

/* 不同类型 */
#wemd .callout-note { border-left-color: #6366f1; background: #f5f5ff; }
#wemd .callout-tip { border-left-color: #10b981; background: #ecfdf5; }
#wemd .callout-important { border-left-color: #8b5cf6; background: #f5f3ff; }
#wemd .callout-warning { border-left-color: #f59e0b; background: #fffbeb; }
#wemd .callout-caution { border-left-color: #ef4444; background: #fff5f5; }
```

标题内部的结构是 `<span class="callout-icon">图标</span><span>标题</span>`，图标的大小和右间距都由 `.callout-icon` 控制。

### 14. 脚注

带标题的外链会被转成脚注，生成这几个类名：`.footnote-word`、`.footnote-ref`、`.footnotes-sep`、`.footnotes`、`.footnote-item`、`.footnote-num`。

```css
/* 正文里的脚注标记 */
#wemd .footnote-word { color: #6366f1; }

#wemd .footnote-ref { color: #6366f1; }
#wemd .footnote-ref a { color: #6366f1; text-decoration: none; }

/* 文末的脚注区 */
#wemd .footnotes-sep { margin: 24px 0 8px; border: none; }

#wemd .footnotes {
    font-size: 14px;
    color: #666;
}

#wemd .footnote-item {
    font-size: 14px;
    color: #666;
}

#wemd .footnote-num { color: #6366f1; }
```

`.footnotes-sep` 是一个空的 `<h3>`，用来画脚注区的分隔线；`.footnotes` 是文末整个脚注区。

### 15. 多图片滑动展示

多图片滑动展示是 WeMD 的多图轮播语法（`<![alt](src), ![alt](src)>`）。内置主题和可视化设计生成的主题都已自带下面这套样式，只有从零手写 CSS 时才需要自己补上，否则轮播会变成一列普通图片：

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

一次最多放 10 张图，超过这个数量会退回成普通图片。图下方的说明文字是固定文案「<<< 左右滑动见更多 >>>」，不是每张图的 alt。

