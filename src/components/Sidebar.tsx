import { CSSProperties } from "react"

export interface ThemeStyle {
  name: string
  displayName: string
  styles: CSSProperties
}

export const themeStyles: Record<string, ThemeStyle> = {
  tech: {
    name: "tech",
    displayName: "科技蓝",
    styles: {
      "--primary-color": "#3b82f6",
      "--text-color": "#1e293b",
      "--heading-color": "#0f172a",
      "--background-color": "#ffffff",
      "--border-color": "#e2e8f0",
      "--link-color": "#2563eb",
      "--quote-bg": "#eff6ff",
      "--quote-border": "#3b82f6",
      "--code-bg": "#f1f5f9",
    } as CSSProperties,
  },
  minimal: {
    name: "minimal",
    displayName: "简约白",
    styles: {
      "--primary-color": "#64748b",
      "--text-color": "#334155",
      "--heading-color": "#0f172a",
      "--background-color": "#ffffff",
      "--border-color": "#f1f5f9",
      "--link-color": "#475569",
      "--quote-bg": "#fafafa",
      "--quote-border": "#94a3b8",
      "--code-bg": "#f8fafc",
    } as CSSProperties,
  },
  business: {
    name: "business",
    displayName: "商务黑",
    styles: {
      "--primary-color": "#1c1917",
      "--text-color": "#44403c",
      "--heading-color": "#0c0a09",
      "--background-color": "#ffffff",
      "--border-color": "#e7e5e4",
      "--link-color": "#1c1917",
      "--quote-bg": "#f5f5f4",
      "--quote-border": "#1c1917",
      "--code-bg": "#f5f5f4",
    } as CSSProperties,
  },
}
