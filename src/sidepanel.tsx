
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import MarkdownIt from "markdown-it"
import {
  AlertTriangle,
  Bold,
  Check,
  Code2,
  Copy,
  FileText,
  Github,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Mail,
  MessageCircle,
  Monitor,
  Minus,
  Quote,
  ShieldCheck,
  Sparkles,
  Strikethrough,
  Table2,
  Wand2,
  X,
} from "lucide-react"
import { APP_CONFIG } from "./config/app-config"
import { copyArticleToClipboard } from "./lib/clipboard"
import { htmlToMarkdown } from "./lib/parser"
import { loadFromStorage, saveToStorage } from "./lib/storage"
import "./style.css"

interface ThemeConfig {
  name: string
  primary: string
  text: string
  background: string
  quoteBackground: string
  codeBackground: string
  tableHeaderBackground: string
  tableBorder: string
  accentBackground: string
}

interface CheckIssue {
  id: string
  level: "error" | "warning"
  title: string
  detail: string
  locateText?: string
}

interface ImageProbeResult {
  url: string
  width: number
  height: number
}

interface RenderOptions {
  theme: ThemeConfig
  intensityKey: IntensityKey
  emphasisMode: EmphasisMode
  topModuleKey: TopModuleKey
  bottomModuleKey: BottomModuleKey
  brandName: string
  brandSlogan: string
  qrImageUrl: string
}

const themes = {
  businessBlue: {
    name: "城际蓝",
    primary: "#1663ff",
    text: "#1f2937",
    background: "#ffffff",
    quoteBackground: "#f0f5ff",
    codeBackground: "#f4f7ff",
    tableHeaderBackground: "#eef4ff",
    tableBorder: "#d4e2ff",
    accentBackground: "#eaf1ff",
  },
  creamyNotebook: {
    name: "奶油手账",
    primary: "#e37155",
    text: "#3c2a25",
    background: "#fffefa",
    quoteBackground: "#fff2ea",
    codeBackground: "#fff7f1",
    tableHeaderBackground: "#fff0e6",
    tableBorder: "#ffd7c8",
    accentBackground: "#ffefe5",
  },
  neonFuture: {
    name: "星图霓虹",
    primary: "#0ea5a4",
    text: "#16202a",
    background: "#ffffff",
    quoteBackground: "#eafcfc",
    codeBackground: "#effafa",
    tableHeaderBackground: "#e5f7f7",
    tableBorder: "#bce9e8",
    accentBackground: "#dff6f6",
  },
} as const satisfies Record<string, ThemeConfig>

const intensityProfiles = {
  restrained: {
    label: "克制",
    titleScale: 0.92,
    subtitleScale: 0.92,
    bodySize: 15,
    lineHeight: 1.82,
    spacingScale: 0.88,
    imageRadius: 6,
    imageShadow: "0 3px 12px rgba(15, 23, 42, 0.06)",
  },
  standard: {
    label: "标准",
    titleScale: 1,
    subtitleScale: 1,
    bodySize: 16,
    lineHeight: 1.9,
    spacingScale: 1,
    imageRadius: 8,
    imageShadow: "0 4px 18px rgba(15, 23, 42, 0.08)",
  },
  eyeCatch: {
    label: "吸睛",
    titleScale: 1.08,
    subtitleScale: 1.05,
    bodySize: 17,
    lineHeight: 1.95,
    spacingScale: 1.1,
    imageRadius: 12,
    imageShadow: "0 8px 24px rgba(15, 23, 42, 0.16)",
  },
} as const

const emphasisModes = {
  classic: { label: "主题加粗", hint: "保留传统加粗样式" },
  marker: { label: "荧光高亮", hint: "重点内容带荧光底色" },
  quoteCard: { label: "引用卡片", hint: "重点内容自动卡片化" },
} as const

const topModules = {
  none: { label: "不插入" },
  businessRibbon: { label: "商务关注条" },
  diaryRibbon: { label: "手账关注条" },
  geekRibbon: { label: "科技关注条" },
} as const

const bottomModules = {
  none: { label: "不插入" },
  simpleCard: { label: "简约二维码卡片" },
  growthCard: { label: "增长行动卡片" },
  campaignCard: { label: "活动收尾卡片" },
} as const

const sensitiveWords = [
  "稳赚",
  "保本",
  "内幕",
  "点击链接领取",
  "绝对有效",
  "加微信返现",
  "最赚钱",
  "私下转账",
]

const IMAGE_RESOLUTION_LIMIT = 1800
const LARGE_DATA_IMAGE_LENGTH = 180000

type ThemeKey = keyof typeof themes
type IntensityKey = keyof typeof intensityProfiles
type EmphasisMode = keyof typeof emphasisModes
type TopModuleKey = keyof typeof topModules
type BottomModuleKey = keyof typeof bottomModules
type PreviewDevice = "mobile" | "desktop"

function isThemeKey(value: string): value is ThemeKey {
  return value in themes
}

function isPreviewDevice(value: string): value is PreviewDevice {
  return value === "mobile" || value === "desktop"
}

function isIntensityKey(value: string): value is IntensityKey {
  return value in intensityProfiles
}

function isEmphasisMode(value: string): value is EmphasisMode {
  return value in emphasisModes
}

function isTopModuleKey(value: string): value is TopModuleKey {
  return value in topModules
}

function isBottomModuleKey(value: string): value is BottomModuleKey {
  return value in bottomModules
}
function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function hexToRgba(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "")
  if (hex.length !== 6) {
    return `rgba(22, 119, 255, ${alpha})`
  }

  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function sanitizeHttpUrl(value: string): string {
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : ""
}

function normalizeExtractedUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/^</, "").replace(/>$/, "")
}

function isInternalDriveImageUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.hostname.toLowerCase().startsWith("internal-api-drive-stream.")
  } catch {
    return false
  }
}

function extractMarkdownImageUrls(markdown: string): string[] {
  const urls = new Set<string>()

  const markdownImagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  let markdownMatch: RegExpExecArray | null
  while ((markdownMatch = markdownImagePattern.exec(markdown)) !== null) {
    const url = normalizeExtractedUrl(markdownMatch[1] ?? "")
    if (url) {
      urls.add(url)
    }
  }

  const htmlImagePattern = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi
  let htmlMatch: RegExpExecArray | null
  while ((htmlMatch = htmlImagePattern.exec(markdown)) !== null) {
    const url = normalizeExtractedUrl(htmlMatch[1] ?? "")
    if (url) {
      urls.add(url)
    }
  }

  return [...urls]
}

function findSensitiveMatches(content: string): string[] {
  const lowered = content.toLowerCase()
  const found = new Set<string>()

  for (const keyword of sensitiveWords) {
    if (lowered.includes(keyword.toLowerCase())) {
      found.add(keyword)
    }
  }

  return [...found]
}

function measureImage(url: string): Promise<ImageProbeResult | null> {
  return new Promise((resolve) => {
    const image = new Image()
    const timeout = window.setTimeout(() => {
      cleanup()
      resolve(null)
    }, 5000)

    const cleanup = () => {
      window.clearTimeout(timeout)
      image.onload = null
      image.onerror = null
    }

    image.onload = () => {
      const result: ImageProbeResult = {
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
      }
      cleanup()
      resolve(result)
    }

    image.onerror = () => {
      cleanup()
      resolve(null)
    }

    image.src = url
  })
}

const markdownParser = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
})

const defaultMarkdown = `# 飞书文档转公众号排版工具 2.0

这是一个支持**主题皮肤化**与**发布体检**的发文工作台。

## 🚀 本次升级亮点

- 支持三套预设主题：城际蓝、奶油手账、星图霓虹
- 支持风格强度：克制、标准、吸睛
- 支持重点样式升级：荧光高亮、引用卡片
- 支持顶部关注条与底部二维码卡片自动注入
- 支持发布前风险体检（敏感词 + 图片尺寸）

## ✨ 操作建议

1. 在左侧粘贴飞书内容
2. 在右侧选择主题和组件
3. 点击问题清单快速修正
4. 最后复制到公众号发布

> 小贴士：可先选择“引用卡片”重点样式，再挑一个底部行动卡片，收尾转化会更强。
`

const emptyPreview = `
<div style="text-align:center;padding:60px 20px;color:#8b95a7;">
  <p style="font-size:16px;margin-bottom:10px;">开始编辑你的内容</p>
  <p style="font-size:14px;">在左侧输入 Markdown，右侧会实时预览公众号样式。</p>
</div>
`

/**
 * Render Layer (Frozen):
 * - The HTML generation + inline-style rules are treated as a core rendering asset.
 * - Do not modify visual strings/styles here unless there is a hard rendering defect.
 */
function renderMarkdown(markdown: string, theme: ThemeConfig): string {
  if (!markdown.trim()) {
    return emptyPreview
  }

  const parsed = markdownParser.render(markdown)
  const doc = new DOMParser().parseFromString(`<div id="content">${parsed}</div>`, "text/html")
  const container = doc.querySelector<HTMLElement>("#content")

  if (!container) {
    return emptyPreview
  }

  container.querySelectorAll<HTMLElement>("h1").forEach((element) => {
    element.style.cssText = [
      `color: ${theme.primary}`,
      "font-size: 34px",
      "font-weight: 800",
      "line-height: 1.35",
      "text-align: center",
      "margin: 28px 0 22px",
      "padding-bottom: 14px",
      `border-bottom: 2px solid ${theme.primary}`,
      "letter-spacing: 0.2px",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("h2").forEach((element) => {
    element.style.cssText = [
      `color: ${theme.primary}`,
      "font-size: 28px",
      "font-weight: 750",
      "line-height: 1.4",
      "margin: 30px 0 16px",
      "padding-left: 12px",
      `border-left: 4px solid ${theme.primary}`,
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("h3").forEach((element) => {
    element.style.cssText = [
      `color: ${theme.primary}`,
      "font-size: 22px",
      "font-weight: 700",
      "line-height: 1.45",
      "margin: 22px 0 12px",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("p").forEach((element) => {
    element.style.cssText = [
      "margin: 0 0 14px",
      `color: ${theme.text}`,
      "font-size: 16px",
      "line-height: 1.9",
      "text-align: justify",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("strong").forEach((element) => {
    element.style.cssText = `color: ${theme.primary}; font-weight: 700;`
  })

  container.querySelectorAll<HTMLElement>("a").forEach((element) => {
    element.style.cssText = [
      `color: ${theme.primary}`,
      "text-decoration: none",
      `border-bottom: 1px dashed ${theme.primary}`,
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("img").forEach((element) => {
    element.style.cssText = [
      "display: block",
      "max-width: 100%",
      "height: auto",
      "margin: 16px auto",
      "border-radius: 8px",
      "box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08)",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("ul, ol").forEach((element) => {
    element.style.cssText = [
      `color: ${theme.text}`,
      "margin: 0 0 16px",
      "padding-left: 24px",
      "line-height: 1.9",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("li").forEach((element) => {
    element.style.cssText = "margin: 6px 0;"
  })

  container.querySelectorAll<HTMLElement>("blockquote").forEach((element) => {
    element.style.cssText = [
      `background: ${theme.quoteBackground}`,
      `border-left: 4px solid ${theme.primary}`,
      "margin: 16px 0",
      "padding: 12px 14px",
      "border-radius: 6px",
      `color: ${theme.text}`,
      "font-style: italic",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("pre").forEach((element) => {
    element.style.cssText = [
      `background: ${theme.codeBackground}`,
      "margin: 16px 0",
      "padding: 14px",
      "border-radius: 8px",
      "overflow-x: auto",
      "line-height: 1.7",
      "font-size: 14px",
      "font-family: Consolas, Monaco, 'Courier New', monospace",
      `border: 1px solid ${theme.tableBorder}`,
      `color: ${theme.text}`,
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("code").forEach((element) => {
    if (element.parentElement?.tagName === "PRE") {
      element.style.cssText = "background: transparent; padding: 0;"
      return
    }

    element.style.cssText = [
      `color: ${theme.primary}`,
      `background: ${theme.accentBackground}`,
      "padding: 2px 6px",
      "border-radius: 4px",
      "font-size: 0.93em",
      "font-family: Consolas, Monaco, 'Courier New', monospace",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("table").forEach((element) => {
    element.style.cssText = [
      "width: 100%",
      "border-collapse: collapse",
      "margin: 16px 0",
      "font-size: 15px",
      `border: 1px solid ${theme.tableBorder}`,
      "overflow: hidden",
      "border-radius: 8px",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("th").forEach((element) => {
    element.style.cssText = [
      `background: ${theme.tableHeaderBackground}`,
      "font-weight: 700",
      "padding: 10px",
      `border: 1px solid ${theme.tableBorder}`,
      `color: ${theme.text}`,
      "text-align: left",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("td").forEach((element) => {
    element.style.cssText = [
      "padding: 10px",
      `border: 1px solid ${theme.tableBorder}`,
      `color: ${theme.text}`,
      "vertical-align: top",
    ].join(";")
  })

  container.querySelectorAll<HTMLElement>("hr").forEach((element) => {
    element.style.cssText = [
      "border: none",
      `border-top: 1px solid ${theme.tableBorder}`,
      "margin: 22px 0",
    ].join(";")
  })

  return `<section style="
    max-width: 677px;
    margin: 0 auto;
    padding: 24px 20px;
    background: ${theme.background};
    color: ${theme.text};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 16px;
    line-height: 1.9;
    word-break: break-word;
    min-height: 100%;
    box-sizing: border-box;
  ">${container.innerHTML}</section>`
}

function applyIntensity(section: HTMLElement, intensityKey: IntensityKey) {
  const profile = intensityProfiles[intensityKey]

  section.querySelectorAll<HTMLElement>("h1").forEach((element) => {
    element.style.fontSize = `${Math.round(34 * profile.titleScale)}px`
    element.style.margin = `${Math.round(28 * profile.spacingScale)}px 0 ${Math.round(22 * profile.spacingScale)}px`
  })

  section.querySelectorAll<HTMLElement>("h2").forEach((element) => {
    element.style.fontSize = `${Math.round(28 * profile.subtitleScale)}px`
    element.style.margin = `${Math.round(30 * profile.spacingScale)}px 0 ${Math.round(16 * profile.spacingScale)}px`
  })

  section.querySelectorAll<HTMLElement>("h3").forEach((element) => {
    element.style.fontSize = `${Math.round(22 * profile.subtitleScale)}px`
    element.style.margin = `${Math.round(22 * profile.spacingScale)}px 0 ${Math.round(12 * profile.spacingScale)}px`
  })

  section.querySelectorAll<HTMLElement>("p").forEach((element) => {
    element.style.fontSize = `${profile.bodySize}px`
    element.style.lineHeight = String(profile.lineHeight)
    element.style.margin = `0 0 ${Math.round(14 * profile.spacingScale)}px`
  })

  section.querySelectorAll<HTMLElement>("ul, ol").forEach((element) => {
    element.style.lineHeight = String(profile.lineHeight)
    element.style.margin = `0 0 ${Math.round(16 * profile.spacingScale)}px`
  })

  section.querySelectorAll<HTMLElement>("img").forEach((element) => {
    element.style.borderRadius = `${profile.imageRadius}px`
    element.style.boxShadow = profile.imageShadow
  })
}

function applyEmphasisMode(section: HTMLElement, theme: ThemeConfig, emphasisMode: EmphasisMode) {
  const strongElements = [...section.querySelectorAll<HTMLElement>("strong")]

  if (emphasisMode === "classic") {
    strongElements.forEach((element) => {
      element.style.color = theme.primary
      element.style.fontWeight = "700"
      element.style.background = "transparent"
      element.style.padding = "0"
      element.style.border = "0"
    })
    return
  }

  if (emphasisMode === "marker") {
    const markerColor = hexToRgba(theme.primary, 0.28)
    strongElements.forEach((element) => {
      element.style.color = theme.text
      element.style.fontWeight = "700"
      element.style.padding = "0 4px"
      element.style.borderRadius = "3px"
      element.style.background = `linear-gradient(transparent 46%, ${markerColor} 46%)`
      element.style.boxDecorationBreak = "clone"
      ;(element.style as CSSStyleDeclaration).webkitBoxDecorationBreak = "clone"
    })
    return
  }

  strongElements.forEach((element) => {
    const paragraph = element.closest("p")
    const ownText = (element.textContent ?? "").trim()
    const paragraphText = (paragraph?.textContent ?? "").trim()

    if (paragraph && ownText && ownText === paragraphText) {
      paragraph.style.background = hexToRgba(theme.primary, 0.1)
      paragraph.style.border = `1px solid ${hexToRgba(theme.primary, 0.24)}`
      paragraph.style.borderLeft = `4px solid ${theme.primary}`
      paragraph.style.borderRadius = "10px"
      paragraph.style.padding = "12px 14px"
      paragraph.style.margin = "16px 0"
      paragraph.style.textAlign = "left"
      element.style.color = theme.primary
      element.style.background = "transparent"
      element.style.padding = "0"
      element.style.border = "0"
      return
    }

    element.style.color = theme.primary
    element.style.fontWeight = "700"
    element.style.background = hexToRgba(theme.primary, 0.12)
    element.style.padding = "1px 6px"
    element.style.border = `1px solid ${hexToRgba(theme.primary, 0.26)}`
    element.style.borderRadius = "6px"
  })
}

function buildTopModule(
  moduleKey: TopModuleKey,
  theme: ThemeConfig,
  brandName: string,
  brandSlogan: string
): string {
  if (moduleKey === "none") {
    return ""
  }

  const safeBrand = escapeHtml(brandName.trim() || "你的公众号")
  const safeSlogan = escapeHtml(brandSlogan.trim() || "每周更新实用内容")

  if (moduleKey === "businessRibbon") {
    return `<div style="margin: 0 0 20px; padding: 12px 14px; border-radius: 10px; border: 1px solid ${hexToRgba(theme.primary, 0.24)}; background: linear-gradient(90deg, ${hexToRgba(theme.primary, 0.13)} 0%, #ffffff 100%); color: ${theme.text};"><p style="margin: 0; font-size: 13px; line-height: 1.6;">🔔 欢迎来到 <span style="color: ${theme.primary}; font-weight: 700;">${safeBrand}</span>，${safeSlogan}</p></div>`
  }

  if (moduleKey === "diaryRibbon") {
    return `<div style="margin: 0 0 20px; padding: 12px 14px; border-radius: 12px; border: 1px dashed ${hexToRgba(theme.primary, 0.34)}; background: ${hexToRgba(theme.primary, 0.1)}; color: ${theme.text};"><p style="margin: 0; font-size: 13px; line-height: 1.6;">📝 订阅 <span style="color: ${theme.primary}; font-weight: 700;">${safeBrand}</span>，和你一起记录成长：${safeSlogan}</p></div>`
  }

  return `<div style="margin: 0 0 20px; padding: 12px 14px; border-radius: 12px; border: 1px solid ${hexToRgba(theme.primary, 0.32)}; background: #0f172a; color: #e2e8f0;"><p style="margin: 0; font-size: 13px; line-height: 1.6;">⚡ 正在阅读 <span style="color: ${theme.primary}; font-weight: 700;">${safeBrand}</span>，${safeSlogan}</p></div>`
}

function buildQrPreview(qrImageUrl: string, theme: ThemeConfig): string {
  const safeUrl = sanitizeHttpUrl(qrImageUrl)
  if (safeUrl) {
    return `<img src="${safeUrl}" alt="二维码" style="width: 86px; height: 86px; border-radius: 10px; object-fit: cover; border: 1px solid ${hexToRgba(theme.primary, 0.28)};" />`
  }

  return `<div style="width: 86px; height: 86px; border-radius: 10px; border: 1px dashed ${hexToRgba(theme.primary, 0.34)}; background: ${hexToRgba(theme.primary, 0.08)}; display: flex; align-items: center; justify-content: center; color: ${theme.primary}; font-size: 12px; font-weight: 700;">二维码位</div>`
}

function buildBottomModule(
  moduleKey: BottomModuleKey,
  theme: ThemeConfig,
  brandName: string,
  brandSlogan: string,
  qrImageUrl: string
): string {
  if (moduleKey === "none") {
    return ""
  }

  const safeBrand = escapeHtml(brandName.trim() || "你的公众号")
  const safeSlogan = escapeHtml(brandSlogan.trim() || "获取更多实用内容")
  const qrBlock = buildQrPreview(qrImageUrl, theme)

  if (moduleKey === "simpleCard") {
    return `<div style="margin-top: 28px; padding: 14px; border-radius: 12px; border: 1px solid ${hexToRgba(theme.primary, 0.26)}; background: ${hexToRgba(theme.primary, 0.06)};"><div style="display: flex; align-items: center; gap: 12px;">${qrBlock}<div><p style="margin: 0 0 6px; font-size: 15px; color: ${theme.text}; font-weight: 700;">关注 ${safeBrand}</p><p style="margin: 0; font-size: 13px; color: ${theme.text}; opacity: 0.88;">${safeSlogan}</p></div></div></div>`
  }

  if (moduleKey === "growthCard") {
    return `<div style="margin-top: 28px; padding: 16px; border-radius: 14px; border: 1px solid ${hexToRgba(theme.primary, 0.3)}; background: linear-gradient(150deg, ${hexToRgba(theme.primary, 0.12)} 0%, #ffffff 100%);"><p style="margin: 0 0 10px; font-size: 16px; color: ${theme.text}; font-weight: 700;">下一步，保持持续成长</p><div style="display: flex; align-items: center; gap: 14px;">${qrBlock}<div><p style="margin: 0 0 6px; font-size: 13px; color: ${theme.text};">1) 扫码关注 <span style="color: ${theme.primary}; font-weight: 700;">${safeBrand}</span></p><p style="margin: 0 0 6px; font-size: 13px; color: ${theme.text};">2) 收藏本文，复用模板</p><p style="margin: 0; font-size: 13px; color: ${theme.text}; opacity: 0.88;">${safeSlogan}</p></div></div></div>`
  }

  return `<div style="margin-top: 28px; padding: 16px; border-radius: 14px; border: 1px solid ${hexToRgba(theme.primary, 0.36)}; background: #0f172a; color: #f8fafc;"><p style="margin: 0 0 10px; font-size: 16px; font-weight: 700;">看完有收获？继续深挖</p><div style="display: flex; align-items: center; gap: 14px;">${qrBlock}<div><p style="margin: 0 0 6px; font-size: 13px; opacity: 0.92;">关注 <span style="color: ${theme.primary}; font-weight: 700;">${safeBrand}</span></p><p style="margin: 0; font-size: 13px; opacity: 0.82;">${safeSlogan}</p></div></div></div>`
}

function renderPreview(markdown: string, options: RenderOptions): string {
  const baseHTML = renderMarkdown(markdown, options.theme)
  const doc = new DOMParser().parseFromString(baseHTML, "text/html")
  const section = doc.querySelector<HTMLElement>("section")

  if (!section) {
    return baseHTML
  }

  applyIntensity(section, options.intensityKey)
  applyEmphasisMode(section, options.theme, options.emphasisMode)

  const topModuleHTML = buildTopModule(
    options.topModuleKey,
    options.theme,
    options.brandName,
    options.brandSlogan
  )
  if (topModuleHTML) {
    section.insertAdjacentHTML("afterbegin", topModuleHTML)
  }

  const bottomModuleHTML = buildBottomModule(
    options.bottomModuleKey,
    options.theme,
    options.brandName,
    options.brandSlogan,
    options.qrImageUrl
  )
  if (bottomModuleHTML) {
    section.insertAdjacentHTML("beforeend", bottomModuleHTML)
  }

  return section.outerHTML
}

const Sidepanel = () => {
  const [markdown, setMarkdown] = useState<string>(() =>
    loadFromStorage(APP_CONFIG.storageKeys.markdownDraft, defaultMarkdown)
  )
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
    const storedTheme = loadFromStorage<string>(APP_CONFIG.storageKeys.themeKey, "businessBlue")
    return isThemeKey(storedTheme) ? storedTheme : "businessBlue"
  })
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>(() => {
    const storedDevice = loadFromStorage<string>(APP_CONFIG.storageKeys.previewDevice, "mobile")
    return isPreviewDevice(storedDevice) ? storedDevice : "mobile"
  })
  const [intensityKey, setIntensityKey] = useState<IntensityKey>(() => {
    const storedValue = loadFromStorage<string>(APP_CONFIG.storageKeys.intensityKey, "standard")
    return isIntensityKey(storedValue) ? storedValue : "standard"
  })
  const [emphasisMode, setEmphasisMode] = useState<EmphasisMode>(() => {
    const storedValue = loadFromStorage<string>(APP_CONFIG.storageKeys.emphasisMode, "marker")
    return isEmphasisMode(storedValue) ? storedValue : "marker"
  })
  const [topModuleKey, setTopModuleKey] = useState<TopModuleKey>(() => {
    const storedValue = loadFromStorage<string>(
      APP_CONFIG.storageKeys.topModuleKey,
      "businessRibbon"
    )
    return isTopModuleKey(storedValue) ? storedValue : "businessRibbon"
  })
  const [bottomModuleKey, setBottomModuleKey] = useState<BottomModuleKey>(() => {
    const storedValue = loadFromStorage<string>(
      APP_CONFIG.storageKeys.bottomModuleKey,
      "simpleCard"
    )
    return isBottomModuleKey(storedValue) ? storedValue : "simpleCard"
  })
  const [brandName, setBrandName] = useState<string>(() =>
    loadFromStorage(APP_CONFIG.storageKeys.brandName, "你的公众号")
  )
  const [brandSlogan, setBrandSlogan] = useState<string>(() =>
    loadFromStorage(APP_CONFIG.storageKeys.brandSlogan, "每周更新高价值内容")
  )
  const [qrImageUrl, setQrImageUrl] = useState<string>(() =>
    loadFromStorage(APP_CONFIG.storageKeys.qrImageUrl, "")
  )
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [isCheckingImages, setIsCheckingImages] = useState(false)
  const [oversizedImages, setOversizedImages] = useState<ImageProbeResult[]>([])

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentTheme = themes[themeKey]
  const imageUrls = useMemo(() => extractMarkdownImageUrls(markdown), [markdown])

  const previewHTML = useMemo(
    () =>
      renderPreview(markdown, {
        theme: currentTheme,
        intensityKey,
        emphasisMode,
        topModuleKey,
        bottomModuleKey,
        brandName,
        brandSlogan,
        qrImageUrl,
      }),
    [
      markdown,
      currentTheme,
      intensityKey,
      emphasisMode,
      topModuleKey,
      bottomModuleKey,
      brandName,
      brandSlogan,
      qrImageUrl,
    ]
  )

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.markdownDraft, markdown)
  }, [markdown])

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.themeKey, themeKey)
  }, [themeKey])

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.previewDevice, previewDevice)
  }, [previewDevice])

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.intensityKey, intensityKey)
  }, [intensityKey])

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.emphasisMode, emphasisMode)
  }, [emphasisMode])

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.topModuleKey, topModuleKey)
  }, [topModuleKey])

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.bottomModuleKey, bottomModuleKey)
  }, [bottomModuleKey])

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.brandName, brandName)
  }, [brandName])

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.brandSlogan, brandSlogan)
  }, [brandSlogan])

  useEffect(() => {
    saveToStorage(APP_CONFIG.storageKeys.qrImageUrl, qrImageUrl)
  }, [qrImageUrl])

  useEffect(() => {
    if (!copySuccess) {
      return
    }

    const timer = window.setTimeout(() => {
      setCopySuccess(false)
    }, APP_CONFIG.clipboard.successFlashMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [copySuccess])

  useEffect(() => {
    if (!isContactOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsContactOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isContactOpen])

  useEffect(() => {
    const externalImageUrls = imageUrls.filter((url) => /^https?:\/\//i.test(url)).slice(0, 12)
    if (!externalImageUrls.length) {
      setOversizedImages([])
      setIsCheckingImages(false)
      return
    }

    let active = true
    setIsCheckingImages(true)

    Promise.all(externalImageUrls.map((url) => measureImage(url)))
      .then((results) => {
        if (!active) {
          return
        }

        const largeImages = results
          .filter((item): item is ImageProbeResult => Boolean(item))
          .filter(
            (item) => item.width >= IMAGE_RESOLUTION_LIMIT || item.height >= IMAGE_RESOLUTION_LIMIT
          )
        setOversizedImages(largeImages)
      })
      .finally(() => {
        if (active) {
          setIsCheckingImages(false)
        }
      })

    return () => {
      active = false
    }
  }, [imageUrls])

  const publishChecks = useMemo(() => {
    const checks: CheckIssue[] = []

    if (!markdown.trim()) {
      checks.push({
        id: "empty-content",
        level: "error",
        title: "内容为空",
        detail: "请先粘贴或输入正文，再执行发布。",
      })
      return checks
    }

    if (!/^#\s+.+/m.test(markdown)) {
      checks.push({
        id: "missing-title",
        level: "warning",
        title: "未检测到一级标题",
        detail: "建议添加一个 # 一级标题，提高打开率与结构清晰度。",
      })
    }

    findSensitiveMatches(markdown).forEach((keyword) => {
      checks.push({
        id: `sensitive-${keyword}`,
        level: "error",
        title: `疑似敏感词：${keyword}`,
        detail: "建议改写为更客观的表达，避免发布风险。",
        locateText: keyword,
      })
    })

    imageUrls
      .filter((url) => url.startsWith("data:image") && url.length >= LARGE_DATA_IMAGE_LENGTH)
      .forEach((url, index) => {
        checks.push({
          id: `large-inline-${index}`,
          level: "warning",
          title: "检测到超大内嵌图片",
          detail: "建议改为图床链接，避免发布时卡顿。",
          locateText: url.slice(0, 60),
        })
      })

    imageUrls.filter(isInternalDriveImageUrl).forEach((url, index) => {
      checks.push({
        id: `internal-drive-image-${index}`,
        level: "warning",
        title: "检测到飞书内部图片链接",
        detail: "该链接可能仅飞书登录态可见，公众号预览可能不显示，建议重新复制飞书原文后再粘贴。",
        locateText: url,
      })
    })

    oversizedImages.forEach((image) => {
      checks.push({
        id: `oversized-image-${image.url}`,
        level: "warning",
        title: "图片分辨率过高",
        detail: `${image.width} x ${image.height}，建议压缩到 1600 像素以内。`,
        locateText: image.url,
      })
    })

    if (markdown.length > 0 && markdown.length < 120) {
      checks.push({
        id: "too-short",
        level: "warning",
        title: "正文偏短",
        detail: "建议补充一个案例或结论段，提升完整度。",
      })
    }

    return checks
  }, [imageUrls, markdown, oversizedImages])

  const blockingChecks = useMemo(
    () => publishChecks.filter((item) => item.level === "error"),
    [publishChecks]
  )
  const warningChecks = useMemo(
    () => publishChecks.filter((item) => item.level === "warning"),
    [publishChecks]
  )

  const focusEditor = useCallback((start: number, end: number) => {
    requestAnimationFrame(() => {
      const editor = textareaRef.current
      if (!editor) {
        return
      }

      editor.focus()
      editor.setSelectionRange(start, end)
    })
  }, [])

  const locateIssue = useCallback(
    (issue: CheckIssue) => {
      if (!issue.locateText) {
        focusEditor(0, 0)
        return
      }

      const index = markdown.toLowerCase().indexOf(issue.locateText.toLowerCase())
      if (index < 0) {
        focusEditor(0, 0)
        return
      }

      focusEditor(index, index + issue.locateText.length)
    },
    [focusEditor, markdown]
  )

  const replaceSelection = useCallback(
    (replacement: string) => {
      const editor = textareaRef.current
      const start = editor?.selectionStart ?? markdown.length
      const end = editor?.selectionEnd ?? markdown.length
      const next = `${markdown.slice(0, start)}${replacement}${markdown.slice(end)}`
      const caret = start + replacement.length

      setMarkdown(next)
      focusEditor(caret, caret)
    },
    [focusEditor, markdown]
  )

  const wrapSelection = useCallback(
    (prefix: string, suffix: string, placeholder: string) => {
      const editor = textareaRef.current
      const start = editor?.selectionStart ?? markdown.length
      const end = editor?.selectionEnd ?? markdown.length
      const selected = markdown.slice(start, end)
      const content = selected || placeholder
      const next = `${markdown.slice(0, start)}${prefix}${content}${suffix}${markdown.slice(end)}`
      const selectionStart = start + prefix.length
      const selectionEnd = selectionStart + content.length

      setMarkdown(next)
      focusEditor(selectionStart, selectionEnd)
    },
    [focusEditor, markdown]
  )

  const insertSnippet = useCallback((snippet: string) => {
    replaceSelection(snippet)
  }, [replaceSelection])

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const htmlData = event.clipboardData.getData("text/html")
      const textData = event.clipboardData.getData("text/plain")

      if (!htmlData) {
        return
      }

      event.preventDefault()

      try {
        const converted = htmlToMarkdown(htmlData).trim()
        if (!converted.trim()) {
          if (textData) {
            replaceSelection(textData)
          }
          return
        }

        replaceSelection(converted)
      } catch (error) {
        console.error("HTML 转 Markdown 失败:", error)

        if (!textData) {
          alert(APP_CONFIG.message.pasteFailed)
          return
        }

        alert(APP_CONFIG.message.pasteFallback)
        replaceSelection(textData)
      }
    },
    [replaceSelection]
  )

  const handleCopy = useCallback(async () => {
    if (isCopying) {
      return
    }

    setIsCopying(true)
    const result = await copyArticleToClipboard({ markdown, html: previewHTML })
    setIsCopying(false)

    if (!result.ok) {
      alert(result.message ?? APP_CONFIG.message.copyFailed)
      return
    }

    setCopySuccess(true)
  }, [isCopying, markdown, previewHTML])

  const handleContact = useCallback(() => {
    setIsContactOpen(true)
  }, [])

  const handleCloseContact = useCallback(() => {
    setIsContactOpen(false)
  }, [])

  const handleOpenEmail = useCallback(() => {
    window.open(`mailto:${APP_CONFIG.contact.email}`)
  }, [])

  const handleOpenGithub = useCallback(() => {
    const github = APP_CONFIG.contact.github?.trim()
    if (!github) {
      return
    }
    window.open(github, "_blank", "noopener,noreferrer")
  }, [])

  const handleCopyWechatId = useCallback(async () => {
    const wechatId = APP_CONFIG.contact.wechatId?.trim()
    if (!wechatId) {
      alert("请先在配置里填写微信号。")
      return
    }

    try {
      await navigator.clipboard.writeText(wechatId)
      alert("微信号已复制。")
    } catch (error) {
      console.error("复制微信号失败:", error)
      alert("复制失败，请手动复制。")
    }
  }, [])

  const themeKeys = useMemo(() => Object.keys(themes) as ThemeKey[], [])
  const intensityKeys = useMemo(() => Object.keys(intensityProfiles) as IntensityKey[], [])
  const emphasisModeKeys = useMemo(() => Object.keys(emphasisModes) as EmphasisMode[], [])
  const topModuleKeys = useMemo(() => Object.keys(topModules) as TopModuleKey[], [])
  const bottomModuleKeys = useMemo(() => Object.keys(bottomModules) as BottomModuleKey[], [])

  const toolbarButtons = useMemo(
    () => [
      { key: "h1", label: "一级标题", icon: Heading1, onClick: () => insertSnippet("# 一级标题") },
      { key: "h2", label: "二级标题", icon: Heading2, onClick: () => insertSnippet("## 二级标题") },
      { key: "h3", label: "三级标题", icon: Heading3, onClick: () => insertSnippet("### 三级标题") },
      { key: "bold", label: "粗体", icon: Bold, onClick: () => wrapSelection("**", "**", "重点内容") },
      { key: "italic", label: "斜体", icon: Italic, onClick: () => wrapSelection("*", "*", "强调内容") },
      { key: "strike", label: "删除线", icon: Strikethrough, onClick: () => wrapSelection("~~", "~~", "已废弃内容") },
      { key: "quote", label: "引用", icon: Quote, onClick: () => insertSnippet("> 引用内容") },
      { key: "unordered", label: "无序列表", icon: List, onClick: () => insertSnippet("- 列表项") },
      { key: "ordered", label: "有序列表", icon: ListOrdered, onClick: () => insertSnippet("1. 列表项") },
      { key: "link", label: "链接", icon: Link2, onClick: () => wrapSelection("[", "](https://example.com)", "链接文本") },
      { key: "image", label: "图片", icon: ImageIcon, onClick: () => insertSnippet("![图片描述](https://example.com/image.png)") },
      { key: "code", label: "代码", icon: Code2, onClick: () => wrapSelection("`", "`", "inlineCode") },
      {
        key: "table",
        label: "表格",
        icon: Table2,
        onClick: () =>
          insertSnippet("| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 A | 内容 B | 内容 C |"),
      },
      { key: "line", label: "分隔线", icon: Minus, onClick: () => insertSnippet("\n---\n") },
    ] as const,
    [insertSnippet, wrapSelection]
  )

  const publishStatus =
    blockingChecks.length > 0
      ? "需修复"
      : warningChecks.length > 0
        ? "可发布（建议优化）"
        : "已通过"
  const publishStatusClass =
    blockingChecks.length > 0 ? "risk" : warningChecks.length > 0 ? "warning" : "safe"
  const contactWechatQrSrc = APP_CONFIG.contact.wechatQrImageUrl.trim()
  const hasWechatId = Boolean(APP_CONFIG.contact.wechatId.trim())
  const hasGithub = Boolean(APP_CONFIG.contact.github.trim())

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div className="workspace-brand">
          <span className="brand-icon">
            <FileText size={18} />
          </span>
          <div className="brand-text">
            <h1>飞书文档转公众号</h1>
            <p>v2.0 发文工作台</p>
          </div>
        </div>

        <div className="workspace-actions">
          <button
            type="button"
            className="action-button neutral"
            onClick={() =>
              setPreviewDevice((current) => (current === "mobile" ? "desktop" : "mobile"))
            }
            title={previewDevice === "mobile" ? "切换到电脑视图" : "切换到手机视图"}
          >
            <Monitor size={14} />
            {previewDevice === "mobile" ? "电脑视图" : "手机视图"}
          </button>
          <button type="button" className="action-button success" onClick={handleContact}>
            <MessageCircle size={14} />
            联系作者
          </button>
          <button
            type="button"
            className={`action-button primary ${copySuccess ? "copied" : ""}`}
            disabled={isCopying}
            onClick={handleCopy}
          >
            {copySuccess ? <Check size={14} /> : <Copy size={14} />}
            {copySuccess ? "已复制" : "复制到公众号"}
          </button>
        </div>
      </header>

      <main className="workspace-main">
        <section className="editor-panel">
          <div className="panel-hint">
            <span># 在左侧编辑正文，在右侧进行样式编排与发布体检</span>
          </div>

          <div className="editor-toolbar">
            {toolbarButtons.map((button) => {
              const Icon = button.icon
              return (
                <button
                  key={button.key}
                  type="button"
                  className="toolbar-button"
                  onClick={button.onClick}
                  title={button.label}
                >
                  <Icon size={14} />
                </button>
              )
            })}
          </div>

          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            onPaste={handlePaste}
            spellCheck={false}
            placeholder="在这里输入 Markdown，或者直接粘贴飞书文档内容..."
          />

          <div className="editor-status">
            <span>支持飞书 HTML 粘贴自动转换</span>
            <span>{markdown.length} 字符</span>
          </div>
        </section>

        <section className="preview-panel">
          <div className="settings-panel">
            <div className="setting-row">
              <p className="setting-label">
                <Sparkles size={13} />
                主题皮肤
              </p>
              <div className="theme-list">
                {themeKeys.map((key) => {
                  const theme = themes[key]
                  const style = { "--theme-color": theme.primary } as CSSProperties
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`theme-pill ${key === themeKey ? "active" : ""}`}
                      style={style}
                      onClick={() => setThemeKey(key)}
                    >
                      {theme.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="setting-row compact">
              <p className="setting-label">
                <Wand2 size={13} />
                风格强度
              </p>
              <div className="segment-list">
                {intensityKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`segment-pill ${key === intensityKey ? "active" : ""}`}
                    onClick={() => setIntensityKey(key)}
                  >
                    {intensityProfiles[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row compact">
              <p className="setting-label">
                <Bold size={13} />
                重点样式
              </p>
              <div className="segment-list">
                {emphasisModeKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`segment-pill ${key === emphasisMode ? "active" : ""}`}
                    onClick={() => setEmphasisMode(key)}
                    title={emphasisModes[key].hint}
                  >
                    {emphasisModes[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="module-row">
              <label className="field-label" htmlFor="top-module-select">
                顶部关注条
              </label>
              <select
                id="top-module-select"
                className="field-select"
                value={topModuleKey}
                onChange={(event) => {
                  const value = event.target.value
                  if (isTopModuleKey(value)) {
                    setTopModuleKey(value)
                  }
                }}
              >
                {topModuleKeys.map((key) => (
                  <option key={key} value={key}>
                    {topModules[key].label}
                  </option>
                ))}
              </select>

              <label className="field-label" htmlFor="bottom-module-select">
                底部收尾卡片
              </label>
              <select
                id="bottom-module-select"
                className="field-select"
                value={bottomModuleKey}
                onChange={(event) => {
                  const value = event.target.value
                  if (isBottomModuleKey(value)) {
                    setBottomModuleKey(value)
                  }
                }}
              >
                {bottomModuleKeys.map((key) => (
                  <option key={key} value={key}>
                    {bottomModules[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="brand-fields">
              <input
                className="field-input"
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="公众号名称"
              />
              <input
                className="field-input"
                value={brandSlogan}
                onChange={(event) => setBrandSlogan(event.target.value)}
                placeholder="一句话价值主张"
              />
              <input
                className="field-input"
                value={qrImageUrl}
                onChange={(event) => setQrImageUrl(event.target.value)}
                placeholder="二维码图片地址（可选）"
              />
            </div>

            <div className="check-panel">
              <div className="check-header">
                <p>
                  <ShieldCheck size={13} />
                  发布前体检
                </p>
                <span className={`check-badge ${publishStatusClass}`}>{publishStatus}</span>
              </div>

              {isCheckingImages && <p className="check-hint">正在检测图片尺寸...</p>}

              {publishChecks.length === 0 ? (
                <p className="check-hint">当前没有检测到明显风险，可直接发布。</p>
              ) : (
                <div className="check-list">
                  {publishChecks.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      className={`check-item ${issue.level}`}
                      onClick={() => locateIssue(issue)}
                    >
                      <span className="check-item-title">
                        {issue.level === "error" ? <AlertTriangle size={13} /> : <Sparkles size={13} />}
                        {issue.title}
                      </span>
                      <span className="check-item-detail">{issue.detail}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="preview-canvas">
            {previewDevice === "mobile" ? (
              <div className="phone-shell">
                <div className="phone-top">
                  <span>10:30</span>
                </div>
                <div className="phone-screen" dangerouslySetInnerHTML={{ __html: previewHTML }} />
              </div>
            ) : (
              <div className="desktop-preview" dangerouslySetInnerHTML={{ __html: previewHTML }} />
            )}
          </div>
        </section>
      </main>

      {isContactOpen && (
        <div className="contact-modal-backdrop" onClick={handleCloseContact}>
          <section className="contact-modal-card" onClick={(event) => event.stopPropagation()}>
            <header className="contact-modal-header">
              <div className="contact-modal-title">
                <h3>扫码添加作者微信</h3>
                <p>优先微信沟通，支持问题答疑和功能建议。</p>
              </div>
              <button
                type="button"
                className="contact-close-button"
                onClick={handleCloseContact}
                aria-label="关闭联系作者弹窗"
              >
                <X size={16} />
              </button>
            </header>

            <div className="contact-modal-body">
              <div className="contact-qr-panel">
                <div className="contact-qr-box">
                  {contactWechatQrSrc ? (
                    <img src={contactWechatQrSrc} alt="作者微信二维码" />
                  ) : (
                    <div className="contact-qr-empty">
                      <ImageIcon size={24} />
                      <span>二维码未配置</span>
                    </div>
                  )}
                </div>
                <div className="contact-qr-text">
                  <p className="contact-qr-heading">长按识别二维码或扫码添加</p>
                  <p className="contact-qr-note">
                    {hasWechatId
                      ? `微信号：${APP_CONFIG.contact.wechatId}`
                      : "未填写微信号，建议在配置中补充。"}
                  </p>
                </div>
              </div>

              <div className="contact-shortcuts">
                <button
                  type="button"
                  className="contact-shortcut wechat"
                  onClick={handleCopyWechatId}
                  disabled={!hasWechatId}
                >
                  <MessageCircle size={16} />
                  微信
                </button>

                {hasGithub && (
                  <button type="button" className="contact-shortcut github" onClick={handleOpenGithub}>
                    <Github size={16} />
                    GitHub
                  </button>
                )}

                <button type="button" className="contact-shortcut email" onClick={handleOpenEmail}>
                  <Mail size={16} />
                  邮箱
                </button>
              </div>
            </div>

            <footer className="contact-modal-footer">
              <button type="button" className="contact-confirm-button" onClick={handleCloseContact}>
                知道了
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}

export default Sidepanel
