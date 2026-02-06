import { APP_CONFIG } from "../config/app-config"

export interface CopyPayload {
  markdown: string
  html: string
}

export interface CopyResult {
  ok: boolean
  message?: string
}

export async function copyArticleToClipboard(payload: CopyPayload): Promise<CopyResult> {
  if (!payload.markdown.trim()) {
    return {
      ok: false,
      message: APP_CONFIG.message.copyEmpty,
    }
  }

  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      await navigator.clipboard.writeText(payload.markdown)
      return { ok: true }
    }

    const item = new ClipboardItem({
      "text/html": new Blob([payload.html], { type: "text/html" }),
      "text/plain": new Blob([payload.markdown], { type: "text/plain" }),
    })

    await navigator.clipboard.write([item])
    return { ok: true }
  } catch (error) {
    console.error("剪贴板复制失败:", error)
    return {
      ok: false,
      message: APP_CONFIG.message.copyFailed,
    }
  }
}
