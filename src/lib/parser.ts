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

/**
 * Extract high-resolution image URL from Feishu img elements
 */
function extractImageUrl(img: HTMLImageElement): string {
  // Priority 1: data-src (usually contains the original high-res image)
  const dataSrc = img.getAttribute("data-src")
  if (dataSrc && dataSrc.startsWith("http")) {
    return dataSrc
  }

  // Priority 2: data-original-src
  const originalSrc = img.getAttribute("data-original-src")
  if (originalSrc && originalSrc.startsWith("http")) {
    return originalSrc
  }

  // Priority 3: srcset with high-res option
  if (img.srcset) {
    const sources = img.srcset.split(",").map((s) => s.trim())
    // Get the largest image from srcset
    const highResSource = sources.sort((a, b) => {
      const aSize = parseInt(a.split(" ").pop() || "0")
      const bSize = parseInt(b.split(" ").pop() || "0")
      return bSize - aSize
    })[0]
    if (highResSource) {
      return highResSource.split(" ")[0]
    }
  }

  // Priority 4: Regular src
  if (img.src && img.src.startsWith("http")) {
    // Try to convert thumbnail URLs to full-size URLs
    // Feishu thumbnail URLs often contain thumbnail parameters
    return img.src.replace(/thumbnail\/\d+/, "original")
  }

  return img.src || ""
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
const createTurndownService = (): TurndownService => {
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
      const src = extractImageUrl(img)
      const alt = img.alt || ""
      return `\n![${alt}](${src})\n`
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
        const src = extractImageUrl(img)
        const alt = img.alt || ""
        return `\n![${alt}](${src})\n`
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

// Singleton instance
let turndownService: TurndownService | null = null

/**
 * Convert HTML content to Markdown
 * @param html - The HTML string to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  if (!turndownService) {
    turndownService = createTurndownService()
  }

  try {
    // Clean the HTML first to remove redundant nodes
    const cleanedHTML = cleanHTML(html)
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
  return (
    markdown
      // Remove more than 2 consecutive blank lines
      .replace(/\n{3,}/g, "\n\n")
      // Keep leading indentation (important for code blocks), trim trailing spaces only
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .join("\n")
      .trim()
  )
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
