/**
 * Inline CSS Utility for WeChat Official Account
 * Converts HTML with Tailwind classes to inline-styled HTML (Browser-native, no juice dependency)
 */

/**
 * Tailwind CSS to Inline CSS Mapping Table
 * Expanded coverage for WeChat formatting needs
 */
const tailwindToInlineCSS: Record<string, string> = {
  // === Text Colors ===
  "text-blue-50": "color: #eff6ff",
  "text-blue-100": "color: #dbeafe",
  "text-blue-200": "color: #bfdbfe",
  "text-blue-300": "color: #93c5fd",
  "text-blue-400": "color: #60a5fa",
  "text-blue-500": "color: #3b82f6",
  "text-blue-600": "color: #2563eb",
  "text-blue-700": "color: #1d4ed8",
  "text-blue-800": "color: #1e40af",
  "text-blue-900": "color: #1e3a8a",

  "text-gray-50": "color: #f9fafb",
  "text-gray-100": "color: #f3f4f6",
  "text-gray-200": "color: #e5e7eb",
  "text-gray-300": "color: #d1d5db",
  "text-gray-400": "color: #9ca3af",
  "text-gray-500": "color: #6b7280",
  "text-gray-600": "color: #4b5563",
  "text-gray-700": "color: #374151",
  "text-gray-800": "color: #1f2937",
  "text-gray-900": "color: #111827",

  "text-white": "color: #ffffff",
  "text-black": "color: #000000",

  "text-purple-500": "color: #a855f7",
  "text-purple-600": "color: #9333ea",
  "text-purple-700": "color: #7c3aed",
  "text-green-600": "color: #16a34a",
  "text-red-600": "color: #dc2626",
  "text-yellow-600": "color: #ca8a04",

  // === Background Colors ===
  "bg-blue-50": "background-color: #eff6ff",
  "bg-blue-100": "background-color: #dbeafe",
  "bg-blue-200": "background-color: #bfdbfe",
  "bg-blue-500": "background-color: #3b82f6",
  "bg-blue-600": "background-color: #2563eb",
  "bg-blue-700": "background-color: #1d4ed8",

  "bg-gray-50": "background-color: #f9fafb",
  "bg-gray-100": "background-color: #f3f4f6",
  "bg-gray-200": "background-color: #e5e7eb",
  "bg-gray-300": "background-color: #d1d5db",
  "bg-white": "background-color: #ffffff",
  "bg-gray-800": "background-color: #1f2937",
  "bg-gray-900": "background-color: #111827",

  "bg-purple-100": "background-color: #f3e8ff",
  "bg-purple-200": "background-color: #e9d5ff",
  "bg-green-100": "background-color: #dcfce7",
  "bg-red-100": "background-color: #fee2e2",
  "bg-yellow-100": "background-color: #fef9c3",

  "bg-transparent": "background-color: transparent",

  // === Border Colors ===
  "border-blue-500": "border-color: #3b82f6",
  "border-blue-600": "border-color: #2563eb",
  "border-gray-200": "border-color: #e5e7eb",
  "border-gray-300": "border-color: #d1d5db",
  "border-gray-400": "border-color: #9ca3af",
  "border-gray-900": "border-color: #111827",
  "border-white": "border-color: #ffffff",
  "border-transparent": "border-color: transparent",

  "border-b-gray-200": "border-bottom-color: #e5e7eb",
  "border-t-gray-200": "border-top-color: #e5e7eb",

  // === Spacing (Padding) ===
  "p-0": "padding: 0",
  "p-1": "padding: 0.25rem",
  "p-2": "padding: 0.5rem",
  "p-3": "padding: 0.75rem",
  "p-4": "padding: 1rem",
  "p-5": "padding: 1.25rem",
  "p-6": "padding: 1.5rem",
  "p-8": "padding: 2rem",

  "px-1": "padding-left: 0.25rem; padding-right: 0.25rem",
  "px-2": "padding-left: 0.5rem; padding-right: 0.5rem",
  "px-3": "padding-left: 0.75rem; padding-right: 0.75rem",
  "px-4": "padding-left: 1rem; padding-right: 1rem",
  "px-6": "padding-left: 1.5rem; padding-right: 1.5rem",
  "px-8": "padding-left: 2rem; padding-right: 2rem",

  "py-1": "padding-top: 0.25rem; padding-bottom: 0.25rem",
  "py-2": "padding-top: 0.5rem; padding-bottom: 0.5rem",
  "py-3": "padding-top: 0.75rem; padding-bottom: 0.75rem",
  "py-4": "padding-top: 1rem; padding-bottom: 1rem",
  "py-6": "padding-top: 1.5rem; padding-bottom: 1.5rem",
  "py-8": "padding-top: 2rem; padding-bottom: 2rem",

  "pt-2": "padding-top: 0.5rem",
  "pt-4": "padding-top: 1rem",
  "pb-2": "padding-bottom: 0.5rem",
  "pb-4": "padding-bottom: 1rem",
  "pl-2": "padding-left: 0.5rem",
  "pl-4": "padding-left: 1rem",
  "pr-2": "padding-right: 0.5rem",
  "pr-4": "padding-right: 1rem",

  // === Spacing (Margin) ===
  "m-0": "margin: 0",
  "m-1": "margin: 0.25rem",
  "m-2": "margin: 0.5rem",
  "m-3": "margin: 0.75rem",
  "m-4": "margin: 1rem",
  "m-auto": "margin: auto",

  "mx-auto": "margin-left: auto; margin-right: auto",
  "mx-1": "margin-left: 0.25rem; margin-right: 0.25rem",
  "mx-2": "margin-left: 0.5rem; margin-right: 0.5rem",
  "mx-4": "margin-left: 1rem; margin-right: 1rem",

  "my-1": "margin-top: 0.25rem; margin-bottom: 0.25rem",
  "my-2": "margin-top: 0.5rem; margin-bottom: 0.5rem",
  "my-4": "margin-top: 1rem; margin-bottom: 1rem",
  "my-6": "margin-top: 1.5rem; margin-bottom: 1.5rem",
  "my-8": "margin-top: 2rem; margin-bottom: 2rem",

  "mt-1": "margin-top: 0.25rem",
  "mt-2": "margin-top: 0.5rem",
  "mt-4": "margin-top: 1rem",
  "mt-6": "margin-top: 1.5rem",
  "mt-8": "margin-top: 2rem",

  "mb-1": "margin-bottom: 0.25rem",
  "mb-2": "margin-bottom: 0.5rem",
  "mb-4": "margin-bottom: 1rem",
  "mb-6": "margin-bottom: 1.5rem",
  "mb-8": "margin-bottom: 2rem",

  "ml-1": "margin-left: 0.25rem",
  "ml-2": "margin-left: 0.5rem",
  "ml-4": "margin-left: 1rem",
  "ml-auto": "margin-left: auto",

  "mr-1": "margin-right: 0.25rem",
  "mr-2": "margin-right: 0.5rem",
  "mr-4": "margin-right: 1rem",
  "mr-auto": "margin-right: auto",

  // === Typography (Font Size) ===
  "text-xs": "font-size: 0.75rem",
  "text-sm": "font-size: 0.875rem",
  "text-base": "font-size: 1rem",
  "text-lg": "font-size: 1.125rem",
  "text-xl": "font-size: 1.25rem",
  "text-2xl": "font-size: 1.5rem",
  "text-3xl": "font-size: 1.875rem",
  "text-4xl": "font-size: 2.25rem",

  // === Typography (Font Weight) ===
  "font-light": "font-weight: 300",
  "font-normal": "font-weight: 400",
  "font-medium": "font-weight: 500",
  "font-semibold": "font-weight: 600",
  "font-bold": "font-weight: 700",
  "font-extrabold": "font-weight: 800",

  // === Typography (Font Family) ===
  "font-sans": "font-family: ui-sans-serif, system-ui, sans-serif",
  "font-serif": "font-family: ui-serif, Georgia, serif",
  "font-mono": "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",

  // === Typography (Line Height) ===
  "leading-none": "line-height: 1",
  "leading-tight": "line-height: 1.25",
  "leading-snug": "line-height: 1.375",
  "leading-normal": "line-height: 1.5",
  "leading-relaxed": "line-height: 1.625",
  "leading-loose": "line-height: 2",

  // === Typography (Text Align) ===
  "text-left": "text-align: left",
  "text-center": "text-align: center",
  "text-right": "text-align: right",
  "text-justify": "text-align: justify",

  // === Layout (Display) ===
  "block": "display: block",
  "inline-block": "display: inline-block",
  "inline": "display: inline",
  "flex": "display: flex",
  "inline-flex": "display: inline-flex",
  "grid": "display: grid",
  "hidden": "display: none",

  // === Layout (Flexbox) ===
  "flex-row": "flex-direction: row",
  "flex-col": "flex-direction: column",
  "flex-wrap": "flex-wrap: wrap",
  "flex-nowrap": "flex-wrap: nowrap",

  "items-start": "align-items: flex-start",
  "items-end": "align-items: flex-end",
  "items-center": "align-items: center",
  "items-stretch": "align-items: stretch",

  "justify-start": "justify-content: flex-start",
  "justify-end": "justify-content: flex-end",
  "justify-center": "justify-content: center",
  "justify-between": "justify-content: space-between",
  "justify-around": "justify-content: space-around",

  "flex-1": "flex: 1 1 0%",
  "flex-auto": "flex: 1 1 auto",
  "flex-initial": "flex: 0 1 auto",
  "flex-none": "flex: none",

  // === Layout (Grid) ===
  "grid-cols-1": "grid-template-columns: repeat(1, minmax(0, 1fr))",
  "grid-cols-2": "grid-template-columns: repeat(2, minmax(0, 1fr))",
  "grid-cols-3": "grid-template-columns: repeat(3, minmax(0, 1fr))",
  "gap-1": "gap: 0.25rem",
  "gap-2": "gap: 0.5rem",
  "gap-4": "gap: 1rem",
  "gap-6": "gap: 1.5rem",

  // === Sizing (Width) ===
  "w-full": "width: 100%",
  "w-1/2": "width: 50%",
  "w-1/3": "width: 33.333333%",
  "w-2/3": "width: 66.666667%",
  "w-1/4": "width: 25%",
  "w-3/4": "width: 75%",
  "w-auto": "width: auto",
  "w-fit": "width: fit-content",

  "w-4": "width: 1rem",
  "w-5": "width: 1.25rem",
  "w-6": "width: 1.5rem",
  "w-8": "width: 2rem",
  "w-10": "width: 2.5rem",
  "w-12": "width: 3rem",
  "w-16": "width: 4rem",
  "w-20": "width: 5rem",
  "w-24": "width: 6rem",
  "w-32": "width: 8rem",
  "w-40": "width: 10rem",
  "w-48": "width: 12rem",
  "w-64": "width: 16rem",
  "w-96": "width: 24rem",

  "max-w-full": "max-width: 100%",
  "max-w-md": "max-width: 28rem",
  "max-w-lg": "max-width: 32rem",
  "max-w-xl": "max-width: 36rem",
  "max-w-2xl": "max-width: 42rem",
  "max-w-none": "max-width: none",

  // === Sizing (Height) ===
  "h-full": "height: 100%",
  "h-screen": "height: 100vh",
  "h-auto": "height: auto",

  "h-4": "height: 1rem",
  "h-5": "height: 1.25rem",
  "h-6": "height: 1.5rem",
  "h-8": "height: 2rem",
  "h-10": "height: 2.5rem",
  "h-12": "height: 3rem",

  "min-h-full": "min-height: 100%",
  "min-h-screen": "min-height: 100vh",

  // === Borders ===
  "border": "border-width: 1px; border-style: solid",
  "border-0": "border-width: 0",
  "border-2": "border-width: 2px",
  "border-4": "border-width: 4px",
  "border-t": "border-top-width: 1px; border-top-style: solid",
  "border-r": "border-right-width: 1px; border-right-style: solid",
  "border-b": "border-bottom-width: 1px; border-bottom-style: solid",
  "border-l": "border-left-width: 1px; border-left-style: solid",

  "rounded-none": "border-radius: 0",
  "rounded-sm": "border-radius: 0.125rem",
  "rounded": "border-radius: 0.25rem",
  "rounded-md": "border-radius: 0.375rem",
  "rounded-lg": "border-radius: 0.5rem",
  "rounded-xl": "border-radius: 0.75rem",
  "rounded-2xl": "border-radius: 1rem",
  "rounded-3xl": "border-radius: 1.5rem",
  "rounded-full": "border-radius: 9999px",

  // === Position ===
  "static": "position: static",
  "fixed": "position: fixed",
  "absolute": "position: absolute",
  "relative": "position: relative",
  "sticky": "position: sticky",

  "inset-0": "top: 0; right: 0; bottom: 0; left: 0",
  "top-0": "top: 0",
  "bottom-0": "bottom: 0",
  "left-0": "left: 0",
  "right-0": "right: 0",
  "top-full": "top: 100%",
  "bottom-full": "bottom: 100%",

  // === Z-Index ===
  "z-0": "z-index: 0",
  "z-10": "z-index: 10",
  "z-20": "z-index: 20",
  "z-30": "z-index: 30",
  "z-40": "z-index: 40",
  "z-50": "z-index: 50",
  "z-auto": "z-index: auto",

  // === Overflow ===
  "overflow-auto": "overflow: auto",
  "overflow-hidden": "overflow: hidden",
  "overflow-visible": "overflow: visible",
  "overflow-scroll": "overflow: scroll",
  "overflow-x-auto": "overflow-x: auto",
  "overflow-y-auto": "overflow-y: auto",
  "overflow-x-hidden": "overflow-x: hidden",
  "overflow-y-hidden": "overflow-y: hidden",

  // === Opacity ===
  "opacity-0": "opacity: 0",
  "opacity-25": "opacity: 0.25",
  "opacity-50": "opacity: 0.5",
  "opacity-75": "opacity: 0.75",
  "opacity-100": "opacity: 1",

  // === Cursor ===
  "cursor-auto": "cursor: auto",
  "cursor-default": "cursor: default",
  "cursor-pointer": "cursor: pointer",
  "cursor-wait": "cursor: wait",
  "cursor-text": "cursor: text",
  "cursor-move": "cursor: move",
  "cursor-not-allowed": "cursor: not-allowed",

  // === Transitions ===
  "transition-all": "transition-property: all",
  "transition-colors": "transition-property: color, background-color, border-color",
  "transition-opacity": "transition-property: opacity",
  "duration-75": "transition-duration: 75ms",
  "duration-100": "transition-duration: 100ms",
  "duration-150": "transition-duration: 150ms",
  "duration-200": "transition-duration: 200ms",
  "duration-300": "transition-duration: 300ms",
  "ease-in": "transition-timing-function: cubic-bezier(0.4, 0, 1, 1)",
  "ease-out": "transition-timing-function: cubic-bezier(0, 0, 0.2, 1)",
  "ease-in-out": "transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)",

  // === Shadows ===
  "shadow-sm": "box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "shadow": "box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  "shadow-md": "box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  "shadow-lg": "box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  "shadow-xl": "box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "shadow-2xl": "box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)",
  "shadow-none": "box-shadow: none",

  // === Transform ===
  "scale-95": "transform: scale(0.95)",
  "scale-100": "transform: scale(1)",
  "scale-105": "transform: scale(1.05)",
  "rotate-0": "transform: rotate(0deg)",
  "rotate-45": "transform: rotate(45deg)",
  "rotate-90": "transform: rotate(90deg)",
  "rotate-180": "transform: rotate(180deg)",

  // === Other ===
  "truncate": "overflow: hidden; text-overflow: ellipsis; white-space: nowrap",
  "whitespace-nowrap": "white-space: nowrap",
  "whitespace-pre": "white-space: pre",
  "whitespace-pre-wrap": "white-space: pre-wrap",
  "whitespace-pre-line": "white-space: pre-line",
  "break-words": "overflow-wrap: break-word",
  "break-all": "word-break: break-all",
  "select-none": "user-select: none",
  "pointer-events-none": "pointer-events: none",
  "pointer-events-auto": "pointer-events: auto",
}

/**
 * Apply inline CSS to HTML element based on Tailwind classes (Browser-native)
 */
function applyInlineStyles(
  element: HTMLElement,
  preserveClasses: Set<string> = new Set()
): void {
  const classes = element.className.split(" ").filter(Boolean)

  let styleString = element.getAttribute("style") || ""

  for (const cls of classes) {
    // Handle pseudo-class variants - for WeChat, we convert to regular styles
    let baseClass = cls
    if (cls.startsWith("hover:")) {
      baseClass = cls.replace("hover:", "")
    } else if (cls.startsWith("focus:")) {
      baseClass = cls.replace("focus:", "")
    } else if (cls.startsWith("disabled:")) {
      baseClass = cls.replace("disabled:", "")
    }

    if (tailwindToInlineCSS[cls]) {
      styleString += `${tailwindToInlineCSS[cls]};`
    } else if (tailwindToInlineCSS[baseClass]) {
      styleString += `${tailwindToInlineCSS[baseClass]};`
    }
  }

  if (styleString) {
    element.setAttribute("style", styleString)
  }

  // Remove class attributes after converting to inline styles (unless explicitly preserved)
  const keepClass = classes.some((cls) => preserveClasses.has(cls))
  if (!keepClass) {
    element.removeAttribute("class")
  }

  // Recursively process child elements
  Array.from(element.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      applyInlineStyles(child, preserveClasses)
    }
  })
}

/**
 * Convert HTML with Tailwind classes to inline-styled HTML (Browser-native)
 * @param html - HTML string with Tailwind classes
 * @returns HTML string with inline styles
 */
export function convertToInlineCSS(
  html: string,
  preserveClassNames: string[] = []
): string {
  try {
    // Create a temporary DOM element
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = html

    // Apply inline styles recursively
    applyInlineStyles(tempDiv, new Set(preserveClassNames))

    return tempDiv.innerHTML
  } catch (error) {
    console.error("Error converting to inline CSS:", error)
    return html
  }
}

/**
 * Generate WeChat-compatible HTML with theme styles (Browser-native)
 * @param html - Content HTML
 * @param themeStyles - Theme CSS variables as inline styles
 * @returns Complete HTML document ready for WeChat
 */
export function generateWeChatHTML(
  html: string,
  themeStyles: Record<string, string>
): string {
  // Extract CSS variable values
  const textColor = themeStyles["--text-color"] || "#333333"
  const headingColor = themeStyles["--heading-color"] || "#000000"
  const linkColor = themeStyles["--link-color"] || "#2563eb"
  const quoteBg = themeStyles["--quote-bg"] || "#f0f9ff"
  const quoteBorder = themeStyles["--quote-border"] || "#3b82f6"
  const codeBg = themeStyles["--code-bg"] || "#f1f5f9"
  const borderColor = themeStyles["--border-color"] || "#e5e7eb"

  // Create a style string from theme variables
  const themeCSS = `
    .wechat-content {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      line-height: 1.7;
      color: ${textColor};
      font-size: 16px;
      padding: 20px;
      word-wrap: break-word;
    }
    .wechat-content h1,
    .wechat-content h2,
    .wechat-content h3,
    .wechat-content h4 {
      font-weight: 600;
      margin-top: 1.5em;
      margin-bottom: 0.75em;
      line-height: 1.4;
      color: ${headingColor};
    }
    .wechat-content h1 { font-size: 1.875rem; }
    .wechat-content h2 { font-size: 1.5rem; }
    .wechat-content h3 { font-size: 1.25rem; }
    .wechat-content h4 { font-size: 1.125rem; }
    .wechat-content p {
      margin-bottom: 1em;
      line-height: 1.7;
    }
    .wechat-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1.5em 0;
      display: block;
    }
    .wechat-content blockquote {
      border-left: 4px solid ${quoteBorder};
      padding-left: 1em;
      margin: 1.5em 0;
      background-color: ${quoteBg};
      padding: 1em;
      border-radius: 4px;
      font-style: italic;
    }
    .wechat-content code {
      font-size: 0.875em;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      background-color: ${codeBg};
      font-family: Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace;
    }
    .wechat-content pre {
      margin: 1.5em 0;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
      background-color: ${codeBg};
    }
    .wechat-content pre code {
      padding: 0;
      background: transparent;
    }
    .wechat-content ul,
    .wechat-content ol {
      margin-left: 1.5em;
      margin-bottom: 1em;
      padding-left: 1em;
    }
    .wechat-content li {
      margin-bottom: 0.5em;
      line-height: 1.7;
    }
    .wechat-content a {
      color: ${linkColor};
      text-decoration: underline;
    }
    .wechat-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 0.95em;
    }
    .wechat-content th,
    .wechat-content td {
      border: 1px solid ${borderColor};
      padding: 0.5em;
      text-align: left;
    }
    .wechat-content th {
      background-color: #f9fafb;
      font-weight: 600;
    }
    .wechat-content hr {
      border: none;
      border-top: 2px solid ${borderColor};
      margin: 2em 0;
    }
  `

  // Wrap content in WeChat-compatible container
  const wrappedHTML = `<div class="wechat-content">${html}</div>`

  // Since we're in browser environment, we need to apply styles directly
  // First, convert Tailwind to inline styles
  const withInlineStyles = convertToInlineCSS(wrappedHTML, ["wechat-content"])

  // Create a temporary element to apply the theme CSS
  const temp = document.createElement("div")
  temp.style.position = "fixed"
  temp.style.left = "-99999px"
  temp.style.top = "-99999px"
  temp.style.visibility = "hidden"
  temp.innerHTML = `<style>${themeCSS}</style>${withInlineStyles}`
  document.body.appendChild(temp)

  // Apply computed styles to inline
  const wechatContent = temp.querySelector(".wechat-content")
  if (wechatContent) {
    // Get all elements within wechat-content
    const allElements = wechatContent.querySelectorAll("*")

    // For each element, get computed styles and inline them
    allElements.forEach((el) => {
      if (el instanceof HTMLElement) {
        const computed = window.getComputedStyle(el)
        const inline = el.getAttribute("style") || ""

        // Only inline certain important properties
        const importantProps = [
          "color",
          "font-size",
          "font-weight",
          "line-height",
          "background-color",
          "border",
          "padding",
          "margin",
          "text-align",
        ]

        let newStyle = inline
        importantProps.forEach((prop) => {
          const value = computed.getPropertyValue(prop)
          if (value && value !== "normal" && value !== "auto") {
            newStyle += `${prop}: ${value}; `
          }
        })

        if (newStyle) {
          el.setAttribute("style", newStyle)
        }
      }
    })
  }

  const resultHTML = temp.innerHTML
  temp.remove()
  return resultHTML
}
