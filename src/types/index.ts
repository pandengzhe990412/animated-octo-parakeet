export interface DocumentData {
  title: string
  markdown: string
  html: string
}

export interface ThemeConfig {
  name: string
  displayName: string
  primaryColor: string
  textColor: string
  headingColor: string
  backgroundColor: string
  borderColor: string
  linkColor: string
  quoteBackground: string
  quoteBorder: string
  codeBackground: string
}

export interface AIConfig {
  provider: "openai" | "claude"
  apiKey: string
  model: string
  maxTokens: number
}

export interface ExportConfig {
  format: "markdown" | "html" | "inline-html"
  includeMetadata: boolean
}
