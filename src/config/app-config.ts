export const APP_CONFIG = {
  storageKeys: {
    markdownDraft: "gongzhonghao.markdownDraft",
    themeKey: "gongzhonghao.themeKey",
    previewDevice: "gongzhonghao.previewDevice",
    intensityKey: "gongzhonghao.intensityKey",
    emphasisMode: "gongzhonghao.emphasisMode",
    topModuleKey: "gongzhonghao.topModuleKey",
    bottomModuleKey: "gongzhonghao.bottomModuleKey",
    brandName: "gongzhonghao.brandName",
    brandSlogan: "gongzhonghao.brandSlogan",
    qrImageUrl: "gongzhonghao.qrImageUrl",
    contactWechatQrDataUrl: "gongzhonghao.contactWechatQrDataUrl",
  },
  clipboard: {
    successFlashMs: 1800,
  },
  contact: {
    email: "your-email@example.com",
    github: "",
    wechatId: "",
    wechatQrImageUrl: "",
  },
  message: {
    copyEmpty: "请先输入或粘贴要转换的内容。",
    copyFailed: "复制失败，请检查浏览器剪贴板权限后重试。",
    pasteFallback: "HTML 转换失败，已自动回退为纯文本粘贴。",
    pasteFailed: "粘贴失败，请重试。",
  },
} as const

export type StorageKey = (typeof APP_CONFIG.storageKeys)[keyof typeof APP_CONFIG.storageKeys]
