# 微信深色模式预览算法

WeMD 内置了一套**色彩语义保全算法**，可在编辑器中预览微信公众号深色模式下的实际效果，还原度约 90%。

这（可能）是目前市面上唯一针对微信公众号深色模式预览的开源解决方案。

---

## TL;DR

**问题**：微信深色模式是黑盒，你无法在发布前知道文章在读者手机上长什么样。

**解决方案**：逆向还原了微信的颜色转换规则，在编辑器里模拟深色模式效果。

**核心思路**：不是简单地反转颜色，而是根据元素类型（标题/正文/代码块/表格等）分别调整亮度，同时保护鲜艳的品牌色不被压暗。


---

## 为什么需要这个算法

微信公众号在手机端支持深色模式，但：

1. **无法提前预览**：创作者只能发布后在手机上查看效果
2. **渲染逻辑不公开**：微信没有公开其深色模式的颜色转换规则
3. **主题适配成本高**：如果想兼容深色模式，通常需要写两套 CSS

通过大量真机对比测试，逆向还原了微信的渲染逻辑。

---

## 核心原理

### 1. HSL 色彩空间转换

算法使用 HSL（色相-饱和度-亮度）色彩空间进行计算：

```typescript
function rgbToHsl(r, g, b): [h, s, l]
function hslToRgb(h, s, l): [r, g, b]
```

**为什么选择 HSL？**
- 色相（H）保持不变：红色还是红色
- 饱和度（S）可独立调整：控制颜色鲜艳程度
- 亮度（L）精确映射：这是深色模式的核心

### 2. 元素类型识别

算法通过 CSS 选择器识别 14 种元素类型：

```typescript
type ElementType = 
  | 'heading'           // 标题
  | 'body'              // 正文
  | 'background'        // 背景
  | 'table'             // 表格背景
  | 'table-text'        // 表格文字
  | 'blockquote'        // 引用块背景
  | 'blockquote-text'   // 引用块文字
  | 'code'              // 代码块背景
  | 'code-text'         // 代码块文字
  | 'selection'         // 选中区域背景
  | 'selection-text'    // 选中区域文字
  | 'decorative-dark'   // 深色装饰（阴影/边框）
  | 'vibrant-protected' // 鲜艳色保护
  | 'other'             // 其他
```

识别规则基于选择器关键词匹配：

```typescript
function getElementType(selector: string): ElementType {
    if (/blockquote|callout|multiquote/.test(selector)) return 'blockquote';
    if (/pre|code|hljs|language-/.test(selector)) return 'code';
    if (/table|tr|th|td/.test(selector)) return 'table';
    if (/h[1-6]/.test(selector)) return 'heading';
    // ...
}
```

### 3. 亮度区间映射

不同元素类型映射到不同的深色亮度区间：

| 元素类型 | 亮度区间 (L%) | 饱和度系数 |
|---------|-------------|-----------|
| body | 10% | 0 |
| background | 12% - 18% | 0.5 |
| table | 10% - 24% | 0.6 |
| blockquote | 14% - 22% | 0.7 |
| code | 10% - 20% | 0.5 |
| selection | 45% - 65% | 0.6 |
| decorative-dark | 10% - 15% | 0 |
| vibrant-protected | 35% - 55% | 1.0 |

映射公式（背景色）：
```typescript
newL = maxL - (originalL / 100) * (maxL - minL)
```

### 4. 对比度保全

文字颜色需要与背景保持足够对比度：

```typescript
function adjustTextBrightness(textRgb, textHsl, bgRgb) {
    const bgL = calculateLuminance(bgRgb);
    const minL = bgL + 65;   // 最小亮度差
    const maxL = bgL + 180;  // 最大亮度差
    // 将文字亮度调整到 [minL, maxL] 区间
}
```

### 5. 特征驱动路由

对于阴影和边框，算法通过颜色特征而非选择器来决定处理方式：

```typescript
// 在 convertCssInternal 中
if (isShadow || isBorder) {
    const lum = calculateLuminance(rgb);
    const [, s] = rgbToHsl(rgb);
    
    if (lum < 20) 
        type = 'decorative-dark';     // 深色锚定：黑色阴影保持深色
    else if (s > 15) 
        type = 'vibrant-protected';   // 鲜艳保护：霓虹色保持鲜艳
}
```

---

## 处理流程

```
CSS 输入
    ↓
解析选择器 → 识别元素类型 (getElementType)
    ↓
解析属性值 → 提取颜色值 (HEX/RGB/HSL)
    ↓
属性类型判断 → 背景色/文字色/阴影边框
    ↓
颜色转换 → processColorRgb()
    ├── 背景类 → adjustBackgroundBrightness()
    ├── 文字类 → adjustTextBrightness() / adjustCodeTextBrightness()
    ├── 深色装饰 → adjustDecorativeDarkBrightness()
    └── 鲜艳保护 → adjustBackgroundBrightness() (保持高亮度)
    ↓
CSS 输出
```

---

## 配置参数

算法提供可配置的阈值参数：

```typescript
interface DarkModeConfig {
    vibrantSaturationThreshold: number;  // 鲜艳色保护阈值，默认 15
    vibrantLightnessRange: [number, number];  // 鲜艳色亮度区间，默认 [35, 55]
    decorativeDarkLuminanceThreshold: number;  // 深色锚定阈值，默认 20
}
```

---

## 设计建议

### 颜色格式

✅ **推荐**：HEX (`#333`) 或 RGB (`rgb(51,51,51)`)

❌ **避免**：颜色名称 (`black`, `white`)

### 背景色

✅ **推荐**：`transparent` 或浅灰色

❌ **避免**：纯白 `#ffffff` 作为容器背景

### 品牌色

✅ **放心使用**：饱和度 > 15% 的色彩会被自动保护

### 阴影

✅ **放心使用**：亮度 < 20 的深色阴影会保持深色

---

## 局限性

| 场景 | 说明 |
|------|------|
| CSS 变量 | `var(--xxx)` 不会被处理 |
| 颜色名称 | `black`、`white` 不会被转换 |
| 渐变 | `linear-gradient` 等渐变不会被处理（微信不支持） |
| 图片 | 图片本身不会被处理（与微信一致） |

---

## 常见问题

### Q: 为什么某个颜色转换后看起来不对？

可能的原因：
1. 使用了颜色名称（如 `black`）而非 HEX 格式
2. 使用了 CSS 变量 `var(--xxx)`
3. 原色的饱和度/亮度恰好处于阈值边界

**解决方法**：将颜色改为 HEX 格式，如 `#000000`。

### Q: 预览效果和微信实际效果有差异怎么办？

算法还原度约 90%，以下场景可能有差异：
- 半透明颜色的叠加效果
- 极端亮度值（接近纯黑或纯白）

> [!NOTE]
> 渐变（`gradient`）会被直接跳过不做转换，因为微信公众号不支持 CSS 渐变。

如果发现明显差异，欢迎提交 Issue，我会持续优化算法。

### Q: 自定义主题需要做什么适配吗？

不需要。只要颜色使用 HEX/RGB 格式，算法会自动处理。参见上方"设计建议"部分。

---

## 源码位置

核心实现：`packages/core/src/wechatDarkMode.ts`

| 函数 | 作用 |
|------|------|
| `convertCssToWeChatDarkMode()` | 主入口，CSS 整体转换 |
| `getElementType()` | 选择器 → 元素类型 |
| `processColorRgb()` | 颜色转换调度器 |
| `adjustBackgroundBrightness()` | 背景色亮度调整 |
| `adjustTextBrightness()` | 文字对比度调整 |

欢迎查阅源码或提交改进建议。
