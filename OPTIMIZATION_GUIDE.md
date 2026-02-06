# 飞书文档转公众号助手 - 优化说明

## 🎉 已完成的深度优化

### 第一部分：飞书文档解析器优化 ([src/lib/parser.ts](src/lib/parser.ts))

#### 1. 非标准标签识别 ✅
**优化前**：只能识别标准的 `<h1>`~`<h4>` 标签

**优化后**：完整支持飞书 DOM 结构
```typescript
// 新增规则：识别 data-node-type 属性
turndownService.addRule("feishu-data-heading", {
  filter: (node) => {
    const nodeType = node.getAttribute("data-node-type")
    return nodeType?.startsWith("heading-") === true
  },
  replacement: (_content, node) => {
    const level = nodeType.replace("heading-", "") || "1"
    const text = elem.textContent?.trim() || ""
    return `\n${"#".repeat(parseInt(level))} ${text}\n\n`
  },
})
```

支持的飞书特殊节点类型：
- `data-node-type="heading-1"` ~ `data-node-type="heading-6"` → Markdown 标题
- `data-node-type="bullet"` → 无序列表
- `data-node-type="ordered"` → 有序列表
- `data-node-type="code"` → 代码块
- `data-node-type="quote"` → 引用块
- `data-node-type="callout"` → 提示框
- `data-node-type="image"` → 图片
- `data-node-type="table"` → 表格
- `data-node-type="divider"` → 分割线

#### 2. 冗余节点清洗 ✅
**新增 `shouldRemoveNode()` 函数**，自动过滤：
```typescript
// 移除的元素类型：
- anchor-icon (锚点图标)
- bookmark-icon (书签按钮)
- hidden elements (display: none / visibility: hidden)
- empty divs/spans (空容器)
- feishu-status-bar (状态栏)
- feishu-comment-trigger (评论触发器)
- toolbar/sidebar (工具栏和侧边栏)
```

**实现方式**：
```typescript
function shouldRemoveNode(node: Node): boolean {
  // 1. 检查 classList
  if (elem.classList.contains("anchor-icon")) return true

  // 2. 检查 style 属性
  if (elem.style?.display === "none") return true

  // 3. 检查 data-testid
  if (elem.getAttribute("data-testid")?.includes("toolbar")) return true

  return false
}
```

#### 3. 高清图片抓取 ✅
**新增 `extractImageUrl()` 函数**，智能提取原图地址：

```typescript
// 优先级顺序：
1. data-src (原始高清图)
2. data-original-src (备用原图)
3. srcset (取最高分辨率)
4. src (降级方案，自动替换 thumbnail 参数)

function extractImageUrl(img: HTMLImageElement): string {
  // 自动转换缩略图 URL → 原图 URL
  return img.src.replace(/thumbnail\/\d+/, "original")
}
```

#### 4. 结构保持 ✅
**确保嵌套关系正确**：
- 有序列表的层级结构
- 代码块的语言标识 (`data-language`)
- 表格的完整格式
- 引用块的嵌套

---

### 第二部分：微信 Inline CSS 转换 ([src/lib/inline-css.ts](src/lib/inline-css.ts))

#### 核心功能
使用 **Juice** 库 + 自定义 Tailwind 转换规则，将 HTML 转换为微信公众号可用的内联样式格式。

#### 1. Tailwind to Inline CSS 映射 ✅
**完整的转换表**（[inline-css.ts:18-185](src/lib/inline-css.ts#L18-L185)）：

```typescript
const tailwindToInlineCSS: Record<string, string> = {
  // 文本颜色
  "text-blue-600": "color: #2563eb",
  "text-gray-900": "color: #111827",

  // 背景颜色
  "bg-blue-100": "background-color: #dbeafe",
  "bg-white": "background-color: #ffffff",

  // 布局
  "flex": "display: flex",
  "items-center": "align-items: center",

  // 边框
  "rounded-lg": "border-radius: 0.5rem",
  "shadow-xl": "box-shadow: ...",

  // ... 共 100+ 条转换规则
}
```

#### 2. 递归样式应用 ✅
```typescript
function applyInlineStyles(element: HTMLElement): void {
  // 1. 提取所有 Tailwind 类名
  const classes = element.className.split(" ")

  // 2. 转换为内联样式
  for (const cls of classes) {
    const css = tailwindToInlineCSS[cls]
    styleString += `${css};`
  }

  // 3. 递归处理子元素
  Array.from(element.children).forEach((child) => {
    applyInlineStyles(child as HTMLElement)
  })
}
```

#### 3. 主题系统集成 ✅
**`generateWeChatHTML()` 函数**：
- 接收：原始 HTML + 主题 CSS 变量
- 输出：完整的微信公众号 HTML（含内联样式）

```typescript
export function generateWeChatHTML(
  html: string,
  themeStyles: Record<string, string>
): string {
  // 1. 将 CSS 变量转换为实际值
  // 2. 生成微信专用样式
  // 3. 应用内联样式
  return convertToInlineCSS(wrappedHTML, themeCSS)
}
```

#### 4. Sidepanel 集成 ✅
**更新的复制逻辑** ([sidepanel.ts:78-115](src/sidepanel.tsx#L78-L115))：

```typescript
const handleCopyToClipboard = async () => {
  // 1. 获取预览区 HTML
  const htmlContent = docData.html || docData.markdown

  // 2. 转换为微信格式（关键步骤！）
  const wechatHTML = generateWeChatHTML(
    htmlContent,
    activeTheme.styles as Record<string, string>
  )

  // 3. 复制到剪贴板（支持 HTML + 纯文本双格式）
  const clipboardItem = new ClipboardItem({
    "text/html": new Blob([wechatHTML], { type: "text/html" }),
    "text/plain": new Blob([docData.markdown], { type: "text/plain" }),
  })

  await navigator.clipboard.write([clipboardItem])

  // 4. 显示成功反馈
  setCopySuccess(true)
}
```

**UI 反馈**：
- 复制成功后，按钮变绿并显示 "✓ 已复制"
- 2 秒后自动恢复原状

---

## 📦 新增依赖

### [package.json](package.json) 更新

```json
{
  "dependencies": {
    "juice": "^10.0.0"  // Inline CSS 转换核心库
  },
  "devDependencies": {
    "@types/juice": "^10.0.1"  // TypeScript 类型定义
  }
}
```

### 安装命令

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install

# 或使用 yarn
yarn install
```

---

## 🚀 使用流程

### 1. 开发模式启动

```bash
pnpm dev
```

这会：
1. 启动 Plasmo 开发服务器
2. 自动加载扩展到 Chrome
3. 开启热重载（HMR）

### 2. 打开飞书文档

访问任何飞书文档（`*.feishu.cn` 或 `*.larksuite.com`）

### 3. 打开侧边栏

点击 Chrome 工具栏中的扩展图标，侧边栏会自动弹出

### 4. 抓取内容

点击 **"刷新"** 按钮，插件会：
1. 注入脚本到飞书页面
2. 使用 `parseFeishuDocument()` 解析内容
3. 提取高清图片
4. 过滤冗余节点
5. 显示在预览区

### 5. 选择主题

从主题下拉菜单选择：
- **科技蓝**：适合技术类文章
- **简约白**：适合通用内容
- **商务黑**：适合正式文档

### 6. 一键复制到公众号

点击 **"复制"** 按钮：
1. 自动应用当前主题的内联样式
2. 将 HTML 复制到剪贴板
3. 按钮变绿显示 "✓ 已复制"

### 7. 粘贴到公众号编辑器

在微信公众号后台编辑器中直接粘贴（`Ctrl+V`）：
- **如果编辑器支持 HTML**：自动保留完整格式
- **如果不支持**：粘贴 Markdown 格式

---

## 🎨 主题系统

### CSS 变量定义

每个主题包含以下变量：

```typescript
{
  "--primary-color": "#3b82f6",      // 主色调
  "--text-color": "#1e293b",          // 正文颜色
  "--heading-color": "#0f172a",       // 标题颜色
  "--background-color": "#ffffff",    // 背景色
  "--border-color": "#e2e8f0",        // 边框颜色
  "--link-color": "#2563eb",          // 链接颜色
  "--quote-bg": "#eff6ff",            // 引用块背景
  "--quote-border": "#3b82f6",        // 引用块边框
  "--code-bg": "#f1f5f9"              // 代码块背景
}
```

### 自定义主题

在 [src/components/Sidebar.tsx](src/components/Sidebar.tsx) 中添加：

```typescript
export const themeStyles: Record<string, ThemeStyle> = {
  myCustomTheme: {
    name: "myCustomTheme",
    displayName: "我的主题",
    styles: {
      "--primary-color": "#your-color",
      // ... 其他变量
    } as CSSProperties,
  },
}
```

---

## 🔍 调试技巧

### 1. 查看解析结果

打开 Chrome DevTools Console，在侧边栏中查看：

```javascript
console.log(docData)
```

### 2. 测试 Inline CSS 转换

在 Console 中运行：

```javascript
import { generateWeChatHTML } from "~lib/inline-css"

const html = "<h1 class='text-blue-600'>标题</h1>"
const result = generateWeChatHTML(html, themeStyles.tech.styles)
console.log(result)
```

### 3. 验证图片 URL

检查 `extractImageUrl()` 的输出：

```javascript
import { extractImageUrl } from "~lib/parser"

const img = document.querySelector("img")
console.log(extractImageUrl(img))
```

---

## ⚠️ 注意事项

### TypeScript 类型错误

IDE 中显示的类型错误（如 "找不到模块 'plasmo'"）是正常的，因为：
1. 依赖尚未安装（运行 `pnpm install` 后会消失）
2. Plasmo 使用特殊的路径别名（`~` 符号）
3. Chrome API 类型在运行时才可用

### 微信公众号兼容性

1. **支持的样式**：
   - ✅ 内联 `style` 属性
   - ✅ 基础排版（h1-h6, p, ul, ol, blockquote）
   - ✅ 图片和链接
   - ✅ 表格

2. **不支持的样式**：
   - ❌ 外部 CSS 文件
   - ❌ `<style>` 标签（会被编辑器过滤）
   - ❌ 高级 CSS（flexbox, grid）
   - ❌ 伪类（:hover, :focus）

### 飞书文档结构变化

如果飞书更新 DOM 结构导致解析失败，请：
1. 在浏览器 DevTools 中检查新的结构
2. 更新 `parser.ts` 中的 `selectors` 数组
3. 添加新的 `data-node-type` 规则

---

## 📚 API 文档

### `parseFeishuDocument(html: string)`

解析飞书文档 HTML，返回结构化数据。

**返回值**：
```typescript
{
  title: string      // 文档标题
  markdown: string   // Markdown 格式
  html: string       // 清理后的 HTML
}
```

### `generateWeChatHTML(html: string, themeStyles: Record<string, string>)`

将 HTML 转换为微信公众号兼容格式。

**参数**：
- `html`: 原始 HTML 内容
- `themeStyles`: 主题 CSS 变量对象

**返回值**：包含内联样式的 HTML 字符串

### `extractImageUrl(img: HTMLImageElement)`

提取飞书图片的高清原图地址。

**优先级**：
1. `data-src` 属性
2. `data-original-src` 属性
3. `srcset` 中的最高分辨率
4. `src` 属性（自动转换缩略图 URL）

---

## 🛠️ 故障排查

### 问题：复制后样式丢失

**解决方案**：
1. 确认已运行 `pnpm install` 安装 juice
2. 检查浏览器控制台是否有错误
3. 尝试使用纯文本格式（Markdown）

### 问题：图片无法显示

**解决方案**：
1. 检查图片 URL 是否为 `https://` 开头
2. 飞书图片可能需要登录权限，建议手动下载后重新上传
3. 使用图片地址中的原图参数

### 问题：标题层级错误

**解决方案**：
1. 在飞书文档中检查标题是否正确应用
2. 查看 `data-node-type` 属性值
3. 在 `parser.ts` 中添加自定义规则

---

## 📄 许可证

MIT License

---

**优化完成日期**：2026-02-06

**技术栈**：Plasmo + React + TypeScript + Tailwind CSS + Turndown + Juice
