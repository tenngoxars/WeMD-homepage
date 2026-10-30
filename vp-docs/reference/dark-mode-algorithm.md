---
description: WeMD 如何在编辑器里预览微信公众号深色模式：参考官方 mp-darkmode 的色彩转换算法原理与内置阈值。
---

# 微信深色模式预览算法

WeMD 内置了一套色彩转换算法，用来在编辑器里预览文章在微信深色模式下大致的样子，效果接近微信实机，但预览和实机仍可能有差异，以手机上的实际显示为准。

> [!NOTE]
> 该算法参考了微信官方公开的 [wechatjs/mp-darkmode](https://github.com/wechatjs/mp-darkmode)，把其中的颜色计算逻辑搬到了对 CSS 文本的静态转换上。感谢官方开源。

## 作用范围

深色转换**只作用于编辑器预览**：

- 编辑器预览、主题管理里的实时预览，在深色界面下会显示转换后的效果。
- 「复制到公众号」和「导出」（复制 HTML、导出长图）输出的始终是**浅色**样式表，不包含深色转换结果。
- 读者在微信里开启深色模式时，颜色由微信客户端自己转换。

所以这套算法的用途是让你在写作时提前看到深色模式下可能出现的问题（比如文字看不清、背景太亮），而不是改变发出去的文章。

## 怎么触发

点击顶栏右侧的月亮图标，把编辑器切到深色界面，预览会同步显示微信深色效果；再点一次（此时是太阳图标）切回浅色。

转换是同步计算的，结果按 CSS 内容的哈希缓存，同一套主题第二次切换时直接命中缓存，没有网络请求和异步等待。

## 与官方 mp-darkmode 的区别

WeMD 的颜色计算参考了官方算法，但实现方式不同：

| 特性 | 官方 [mp-darkmode](https://github.com/wechatjs/mp-darkmode) | WeMD 内置算法 |
| :--- | :--- | :--- |
| 实现方式 | DOM 驱动，运行时读取元素的实际样式 | 对 CSS 文本做静态转换 |
| 运行要求 | 需要真实的浏览器 DOM 环境 | 纯 TypeScript，无运行时依赖，浏览器、Node.js、Electron 均可运行 |
| 使用场景 | 微信读者端 | WeMD 编辑器预览 |

**官方算法在哪方面更强？**

- **层级上下文**：如果一个元素的背景色来自好几层外的父元素，官方运行时算法能拿到最终计算值；WeMD 只看单条 CSS 规则内声明的背景色，深层嵌套的情况可能和实机不一致。
- **动态内容**：页面内容由 JS 动态生成时，官方库可以实时监听，WeMD 不处理这类情况。

## 核心原理

### HSL 色彩空间与感知亮度

算法在 HSL（色相、饱和度、亮度）色彩空间里调整颜色，并用「感知亮度」衡量颜色看起来有多亮：

```typescript
function rgbToHsl(r, g, b): [h, s, l]
function hslToRgb(h, s, l): [r, g, b]

// 感知亮度，范围 0–255
function getColorPerceivedBrightness(rgb) {
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
}
```

下文提到的「感知亮度」都指这个值，「HSL 亮度」指 HSL 里的 L（0–100）。

### 元素类型识别

类型识别分两层。

**第一层：选择器定基础类型。** `getElementType()` 按顺序匹配，返回 7 种基础类型之一：

```typescript
function getElementType(selector: string): ElementType {
  const s = selector.toLowerCase();
  if (s.includes("ue-table-interlace-color-single")) return "table";
  if (s.includes("ue-table-interlace-color-double")) return "table";
  if (s.includes("js_darkmode__")) return "other";

  if (/blockquote|callout|multiquote/.test(s)) return "blockquote";
  if (/\b(pre|code|hljs|language-)/.test(s)) return "code";
  if (/table|tr|th|td/.test(s)) return "table";
  if (/h[1-6]/.test(s)) return "heading";
  if (/::selection/.test(s)) return "selection";
  if (s.includes("body")) return "body";
  return "other";
}
```

**第二层：属性名与颜色特征细分。** `transformDeclarations()` 再根据每条声明的属性名决定最终类型：

| 属性 | 判定方式 | 最终类型 |
| :--- | :--- | :--- |
| 属性名含 `background` / `bgcolor` | 按基础类型 | `table` / `blockquote` / `selection` / `code`，其余为 `background` |
| 属性名含 `shadow`、`border`、`outline`、`column-rule` | 看颜色：感知亮度 < 20 | `decorative-dark` |
| 同上 | 看颜色：HSL 饱和度 > 15 | `vibrant-protected` |
| 同上 | 其余 | 按文字处理（见下一行） |
| 属性名含 `color`、`-webkit-text-stroke`、`-webkit-text-fill-color` 等 | 按基础类型 | `table-text` / `blockquote-text` / `selection-text` / `code-text`，其余保持基础类型 |

### 背景色亮度调整

`background`、`table`、`blockquote`、`selection`、`vibrant-protected` 五类共用 `adjustBackgroundBrightness()`，按以下分支处理：

| 条件 | 处理 |
| :--- | :--- |
| 近白：饱和度 < 10 且 HSL 亮度 > 40，或感知亮度 > 235 | HSL 亮度改为 `min(100, 100 + 10 - 原亮度)`；饱和度 > 10 时截到最多 30，否则归零 |
| 感知亮度 > 190 | 按比例压到感知亮度 190 |
| HSL 亮度 < 22 | HSL 亮度抬到 22 |
| 其余 | 原样保留 |

例如纯白 `#ffffff`（HSL 亮度 100）会变成 HSL 亮度 10，即 `#1a1a1a`。注意「近白」分支对浅灰同样生效：HSL 亮度 50 的中灰会被转成亮度 60，反而变亮。

代码块背景（`code`）走 `adjustCodeBackgroundBrightness()`：近白分支与上面相同；其余颜色感知亮度超过 40 时压到 40。

深色装饰（`decorative-dark`）走 `adjustDecorativeDarkBrightness()`：饱和度减半，HSL 亮度夹在 10–15 之间。

### 文字对比度保全

文字颜色（包括 `heading`、`body`、`other`、`table-text`、`blockquote-text`、`selection-text`）走 `adjustTextBrightness()`，用文字与背景的**感知亮度差**判断。背景默认取深色底 `rgb(25, 25, 25)`；如果同一条规则里声明了背景色，则取该背景转换后的颜色。

1. 文字感知亮度 ≥ 250（接近白色）：原样保留。
2. 亮度差 > 138 且背景感知亮度 ≤ 27：把文字压到感知亮度 `138 + 背景感知亮度`，避免过亮刺眼。
3. 亮度差 ≥ 65：对比度足够，原样保留。
4. 亮度差不足 65，且背景感知亮度 ≥ 100（浅色背景）：文字 HSL 亮度 > 50 时改为 `90 - 原亮度` 后重新判断；否则压到感知亮度 `min(138, 背景 - 65)`。
5. 亮度差不足 65，且背景偏深：文字 HSL 亮度 ≤ 40 时改为 `90 - 原亮度` 后重新判断；否则调到感知亮度 `min(138, 背景 + 65)`。

按这些规则，默认背景下纯黑正文 `#000000` 最终会变成 `#a3a3a3`。

代码块文字（`code-text`）单独走 `adjustCodeTextBrightness()`：HSL 亮度 > 75 时保留；否则饱和度变为 `min(100, 原饱和度 × 1.1 + 5)`，亮度至少 78。

### 背景图补色层

同一条规则里如果声明了可转换的背景色，且 `background-image` 或 `background` 的值里有 `url(...)` 图片，算法会在图片下方追加一层转换后的纯色渐变，并同步给 `background-size`、`background-position` 追加对应的值：

```css
/* 输入 */
.card {
    background-image: url(logo.png);
    background-color: #fff;
    background-size: cover;
    background-position: center;
}

/* 输出 */
.card {
    background-color: #1a1a1a;
    background-image: url(logo.png), linear-gradient(#1a1a1a, #1a1a1a);
    background-size: cover, 100%;
    background-position: center, top left;
}
```

前提条件：

- 背景色必须写在同一条规则的 `background-color` 或 `background` 里，且为 HEX 或 `rgb()` / `rgba()` 格式。
- 背景色的值不含渐变；图片值转换后已经含 `linear-gradient` 的也不再追加。
- 原值带 `!important` 时会保留，并放到追加后的值末尾。

这样在图片加载前或图片有透明区域时，底下也有一层深色背景。

### 属性排序

转换后，同一条规则内的声明按以下三条规则排序，其余属性保持原来的相对顺序：

- 以 `-webkit-text` 开头的属性排在最前。
- `color` 排在最后。
- 属性名含 `image` 的排在属性名含 `color` 的之后。

## 处理流程

```
CSS 输入
    ↓
convertCssToWeChatDarkMode()：已转换过直接返回；命中缓存直接返回
    ↓
parseCssBlocks()：拆分规则与 @ 规则
    ↓
transformDeclarations()：逐条规则处理
    ├── getElementType()：选择器 → 基础类型
    ├── 预扫描本规则的背景色，算出转换后的背景
    ├── 属性名 + 颜色特征 → 最终类型
    ├── convertColorValue()：提取 HEX / rgb() / hsl() 颜色
    │       ↓
    │   processColorRgb()
    │       ├── code → adjustCodeBackgroundBrightness()
    │       ├── 其它背景类与 vibrant-protected → adjustBackgroundBrightness()
    │       ├── decorative-dark → adjustDecorativeDarkBrightness()
    │       ├── code-text → adjustCodeTextBrightness()
    │       └── 其余文字类 → adjustTextBrightness()
    ├── 背景图补色层
    └── 属性排序
    ↓
CSS 输出
```

## 内置阈值（当前不可配置）

算法的阈值都写死在源码里，`convertCssToWeChatDarkMode(css)` 只接受 CSS 字符串一个参数：

| 常量 | 值 | 用途 |
| :--- | :--- | :--- |
| `WHITE_LIKE_COLOR_BRIGHTNESS` | 250 | 感知亮度达到此值视为白色 |
| 近白阈值（`NEAR_WHITE_PERCEIVED`） | 235 | 背景感知亮度超过此值走近白分支 |
| `MAX_LIMIT_BGCOLOR_BRIGHTNESS` | 190 | 背景感知亮度上限 |
| `MAX_LIMIT_OFFSET` | 138 | 文字与背景的最大感知亮度差 |
| `HIGH_BGCOLOR_BRIGHTNESS` | 100 | 背景感知亮度达到此值视为浅色背景 |
| `MIN_LIMIT_OFFSET_BRIGHTNESS` | 65 | 文字与背景的最小感知亮度差 |
| `HIGH_BLACKWHITE_HSL_BRIGHTNESS` | 40 | HSL 亮度判断阈值 |
| `CODE_MAX_BG_PERCEIVED` | 40 | 代码块背景感知亮度上限 |
| `LOW_BLACKWHITE_HSL_BRIGHTNESS` | 22 | 背景 HSL 亮度下限 |
| `DEFAULT_DARK_BG_L_OFFSET` | 10 | 近白背景转换时的亮度偏移 |
| 深色装饰判定 | 感知亮度 < 20 | 边框、阴影类颜色归为 `decorative-dark` |
| 鲜艳色判定 | 饱和度 > 15 | 边框、阴影类颜色归为 `vibrant-protected` |

源码中还有一个 `DarkModeConfig` 接口（含 `vibrantSaturationThreshold`、`vibrantLightnessRange`、`decorativeDarkLuminanceThreshold`），目前没有接入转换流程，是预留接口，修改它不会影响结果。

## 设计建议

### 颜色格式

**推荐**：HEX（`#333`）、`rgb()` / `rgba()`、`hsl()` / `hsla()`。HEX 支持 3、4、6、8 位，带 alpha 的 HEX 和 `rgba()` / `hsla()` 的透明度会原样保留。

**避免**：颜色名称（`black`、`white`）。

### 背景色

**推荐**：`transparent` 或浅灰色。

**避免**：纯白 `#ffffff` 作为容器背景。

### 品牌色

边框、阴影、轮廓线、分栏线的颜色，饱和度 > 15 时按背景色规则处理，色相和饱和度基本保留，但感知亮度超过 190 的仍会被压暗。文字颜色不看饱和度，一律只做对比度调整。

### 阴影

感知亮度 < 20 的深色阴影、边框会保持深色：HSL 亮度夹在 10–15 之间，饱和度减半。

## 局限性

| 场景 | 说明 |
| :--- | :--- |
| CSS 变量 | 含 `var(--xxx)` 的值不会被处理 |
| 颜色名称 | `black`、`white` 等不会被转换 |
| 渐变 | 渐变结构保留，其中的色标会被转换；但渐变背景不会追加补色层 |
| 背景继承 | 只参考同一条规则内声明的背景色，不追溯父元素 |
| 图片 | 图片本身不会被处理 |

## 常见问题

### Q：为什么某个颜色转换后看起来不对？

可能的原因：

1. 使用了颜色名称（如 `black`）
2. 使用了 CSS 变量 `var(--xxx)`
3. 原色恰好处于阈值边界（如饱和度 15、感知亮度 20、235、190）

**解决方法**：把颜色改为 HEX 格式，如 `#000000`。

### Q：预览效果和微信实际效果有差异怎么办？

预览效果接近微信实机，但两者实现方式不同，以下场景更容易出现差异：

- 半透明颜色的叠加效果
- 极端亮度值（接近纯黑或纯白）
- 背景色写在父元素上、子元素文字依赖它的情况

渐变色标会被转换，不会跳过。

如果发现明显差异，欢迎反馈问题，我们会持续优化算法。

### Q：自定义主题需要做什么适配吗？

不需要。只要颜色使用 HEX、`rgb()` 或 `hsl()` 格式，算法会自动处理。参见上方「设计建议」部分。

## 源码位置

核心实现：`packages/core/src/wechatDarkMode.ts`

| 函数 | 作用 | 是否导出 |
| :--- | :--- | :--- |
| `convertCssToWeChatDarkMode()` | 主入口，整段 CSS 转换（带缓存） | 是 |
| `convertToWeChatDarkMode()` | 单个 HEX 颜色按指定类型转换 | 是 |
| `getElementType()` | 选择器 → 基础类型 | 否 |
| `processColorRgb()` | 颜色转换调度 | 否 |
| `adjustBackgroundBrightness()` | 背景色亮度调整 | 否 |
| `adjustCodeBackgroundBrightness()` | 代码块背景亮度调整 | 否 |
| `adjustTextBrightness()` | 文字对比度调整 | 否 |

欢迎查阅源码或提交改进建议。
