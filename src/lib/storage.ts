import type { StorageKey } from "../config/app-config"

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function loadFromStorage<T>(key: StorageKey, fallback: T): T {
  if (!canUseStorage()) {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return fallback
    }
    return JSON.parse(raw) as T
  } catch (error) {
    console.error("读取本地配置失败:", error)
    return fallback
  }
}

export function saveToStorage<T>(key: StorageKey, value: T) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error("保存本地配置失败:", error)
  }
}
