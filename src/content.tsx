import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*.feishu.cn/*", "https://*.larksuite.com/*"],
}

console.log("Gongzhonghao content script loaded on Feishu/Lark page")
