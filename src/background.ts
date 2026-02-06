/**
 * Background service worker for side panel behavior.
 * Ensures clicking the extension action opens the side panel.
 */

async function enableSidePanelOnActionClick() {
  if (!chrome.sidePanel?.setPanelBehavior) {
    return
  }

  try {
    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true,
    })
  } catch (error) {
    console.error("Failed to enable openPanelOnActionClick:", error)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void enableSidePanelOnActionClick()
})

chrome.runtime.onStartup.addListener(() => {
  void enableSidePanelOnActionClick()
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!chrome.sidePanel?.open || typeof tab.windowId !== "number") {
    return
  }

  try {
    await chrome.sidePanel.open({ windowId: tab.windowId })
  } catch (error) {
    console.error("Failed to open side panel:", error)
  }
})

