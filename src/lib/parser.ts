import TurndownService from "turndown"

/**
 * Advanced Parser Utility for Feishu/Lark documents
 * Handles complex DOM structures, custom attributes, and high-res image extraction
 */

/**
 * Check if a node should be removed (redundant elements)
 */
function shouldRemoveNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false

  const elem = node

  // Remove anchor icons and bookmark buttons
  if (
    elem.classList.contains("anchor-icon") ||
    elem.classList.contains("bookmark-icon") ||
    elem.getAttribute("data-type") === "anchor" ||
    elem.getAttribute("data-type") === "bookmark"
  ) {
    return true
  }

  // Remove hidden elements
  if (elem.style?.display === "none" || elem.style?.visibility === "hidden") {
    return true
  }

  // Remove empty divs and spans (but keep paragraph breaks)
  if (
    (elem.tagName === "DIV" || elem.tagName === "SPAN") &&
    elem.textContent?.trim() === "" &&
    !elem.querySelector("img") &&
    !elem.querySelector("br")
  ) {
    return true
  }

  // Remove Feishu-specific UI elements
  if (
    elem.classList.contains("feishu-status-bar") ||
    elem.classList.contains("feishu-comment-trigger") ||
    elem.getAttribute("data-testid")?.includes("toolbar") ||
    elem.getAttribute("data-testid")?.includes("sidebar")
  ) {
    return true
  }

  return false
}

function normalizeImageUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/&amp;/g, "&").replace(/\s+/g, "")
  if (!trimmed) {
    return ""
  }

  if (trimmed.startsWith("data:image/")) {
    return trimmed
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return ""
}

function extractSrcsetUrls(srcset: string): string[] {
  return srcset
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split(/\s+/)[0])
    .filter(Boolean)
}

function detectFeishuOrigin(html: string): string {
  const matches = html.matchAll(/https:\/\/([a-z0-9-]+\.(?:feishu\.cn|larksuite\.com))/gi)
  for (const match of matches) {
    const host = (match[1] || "").toLowerCase()
    if (!host || host.startsWith("internal-api-drive-stream.")) {
      continue
    }
    return `https://${host}`
  }
  return ""
}

function toAsyncCodeUrl(rawUrl: string, feishuOrigin: string): string {
  const normalized = normalizeImageUrl(rawUrl)
  if (!normalized) {
    return ""
  }

  try {
    const parsed = new URL(normalized)
    const host = parsed.hostname.toLowerCase()
    const code = parsed.searchParams.get("code")?.trim() || ""
    const isInternalDriveApi = host.startsWith("internal-api-drive-stream.")

    if (code && (isInternalDriveApi || parsed.pathname.includes("/space/api/box/stream/download/"))) {
      const origin = feishuOrigin || `${parsed.protocol}//${parsed.host}`
      return `${origin}/space/api/box/stream/download/asynccode/?code=${encodeURIComponent(code)}`
    }
  } catch {
    return normalized
  }

  return normalized
}

function scoreImageUrl(url: string): number {
  if (!url) {
    return -1
  }

  if (url.startsWith("data:image/")) {
    return 80
  }

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const isInternalDriveApi = host.startsWith("internal-api-drive-stream.")
    const isAsyncCode = parsed.pathname.includes("/space/api/box/stream/download/asynccode/")

    if (isAsyncCode) {
      return 120
    }

    if (isInternalDriveApi) {
      return 10
    }

    if (parsed.protocol === "https:") {
      return 70
    }
  } catch {
    return 0
  }

  return 0
}

function sanitizeMarkdownImageUrl(url: string): string {
  return url.trim().replace(/^</, "").replace(/>$/, "").replace(/\s+/g, "")
}

function normalizeMarkdownImageBlocks(markdown: string): string {
  const imagePattern = /!\[[^\]]*]\(([^)\s]+)\)/g
  const lines = markdown.split(/\r?\n/)
  const output: string[] = []

  const pushImageLine = (rawUrl: string) => {
    const safeUrl = sanitizeMarkdownImageUrl(rawUrl)
    if (!safeUrl) {
      return
    }
    if (output.length > 0 && output[output.length - 1].trim() !== "") {
      output.push("")
    }
    output.push(`![](${safeUrl})`)
    output.push("")
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      output.push("")
      continue
    }

    const matches = [...trimmed.matchAll(imagePattern)]
    if (!matches.length) {
      output.push(line)
      continue
    }

    const hasTableSyntax = trimmed.includes("|")
    const isPureSingleImage = matches.length === 1 && matches[0][0] === trimmed

    if (hasTableSyntax || matches.length > 1 || isPureSingleImage) {
      for (const match of matches) {
        pushImageLine(match[1] || "")
      }
      continue
    }

    if (matches.length === 1) {
      const imageToken = matches[0][0]
      const remainingText = trimmed.replace(imageToken, "").trim()
      if (remainingText) {
        output.push(remainingText)
      }
      pushImageLine(matches[0][1] || "")
    }
  }

  return output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Extract the most stable image URL for WeChat publishing.
 * Prefer async-code URLs, avoid internal-api-drive-stream URLs.
 */
function extractImageUrl(img: HTMLImageElement, feishuOrigin: string): string {
  const candidates: string[] = []
  const src = img.getAttribute("src")
  const dataSrc = img.getAttribute("data-src")
  const originalSrc = img.getAttribute("data-original-src")

  if (dataSrc) candidates.push(dataSrc)
  if (originalSrc) candidates.push(originalSrc)
  if (src) candidates.push(src)
  if (img.srcset) candidates.push(...extractSrcsetUrls(img.srcset))
  if (img.currentSrc) candidates.push(img.currentSrc)
  if (img.src) candidates.push(img.src)

  const normalized = [...new Set(candidates.map((item) => toAsyncCodeUrl(item, feishuOrigin)).filter(Boolean))]
  if (!normalized.length) {
    return ""
  }

  let best = normalized[0]
  let bestScore = scoreImageUrl(best)
  for (const candidate of normalized.slice(1)) {
    const score = scoreImageUrl(candidate)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return best
}

/**
 * Remove redundant nodes before parsing
 */
function cleanHTML(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  const allElements = Array.from(doc.body.querySelectorAll("*"))
  for (const elem of allElements) {
    if (shouldRemoveNode(elem)) {
      elem.remove()
      continue
    }

    // Remove common unsafe attributes/events from imported HTML
    for (const attr of Array.from(elem.attributes)) {
      if (attr.name.toLowerCase().startsWith("on")) {
        elem.removeAttribute(attr.name)
      }
    }
  }

  return doc.body.innerHTML
}

// Configure Turndown with custom rules for Feishu-specific elements
const createTurndownService = (feishuOrigin: string): TurndownService => {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
  })

  // Custom rule for Feishu data-node-type headings (HIGHEST PRIORITY)
  turndownService.addRule("feishu-data-heading", {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false
      const nodeType = node.getAttribute("data-node-type")
      return nodeType?.startsWith("heading-") === true
    },
    replacement: (_content, node) => {
      const elem = node as HTMLElement
      const nodeType = elem.getAttribute("data-node-type") || ""
      const level = nodeType.replace("heading-", "") || "1"
      const text = elem.textContent?.trim() || ""
      return `\n${"#".repeat(parseInt(level))} ${text}\n\n`
    },
  })

  // Custom rule for Feishu images with high-res extraction
  turndownService.addRule("feishu-image", {
    filter: (node) => {
      return node.nodeName === "IMG"
    },
    replacement: (_content, node) => {
      const img = node as HTMLImageElement
      const src = extractImageUrl(img, feishuOrigin)
      if (!src) {
        return "\n"
      }
      return `\n\n![](${src})\n\n`
    },
  })

  // Custom rule for Feishu image containers
  turndownService.addRule("feishu-image-container", {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false
      return (
        node.getAttribute("data-node-type") === "image" ||
        node.classList.contains("image-container")
      )
    },
    replacement: (content, node) => {
      const img = (node as HTMLElement).querySelector("img")
      if (img) {
        const src = extractImageUrl(img, feishuOrigin)
        if (!src) {
          return content
        }
        return `\n\n![](${src})\n\n`
      }
      return content
    },
  })

  // Custom rule for code blocks with language (Feishu uses data-node-type="code")
  turndownService.addRule("feishu-code-block", {
    filter: (node: Node): boolean => {
      if (!(node instanceof HTMLElement)) return false
      return (
        node.getAttribute("data-node-type") === "code" ||
        (node.nodeName === "PRE" && node.firstChild?.nodeName === "CODE")
      )
    },
    replacement: (_content: string, node: Node): string => {
      const elem = node as HTMLElement
      const codeNode =
        elem.querySelector("code") || (elem.firstChild as HTMLElement)

      if (!codeNode) return ""

      // Try to extract language from data attribute or class
      const language =
        codeNode.getAttribute("data-language") ||
        codeNode.className.match(/language-(\w+)/)?.[1] ||
        ""

      const code = codeNode.textContent || ""
      return `\n\`\`\`${language}\n${code}\n\`\`\`\n`
    },
  })

  // Custom rule for blockquotes
  turndownService.addRule("blockquote", {
    filter: (node: Node): boolean => {
      if (!(node instanceof HTMLElement)) return false
      return (
        node.nodeName === "BLOCKQUOTE" ||
        node.getAttribute("data-node-type") === "quote"
      )
    },
    replacement: (content: string): string => {
      return `\n> ${content}\n`
    },
  })

  // Custom rule for Feishu callout/alert boxes
  turndownService.addRule("feishu-callout", {
    filter: (node: Node): boolean => {
      if (!(node instanceof HTMLElement)) return false
      return (
        node.getAttribute("data-node-type") === "callout" ||
        node.classList.contains("callout")
      )
    },
    replacement: (content: string): string => {
      return `\n> ${content}\n`
    },
  })

  // Custom rule for Feishu lists (data-node-type="bullet" or "ordered")
  turndownService.addRule("feishu-list", {
    filter: (node: Node): boolean => {
      if (!(node instanceof HTMLElement)) return false
      const nodeType = node.getAttribute("data-node-type")
      return nodeType === "bullet" || nodeType === "ordered"
    },
    replacement: (content: string, node: Node): string => {
      const elem = node as HTMLElement
      const nodeType = elem.getAttribute("data-node-type")

      if (nodeType === "bullet") {
        return `\n${content}\n`
      }

      if (nodeType === "ordered") {
        return `\n${content}\n`
      }

      return content
    },
  })

  // Preserve tables with proper formatting
  turndownService.addRule("table", {
    filter: (node: Node): boolean => {
      if (!(node instanceof HTMLElement)) return false
      return (
        node.nodeName === "TABLE" ||
        node.getAttribute("data-node-type") === "table"
      )
    },
    replacement: (content: string): string => {
      return `\n${content}\n`
    },
  })

  // Custom rule for horizontal rules
  turndownService.addRule("feishu-hr", {
    filter: (node: Node): boolean => {
      if (!(node instanceof HTMLElement)) return false
      return (
        node.nodeName === "HR" ||
        node.getAttribute("data-node-type") === "divider"
      )
    },
    replacement: (): string => {
      return `\n---\n`
    },
  })

  // Skip empty text nodes
  turndownService.remove([
    "style",
    "script",
    "noscript",
    "iframe",
  ])

  return turndownService
}

/**
 * Convert HTML content to Markdown
 * @param html - The HTML string to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  try {
    // Clean the HTML first to remove redundant nodes
    const cleanedHTML = cleanHTML(html)
    const feishuOrigin = detectFeishuOrigin(cleanedHTML) || detectFeishuOrigin(html)
    const turndownService = createTurndownService(feishuOrigin)
    const markdown = turndownService.turndown(cleanedHTML)
    return cleanMarkdown(markdown)
  } catch (error) {
    console.error("Error converting HTML to Markdown:", error)
    throw new Error("Failed to parse HTML content")
  }
}

/**
 * Clean up markdown output
 * Removes excessive blank lines and normalizes spacing
 */
function cleanMarkdown(markdown: string): string {
  const normalized = (
    markdown
      // Remove more than 2 consecutive blank lines
      .replace(/\n{3,}/g, "\n\n")
      // Keep leading indentation (important for code blocks), trim trailing spaces only
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .join("\n")
      .trim()
  )

  return normalizeMarkdownImageBlocks(normalized)
}

/**
 * Extract document title from HTML
 * @param html - The HTML string
 * @returns Title string or empty string
 */
export function extractTitle(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Try to find h1 first
  const h1 = doc.querySelector("h1")
  if (h1?.textContent) {
    return h1.textContent.trim()
  }

  // Try title tag
  const title = doc.querySelector("title")
  if (title?.textContent) {
    return title.textContent.trim()
  }

  return "Untitled Document"
}

/**
 * Extract main content from Feishu document
 * @param html - The HTML string
 * @returns Cleaned HTML string containing only the main content
 */
export function extractMainContent(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Comprehensive list of Feishu main content selectors
  const selectors = [
    // Feishu-specific selectors
    '[data-testid="main-content"]',
    '[data-node-type="page"]',
    '[data-node-type="doc"]',
    ".doc-content",
    ".lark-doc-content",
    "article",
    "#doc-content",
    '[class*="doc-content"]',
    '[class*="document-content"]',
  ]

  let mainContent: Element | null = null
  for (const selector of selectors) {
    mainContent = doc.querySelector(selector)
    if (mainContent) break
  }

  // If no specific container found, use body
  if (!mainContent) {
    mainContent = doc.body
  }

  // Clean the content before returning
  if (mainContent) {
    return cleanHTML(mainContent.innerHTML)
  }

  return cleanHTML(html)
}

/**
 * Parse Feishu document and extract structured data
 * @param html - The raw HTML string
 * @returns DocumentData object with title, markdown, and cleaned HTML
 */
export function parseFeishuDocument(html: string): {
  title: string
  markdown: string
  html: string
} {
  const cleanedHTML = extractMainContent(html)
  const markdown = htmlToMarkdown(cleanedHTML)
  const title = extractTitle(cleanedHTML)

  return {
    title,
    markdown,
    html: cleanedHTML,
  }
}
