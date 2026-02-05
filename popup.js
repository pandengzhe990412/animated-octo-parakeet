document.getElementById('openDash').addEventListener('click', () => {
    // 打开扩展内的 dashboard.html 页面
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});