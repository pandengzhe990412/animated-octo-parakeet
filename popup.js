// 打开控制台
document.getElementById('openDash').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

// 在线下载
document.getElementById('downloadOnline').addEventListener('click', () => {
    const urlInput = document.getElementById('videoUrl');
    const url = urlInput.value.trim();

    if (!url) {
        // 没有输入链接，直接打开下载网站
        chrome.tabs.create({ url: 'https://ytdown.to' });
        return;
    }

    // 提取视频 ID
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1].split('&')[0];
    }

    if (videoId) {
        // 跳转到 ytdown.to 并自动填入链接
        chrome.tabs.create({ url: `https://ytdown.to/?url=${encodeURIComponent(url)}` });
    } else {
        // 无法解析视频 ID，直接打开网站
        chrome.tabs.create({ url: 'https://ytdown.to' });
    }
});

// 自动填充当前页面的 URL（如果是 YouTube）
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0]?.url || '';
    if (currentUrl.includes('youtube.com/watch') ||
        currentUrl.includes('youtu.be/') ||
        currentUrl.includes('youtube.com/shorts/')) {
        document.getElementById('videoUrl').value = currentUrl;
    }
});