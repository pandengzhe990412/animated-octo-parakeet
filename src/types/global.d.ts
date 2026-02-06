/**
 * Global Type Declarations
 * Manually declare types for packages that don't have proper TypeScript support
 */

// Declare any browser APIs that might be missing
declare namespace Chrome {
  interface Scripting {
    executeScript: (inject: {
      target: { tabId: number }
      func: () => any
    }) => Promise<chrome.scripting.InjectionResult[]>
  }

  namespace scripting {
    type InjectionResult = {
      result?: any
    }
  }
}

// Extend Navigator for clipboard API
interface ClipboardItem {
  new (items: Record<string, Blob>): ClipboardItem
}

interface Navigator {
  clipboard: {
    write(items: ClipboardItem[]): Promise<void>
  }
}

// Window extensions for browser-specific APIs
interface Window {
  // Add any browser-specific globals here
}

// Module declarations for packages without proper types
declare module "juice" {
  interface JuiceOptions {
    extraCss?: string
    removeStyleTags?: boolean
    preserveImportant?: boolean
    applyWidthAttributes?: boolean
    applyHeightAttributes?: boolean
    applyAttributesTableElements?: boolean
    removeLinkTags?: boolean
    insertPreservedExtraCss?: boolean
    stylePriorityAttribute?: string | null
    webResourcesConcurrency?: number
    xmlMode?: boolean
    encodeSpecialChars?: boolean
  }

  interface JuiceResult {
    html: string
  }

  export default function juice(
    html: string,
    options?: JuiceOptions
  ): string

  export function juiceDocument(
    html: string,
    options?: JuiceOptions
  ): string

  export function juiceResources(
    html: string,
    options?: JuiceOptions
  ): Promise<string>

  export const juiceClient: typeof juice
}
