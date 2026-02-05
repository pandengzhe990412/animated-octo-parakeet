// ============================================
// 对标账号监控 - Monitor.js
// ============================================

// === 全局状态 ===
let watchlistChannels = [];
let monitorConfig = {
    enabled: false,
    intervalMin: 60,
    notifyEnabled: true,
    fetchTopN: 10
};
let monitorLastResult = {
    newVideos: [],
    alerts: [],
    timestamp: null
};

let isMonitorNowRunning = false;

// === DOM 辅助函数 ===
const $ = (id) => {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`[Monitor] Element not found: ${id}`);
    }
    return el;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// === 初始化 ===
window.onload = async function() {
    initEventListeners();
    await loadData();
    renderWatchlist();
    renderResultTables();
    updateStatusBar();
};

// === 加载数据 ===
async function loadData() {
    const result = await chrome.storage.local.get([
        'watchlistChannels',
        'monitorConfig',
        'monitorLastResult'
    ]);

    watchlistChannels = result.watchlistChannels || [];
    monitorConfig = result.monitorConfig || {
        enabled: false,
        intervalMin: 60,
        notifyEnabled: true,
        fetchTopN: 10
    };
    monitorLastResult = result.monitorLastResult || {
        newVideos: [],
        alerts: [],
        timestamp: null
    };

    // 更新 UI
    $('monitorEnabled').checked = monitorConfig.enabled;
    $('intervalSelect').value = monitorConfig.intervalMin;
    $('fetchTopN').value = monitorConfig.fetchTopN;
    $('notifyEnabled').checked = monitorConfig.notifyEnabled;
    updateMonitorToggleLabel();
}

// === 初始化事件监听 ===
function initEventListeners() {
    // 添加频道按钮
    $('addChannelsBtn').addEventListener('click', addChannels);

    // 清空按钮
    $('clearAllBtn').addEventListener('click', async () => {
        if (confirm('确定要清空所有监控频道吗？')) {
            watchlistChannels = [];
            await saveData();
            renderWatchlist();
            updateStatusBar();
            log('已清空所有监控频道', 'warn');
        }
    });

    // 清空新增视频按钮
    $('clearNewVideosBtn').addEventListener('click', async () => {
        if (confirm('确定要清空新增视频列表吗？')) {
            monitorLastResult.newVideos = [];
            await chrome.storage.local.set({ monitorLastResult });
            renderResultTables();
            updateStatusBar();
            log('已清空新增视频列表', 'info');
        }
    });

    // 清空预警视频按钮
    $('clearAlertsBtn').addEventListener('click', async () => {
        if (confirm('确定要清空预警视频列表吗？')) {
            monitorLastResult.alerts = [];
            await chrome.storage.local.set({ monitorLastResult });
            renderResultTables();
            updateStatusBar();
            log('已清空预警视频列表', 'info');
        }
    });

    // 使用事件委托处理删除按钮
    $('watchlistContainer').addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-danger') && e.target.classList.contains('btn-sm')) {
            const channelId = e.target.dataset.channelId;
            if (channelId && confirm('确定要删除此频道吗？')) {
                await removeChannel(channelId);
            }
        }
    });

    // 监控开关
    $('monitorEnabled').addEventListener('change', async (e) => {
        monitorConfig.enabled = e.target.checked;
        updateMonitorToggleLabel();
        await updateMonitorAlarm();
        await saveData();
        updateStatusBar();
        log(`定时监控已${monitorConfig.enabled ? '启用' : '关闭'}`, 'info');
    });

    // 检查频率
    $('intervalSelect').addEventListener('change', async (e) => {
        monitorConfig.intervalMin = parseInt(e.target.value);
        await updateMonitorAlarm();
        await saveData();
        log(`检查频率已更新为 ${monitorConfig.intervalMin} 分钟`, 'info');
    });

    // 获取视频数
    $('fetchTopN').addEventListener('change', async (e) => {
        monitorConfig.fetchTopN = parseInt(e.target.value);
        await saveData();
    });

    // 通知开关
    $('notifyEnabled').addEventListener('change', async (e) => {
        monitorConfig.notifyEnabled = e.target.checked;
        await saveData();
    });

    // 立即检查按钮
    $('runNowBtn').addEventListener('click', runMonitorNow);

    const selfTestBtn = $('selfTestBtn');
    if (selfTestBtn) {
        selfTestBtn.addEventListener('click', runSelfTest);
    }

    // 导出按钮
    $('exportNewBtn').addEventListener('click', () => exportToExcel(monitorLastResult.newVideos, '监控新增视频'));
    $('exportAlertBtn').addEventListener('click', () => exportToExcel(monitorLastResult.alerts, '监控预警视频'));
}

// === 添加频道 ===
async function addChannels() {
    const input = $('channelInput');
    const groupInput = $('groupInput');
    const addBtn = $('addChannelsBtn');

    if (!input || !addBtn) {
        log('❌ 找不到输入元素', 'error');
        return;
    }

    const inputValue = input.value.trim();
    const group = groupInput?.value?.trim() || '';

    if (!inputValue) {
        alert('请输入频道信息');
        return;
    }

    // 禁用按钮，显示加载状态
    const originalText = addBtn.textContent;
    addBtn.disabled = true;
    addBtn.textContent = '⏳ 添加中...';

    const lines = inputValue.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lines.length === 0) {
        addBtn.disabled = false;
        addBtn.textContent = originalText;
        alert('请输入有效的频道信息');
        return;
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const line of lines) {
        try {
            // 基本格式验证
            if (line.length > 200) {
                log(`跳过过长的行: ${line.substring(0, 50)}...`, 'warn');
                skippedCount++;
                continue;
            }

            const channelId = await resolveChannelId(line);

            // 检查是否已存在
            if (watchlistChannels.some(c => c.channelId === channelId)) {
                log(`频道已存在: ${channelId}`, 'warn');
                skippedCount++;
                continue;
            }

            // 获取频道标题（异步，不阻塞添加）
            fetchChannelTitle(channelId).then(title => {
                const channel = watchlistChannels.find(c => c.channelId === channelId);
                if (channel) {
                    channel.title = title;
                    saveData();
                    renderWatchlist();
                }
            }).catch(err => {
                // 静默失败，不影响添加
                console.warn('Failed to fetch channel title:', err);
            });

            watchlistChannels.push({
                channelId,
                handleOrUrl: line,
                title: '',  // 稍后异步填充
                group: group || '',
                addedAt: new Date().toISOString(),
                lastCheckedAt: null,
                lastSeenVideoIds: []
            });

            addedCount++;
            log(`添加频道: ${channelId}`, 'success');

        } catch (e) {
            log(`跳过无效行: ${line} - ${e.message}`, 'error');
            skippedCount++;
        }
    }

    // 清空输入
    if (input) input.value = '';
    if (groupInput) groupInput.value = '';

    await saveData();
    renderWatchlist();
    updateStatusBar();

    // 恢复按钮状态
    addBtn.disabled = false;
    addBtn.textContent = originalText;

    log(`添加完成: ${addedCount} 个成功, ${skippedCount} 个跳过`, 'info');

    // 显示成功提示
    if (addedCount > 0) {
        showNotification(`成功添加 ${addedCount} 个频道`, 'success');
    }
}

// === 解析 channelId ===
async function resolveChannelId(input) {
    input = input.trim();

    // 已经是 channelId (UC开头)
    if (/^UC[A-Za-z0-9_-]{22}$/.test(input)) {
        return input;
    }

    // YouTube URL
    const urlPattern = /youtube\.com\/(@[A-Za-z0-9_.-]+|channel\/[A-Za-z0-9_-]+|user\/[A-Za-z0-9_-]+|c\/[A-Za-z0-9_.-]+)/;
    const match = input.match(urlPattern);

    if (match) {
        const identifier = match[1];

        // Handle (@username)
        if (identifier.startsWith('@')) {
            return await fetchChannelIdFromPage(input);
        }

        // Channel URL
        if (identifier.startsWith('channel/')) {
            const channelId = identifier.split('/')[1];
            if (channelId.startsWith('UC')) {
                return channelId;
            }
            return await fetchChannelIdFromPage(input);
        }

        // Custom URL or User URL
        return await fetchChannelIdFromPage(input);
    }

    throw new Error('无法识别的频道格式');
}

// === 从频道页获取 channelId ===
async function fetchChannelIdFromPage(url) {
    try {
        // 如果是完整 URL，直接使用；否则添加域名
        let fullUrl = url;
        if (!url.startsWith('http')) {
            fullUrl = `https://www.youtube.com/${url}`;
        }

        const response = await fetch(fullUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();

        // 尝试从多种可能的位置提取 channelId
        const patterns = [
            /"channelId":"(UC[A-Za-z0-9_-]{22})"/,
            /"externalId":"(UC[A-Za-z0-9_-]{22})"/,
            /<meta itemprop="channelId" content="(UC[A-Za-z0-9_-]{22})">/,
            /youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        throw new Error('无法从页面提取 channelId');

    } catch (e) {
        throw new Error(`获取频道失败: ${e.message}`);
    }
}

// === 获取频道标题 ===
async function fetchChannelTitle(channelId) {
    try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const response = await fetch(feedUrl, { cache: 'no-store' });
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const author = xmlDoc.querySelector('author name');
        return author ? author.textContent : '';

    } catch (e) {
        return '';
    }
}

// === 删除频道 ===
async function removeChannel(channelId) {
    watchlistChannels = watchlistChannels.filter(c => c.channelId !== channelId);
    await saveData();
    renderWatchlist();
    updateStatusBar();
    log(`删除频道: ${channelId}`, 'info');
}

// === 渲染 Watchlist ===
function renderWatchlist() {
    const container = $('watchlistContainer');

    if (watchlistChannels.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无监控频道</div>';
        return;
    }

    container.innerHTML = watchlistChannels.map(channel => `
        <div class="watchlist-item">
            <div class="watchlist-item-info">
                <div class="watchlist-item-title">${escapeHtml(channel.title || channel.channelId)}</div>
                <div class="watchlist-item-id">${channel.channelId}</div>
                <div class="watchlist-item-meta">
                    ${channel.group ? `分组: ${escapeHtml(channel.group)}` : ''}
                    ${channel.lastCheckedAt ? ` | 检查于: ${formatTime(channel.lastCheckedAt)}` : ''}
                </div>
            </div>
            <div class="watchlist-item-actions">
                <button class="btn-danger btn-sm" data-channel-id="${escapeHtml(channel.channelId)}">删除</button>
            </div>
        </div>
    `).join('');
}

// === 更新监控开关标签 ===
function updateMonitorToggleLabel() {
    $('monitorToggleLabel').textContent = monitorConfig.enabled ? '开启' : '关闭';
}

// === 更新状态栏 ===
async function updateStatusBar() {
    // 监控状态
    const statusEl = $('monitorStatus');
    statusEl.textContent = monitorConfig.enabled ? '运行中' : '未启用';
    statusEl.className = 'status-value ' + (monitorConfig.enabled ? 'active' : 'inactive');

    // 上次检查时间
    const lastTimeEl = $('lastCheckTime');
    if (monitorLastResult.timestamp) {
        lastTimeEl.textContent = formatTime(monitorLastResult.timestamp);
    } else {
        lastTimeEl.textContent = '从未';
    }

    // 频道数
    $('channelCount').textContent = watchlistChannels.length;
}

// === 更新监控进度 ===
function updateMonitorProgress(current, total, message) {
    let progressContainer = $('monitorProgressContainer');

    if (!progressContainer) {
        // 创建进度条容器（如果不存在）
        const container = document.createElement('div');
        container.id = 'monitorProgressContainer';
        container.style.cssText = 'margin: 10px 0; padding: 10px; background: var(--bg-input); border-radius: 4px; display: none;';
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span id="monitorProgressMessage" style="font-size: 12px; color: var(--text-muted);"></span>
                <span id="monitorProgressText" style="font-size: 12px; color: var(--text-muted);"></span>
            </div>
            <div style="background: #333; height: 6px; border-radius: 3px; overflow: hidden;">
                <div id="monitorProgressBar" style="background: var(--accent-green); height: 100%; width: 0%; transition: width 0.3s;"></div>
            </div>
        `;

        // 插入到状态栏后面
        const statusBar = document.querySelector('.status-bar');
        if (statusBar && statusBar.parentNode) {
            statusBar.parentNode.insertBefore(container, statusBar.nextSibling);
        } else {
            // 如果找不到状态栏，追加到 body
            document.body.appendChild(container);
        }
    }

    // 重新获取引用（确保是最新的）
    progressContainer = $('monitorProgressContainer');
    const progressBar = $('monitorProgressBar');
    const progressText = $('monitorProgressText');
    const progressMessage = $('monitorProgressMessage');

    // 显示进度
    if (progressContainer) {
        progressContainer.style.display = 'block';

        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressText) progressText.textContent = `${current}/${total} (${percent}%)`;
        if (progressMessage) progressMessage.textContent = message;
    }
}

// === 隐藏监控进度 ===
function hideMonitorProgress() {
    const progressContainer = $('monitorProgressContainer');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

// === 更新定时任务 ===
async function updateMonitorAlarm() {
    await chrome.runtime.sendMessage({
        action: 'updateMonitorAlarm',
        config: monitorConfig
    });
}

// === 立即执行检查 ===
async function runMonitorNow() {
    if (isMonitorNowRunning) return;
    if (watchlistChannels.length === 0) {
        alert('请先添加监控频道');
        return;
    }

    isMonitorNowRunning = true;

    log('开始检查新增视频...', 'info');
    $('runNowBtn').disabled = true;
    $('runNowBtn').textContent = '⏳ 检查中...';

    try {
        const newVideos = [];
        const alerts = [];
        const totalChannels = watchlistChannels.length;

        // 更新进度显示
        updateMonitorProgress(0, totalChannels, '初始化...');

        for (let i = 0; i < totalChannels; i++) {
            const channel = watchlistChannels[i];
            const progress = Math.round(((i + 1) / totalChannels) * 100);
            updateMonitorProgress(i + 1, totalChannels, `检查频道: ${channel.title || channel.channelId}`);

            log(`[${i + 1}/${totalChannels}] 检查频道: ${channel.title || channel.channelId}`, 'info');

            try {
                // 获取最新视频
                log(`   → 正在获取视频列表...`, 'info');
                const latestVideos = await fetchChannelVideos(channel.channelId, monitorConfig.fetchTopN);
                log(`   → 获取到 ${latestVideos.length} 个视频`, 'info');

                // Diff 新视频
                const diffed = diffNewVideos(channel, latestVideos);
                log(`   → 发现 ${diffed.length} 条新视频`, diffed.length > 0 ? 'success' : 'info');

                if (diffed.length > 0) {
                    // 获取详细信息并评分
                    log(`   → 正在获取视频详情...`, 'info');
                    const enrichedVideos = await enrichVideosWithDetails(diffed);

                    for (const video of enrichedVideos) {
                        // 添加频道信息
                        video.group = channel.group;
                        video.channelId = channel.channelId;
                        video.channelTitle = channel.title || channel.channelId;

                        newVideos.push(video);

                        // 检查预警规则
                        if (checkAlertRules(video)) {
                            alerts.push(video);
                            log(`   🚨 预警: ${video['视频标题']} (Score: ${video['Score']})`, 'warn');
                        }
                    }
                }

                // 更新 lastSeenVideoIds
                channel.lastSeenVideoIds = latestVideos.map(v => v.videoId).slice(0, 200);
                channel.lastCheckedAt = new Date().toISOString();

            } catch (e) {
                log(`   ✗ 检查失败: ${e.message}`, 'error');
            }
        }

        await saveData();

        // 保存结果
        monitorLastResult = {
            newVideos,
            alerts,
            timestamp: new Date().toISOString()
        };

        await chrome.storage.local.set({ monitorLastResult });

        // 渲染结果
        renderResultTables();
        updateStatusBar();

        // 隐藏进度
        hideMonitorProgress();

        log(`✓ 检查完成: ${newVideos.length} 条新增, ${alerts.length} 条预警`, 'success');

    } catch (e) {
        log(`检查失败: ${e.message}`, 'error');
    } finally {
        $('runNowBtn').disabled = false;
        $('runNowBtn').textContent = '▶️ 立即检查新增';
        isMonitorNowRunning = false;
    }
}

// === 获取频道视频（通过 YouTube Feeds）===

async function runSelfTest() {
    const btn = $('selfTestBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Self Test (running...)';
    }

    const start = Date.now();
    log('Self test: starting sleep check...', 'info');

    try {
        await sleep(300);
        const elapsed = Date.now() - start;
        log(`Self test passed: sleep 300ms (actual ${elapsed}ms)`, 'success');
    } catch (e) {
        log(`Self test failed: ${e.message}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Self Test (sleep)';
        }
    }
}

async function fetchChannelVideos(channelId, topN) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    const response = await fetch(feedUrl, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const entries = xmlDoc.querySelectorAll('entry');
    const videos = [];

    for (let i = 0; i < Math.min(entries.length, topN); i++) {
        const entry = entries[i];
        // CSS namespace selector needs escaping: "yt\:videoId"
        const videoId = entry.querySelector('yt\\:videoId, videoId')?.textContent || '';
        const title = entry.querySelector('title')?.textContent || '';
        const published = entry.querySelector('published')?.textContent || '';

        videos.push({
            videoId,
            title,
            publishedAt: published,
            url: `https://www.youtube.com/watch?v=${videoId}`
        });
    }

    return videos;
}

// === Diff 新视频 ===
function diffNewVideos(channel, latestVideos) {
    const seenIds = new Set(channel.lastSeenVideoIds || []);
    return latestVideos.filter(v => !seenIds.has(v.videoId));
}

// === 获取视频详细信息 ===
async function enrichVideosWithDetails(videos) {
    // 批量处理视频，避免同时创建太多 tab
    const batchSize = 3;
    const enrichedData = [];

    for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async video => {
            try {
                // 方法1: 使用 noxembed API（最快最可靠）
                let details = await fetchVideoDetailsNoxembed(video.videoId);

                // 方法2: 如果方法1失败，使用页面抓取
                if (!details || details.views === '0') {
                    details = await fetchVideoDetailsFromPage(video.url, 1);
                }

                // 方法3: 如果还是失败，使用基础数据
                if (!details || details.views === '0') {
                    log(`${video.videoId} 无法获取详细数据，使用基础数据`, 'warn');
                    const publishedTime = new Date(video.publishedAt);
                    const daysSincePublish = Math.max(1, Math.floor((Date.now() - publishedTime.getTime()) / (1000 * 60 * 60 * 24)));

                    return {
                        ...video,
                        '视频标题': video.title,
                        '频道名': '',
                        '播放量': '0',
                        '发布时间': `${daysSincePublish}天前`,
                        '时长': '0:00',
                        '点赞数': 0,
                        '评论数': 0,
                        '封面图': `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
                    '链接': video.url,
                    '分组': '',
                    _daysSincePublish: daysSincePublish,
                    _estimatedViews: 0
                };
            }

            return {
                ...video,
                '视频标题': video.title,
                '频道名': details.channelName || '',
                '播放量': details.views || '0',
                '发布时间': details.publishedAt || video.publishedAt,
                '时长': details.duration || '0:00',
                '点赞数': details.likes || 0,
                '评论数': details.comments || 0,
                '封面图': `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
                '链接': video.url,
                '分组': '',
                _daysSincePublish: details.daysSincePublish || 1,
                _estimatedViews: 0
            };
            } catch (error) {
                // 单个视频出错时，返回基础数据而不是让整个批次失败
                log(`处理视频 ${video.videoId} 时出错: ${error.message}`, 'warn');
                const publishedTime = new Date(video.publishedAt);
                const daysSincePublish = Math.max(1, Math.floor((Date.now() - publishedTime.getTime()) / (1000 * 60 * 60 * 24)));

                return {
                    ...video,
                    '视频标题': video.title,
                    '频道名': '',
                    '播放量': '0',
                    '发布时间': `${daysSincePublish}天前`,
                    '时长': '0:00',
                    '点赞数': 0,
                    '评论数': 0,
                    '封面图': `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
                    '链接': video.url,
                    '分组': '',
                    _daysSincePublish: daysSincePublish,
                    _estimatedViews: 0
                };
            }
        }));

        enrichedData.push(...batchResults);

        // 批次间短暂延迟，避免请求过快
        if (i + batchSize < videos.length) {
            await sleep(500);
        }
    }

    return enrichedData;
}

// === 使用 noxembed API 获取视频信息（最快最可靠）===
async function fetchVideoDetailsNoxembed(videoId) {
    try {
        const noxembedUrl = `https://www.youtube.com/noxembed?video_id=${videoId}&format=json`;

        const response = await fetch(noxembedUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        // 解析 noxembed 返回的数据
        if (!data || !data.title) {
            return null;
        }

        // 解析时长（noxembed 返回秒数）
        let duration = '0:00';
        if (data.duration) {
            const minutes = Math.floor(data.duration / 60);
            const seconds = data.duration % 60;
            duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // 解析发布时间（noxembed 返回 Unix 时间戳）
        let daysSincePublish = 1;
        let publishedAt = '';
        if (data.upload_date) {
            // upload_date 格式: "YYYYMMDD"
            const year = parseInt(data.upload_date.substring(0, 4));
            const month = parseInt(data.upload_date.substring(4, 6)) - 1;
            const day = parseInt(data.upload_date.substring(6, 8));
            const uploadDate = new Date(year, month, day);
            daysSincePublish = Math.max(1, Math.floor((Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24)));
            publishedAt = `${daysSincePublish}天前`;
        }

        return {
            views: data.view_count ? formatNumber(data.view_count) : '0',
            likes: 0, // noxembed 不提供点赞数
            comments: 0, // noxembed 不提供评论数
            duration: duration,
            publishedAt: publishedAt,
            daysSincePublish: daysSincePublish,
            channelName: data.author_name || ''
        };
    } catch (e) {
        // noxembed 请求失败，返回 null 让后续方法尝试
        return null;
    }
}

// === 从视频页面获取详细信息 ===
async function fetchVideoDetailsFromPage(videoUrl, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await fetchVideoDetailsFromPageOnce(videoUrl);

            // 检查是否获取到有效数据
            if (result && result.views !== '0') {
                return result;
            }

            // 如果没有获取到有效数据，重试
            if (attempt < retries) {
                await sleep(1000 * (attempt + 1)); // 递增延迟
                continue;
            }

            return result;
        } catch (e) {
            if (attempt < retries) {
                await sleep(1000 * (attempt + 1));
                continue;
            }
            throw e;
        }
    }

    // 所有重试都失败，返回默认数据
    return {
        views: '0',
        likes: 0,
        comments: 0,
        duration: '0:00',
        publishedAt: '',
        daysSincePublish: 1,
        channelName: ''
    };
}

// === 单次尝试获取视频详情 ===
async function fetchVideoDetailsFromPageOnce(videoUrl) {
    return new Promise((resolve, reject) => {
        // 创建临时 tab
        chrome.tabs.create({ url: videoUrl, active: false }, async (tab) => {
            try {
                // 等待页面加载
                await waitForTabLoad(tab.id, 15000);

                // 额外等待确保数据加载完成
                await sleep(2000);

                // 注入脚本来获取数据
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: scrapeVideoPageData
                });

                // 关闭 tab
                chrome.tabs.remove(tab.id);

                if (results && results[0] && results[0].result) {
                    resolve(results[0].result);
                } else {
                    reject(new Error('Failed to scrape video data'));
                }
            } catch (e) {
                // 确保 tab 被关闭
                try { chrome.tabs.remove(tab.id); } catch {}
                reject(e);
            }
        });
    });
}

// === 等待 tab 加载完成 ===
function waitForTabLoad(tabId, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkLoaded = () => {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (tab.status === 'complete') {
                    resolve();
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    reject(new Error('Tab load timeout'));
                    return;
                }

                setTimeout(checkLoaded, 100);
            });
        };

        checkLoaded();
    });
}

// === 在视频页面中执行的数据抓取函数 ===
function scrapeVideoPageData() {
    try {
        // 多种选择器策略，确保能获取到数据
        let views = '0';
        let likes = 0;
        let comments = 0;
        let duration = '0:00';
        let publishedAt = '';
        let daysSincePublish = 1;
        let channelName = '';

        // 1. 获取观看次数 (尝试多个选择器)
        const viewSelectors = [
            '#count yt-formatted-string',  // 新版 YouTube
            '#view-count yt-formatted-string',
            '.view-count',
            'yt-formatted-string#view-count',
            '#info-text #count',
            '#container .view-count'
        ];

        for (const selector of viewSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const text = el.textContent.trim();
                // 过滤掉非数字内容
                if (/\d/.test(text)) {
                    views = text.replace(/,/g, '').replace(/次观看|views|Views/g, '').trim();
                    break;
                }
            }
        }

        // 2. 获取点赞数 (YouTube 现在隐藏了精确的点赞数)
        const likeSelectors = [
            'segmented-like-dislike-button-view-model #segmented-like-dislike-button-view-model button #text',
            'ytd-toggle-button-renderer #text',
            '.like-button-renderer-like-button-unclicked',
            'yt-formatted-string.like-button-renderer-like-button-unclicked'
        ];

        for (const selector of likeSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const text = el.textContent.trim();
                // 解析点赞数
                likes = parseViewCount(text);
                if (likes > 0) break;
            }
        }

        // 3. 获取评论数
        const commentSelectors = [
            '#comments #count yt-formatted-string',
            'ytd-comments-header-renderer #count',
            '.comment-count',
            '#count yt-formatted-string.ytd-comments-header-renderer'
        ];

        for (const selector of commentSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const text = el.textContent.trim();
                comments = parseViewCount(text);
                if (comments > 0) break;
            }
        }

        // 4. 获取时长 (从视频播放器)
        const durationSelectors = [
            '.ytp-time-duration',
            '#movie_player .ytp-time-duration',
            'ytd-playlist-panel-video-renderer #text',
            '.ytp-time-current'
        ];

        for (const selector of durationSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const text = el.textContent.trim();
                if (/^\d+:\d+/.test(text)) {
                    duration = text;
                    break;
                }
            }
        }

        // 5. 获取发布时间
        const dateSelectors = [
            'yt-formatted-string.ytd-watch-info-text',
            '#info-strings yt-formatted-string',
            'ytd-watch-flexy #info-strings',
            '#info-text yt-formatted-string'
        ];

        for (const selector of dateSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                publishedAt = el.textContent.trim();
                daysSincePublish = parseDateStr(publishedAt) || 1;
                break;
            }
        }

        // 6. 获取频道名
        const channelSelectors = [
            '#channel-name yt-formatted-string a',
            'ytd-watch-metadata #channel-name',
            '#owner #channel-name a',
            '.yt-simple-endpoint'
        ];

        for (const selector of channelSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const text = el.textContent.trim();
                if (text && text.length > 0 && text.length < 100) {
                    channelName = text;
                    break;
                }
            }
        }

        // 7. 尝试从页面数据中获取更准确的信息
        // YouTube 通常在 ytInitialData 中存储数据
        try {
            const ytDataScript = document.getElementById('data');
            if (ytDataScript) {
                const data = JSON.parse(ytDataScript.textContent);
                // 尝试从数据中提取信息
                // 这里可以根据需要添加更多解析逻辑
            }
        } catch (e) {
            // 忽略解析错误
        }

        return {
            views,
            likes,
            comments,
            duration,
            publishedAt,
            daysSincePublish,
            channelName
        };
    } catch (e) {
        return {
            views: '0',
            likes: 0,
            comments: 0,
            duration: '0:00',
            publishedAt: '',
            daysSincePublish: 1,
            channelName: ''
        };
    }
}

// === 检查预警规则 ===
function checkAlertRules(video) {
    // 使用真实的发布天数（如果可用）
    const days = video._daysSincePublish || parseDateStr(video['发布时间']) || 1;
    const views = parseViewCount(video['播放量']) || video._estimatedViews || 0;

    // 预警条件：
    // 1. 发布 <= 48 小时（2天）且有一定播放潜力
    const isRecent = days <= 2;
    const hasPotential = views >= 1000;  // 至少 1000 播放

    return isRecent && hasPotential;
}

// === 渲染结果表格 ===
function renderResultTables() {
    // 新增视频
    renderTable('newVideoBody', monitorLastResult.newVideos, 'newVideoCount');

    // 预警视频
    renderTable('alertVideoBody', monitorLastResult.alerts, 'alertVideoCount');
}

// === 渲染单个表格 ===
function renderTable(tbodyId, data, countId) {
    const tbody = $(tbodyId);
    const countEl = $(countId);

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无数据</td></tr>';
        countEl.textContent = '（0 条）';
        return;
    }

    // 先计算 Score
    calculateScores(data);

    countEl.textContent = `（${data.length} 条）`;

    tbody.innerHTML = data.map(item => {
        const score = item['Score'] || 0;
        const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';
        const reason = item['Reason'] || '';
        const channelTitle = item.channelTitle || item['频道名'] || item['分组'] || '-';
        const published = item.publishedAt || item['发布时间'] || '-';
        const link = item['链接'] || '';
        const safeLink = escapeHtmlAttribute(link);

        return `
            <tr>
                <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(channelTitle)}</td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item['视频标题'])}">${escapeHtml(item['视频标题'])}</td>
                <td>${published}</td>
                <td><span class="score-badge ${scoreClass}">${score}</span></td>
                <td style="max-width: 200px; font-size: 11px; color: #888;" title="${escapeHtml(reason)}">${escapeHtml(reason.substring(0, 35))}${reason.length > 35 ? '...' : ''}</td>
                <td>${link ? `<a href="${safeLink}" target="_blank">打开</a>` : ''}</td>
            </tr>
        `;
    }).join('');
}

// === 保存数据 ===
async function saveData() {
    await chrome.storage.local.set({
        watchlistChannels,
        monitorConfig,
        monitorLastResult
    });
}

// === 通知函数 ===
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#e53935' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    // 添加动画样式
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// === 日志函数 ===
function log(msg, type = 'info') {
    const logArea = $('logArea');
    if (!logArea) return;

    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    let colorClass = 'log-info';
    if (type === 'success') colorClass = 'log-success';
    else if (type === 'warn') colorClass = 'log-warn';
    else if (type === 'error') colorClass = 'log-error';

    // 创建时间跨度
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${time}]`;
    entry.appendChild(timeSpan);

    // 创建消息跨度（安全，使用 textContent）
    const msgSpan = document.createElement('span');
    msgSpan.className = colorClass;
    msgSpan.textContent = msg;
    entry.appendChild(msgSpan);

    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
}

// === 格式化时间 ===
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);

    if (diff < 1) return '刚刚';
    if (diff < 60) return `${diff} 分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)} 小时前`;
    return `${Math.floor(diff / 1440)} 天前`;
}

// === HTML 转义 ===
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === HTML 属性转义（用于 URL 等）===
function escapeHtmlAttribute(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ============================================
// 复用 dashboard.js 的工具函数
// ============================================

function parseViewCount(str) {
    if (!str) return 0;
    let n = parseFloat(str.replace(/,/g, ''));
    if (str.includes('万')) n *= 10000;
    if (str.includes('亿')) n *= 100000000;
    if (str.toUpperCase().includes('K')) n *= 1000;
    if (str.toUpperCase().includes('M')) n *= 1000000;
    return isNaN(n) ? 0 : n;
}

function parseDuration(str) {
    if (!str) return 0;
    const p = str.split(':').map(Number);
    if (p.length === 3) return p[0]*60 + p[1];
    if (p.length === 2) return p[0];
    return 0;
}

function parseDateStr(str) {
    if (!str) return 9999;
    if (str.match(/hour|minute|小时|分钟|Just/i)) return 0;
    if (str.match(/yesterday|昨天/i)) return 1;
    let n = parseInt(str.match(/\d+/));
    if (isNaN(n)) return 9999;
    if (str.match(/day|天/)) return n;
    if (str.match(/week|周/)) return n * 7;
    if (str.match(/month|月/)) return n * 30;
    if (str.match(/year|年/)) return n * 365;
    return 9999;
}

function formatNumber(num) {
    if (num >= 100000000) {
        return (num / 100000000).toFixed(1) + '亿';
    } else if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// === Score 计算函数（复用 dashboard.js）===
function calculateScores(resultItems) {
    if (resultItems.length === 0) return;

    const viewsPerDayList = [];
    const likeRateList = [];
    const commentRateList = [];

    resultItems.forEach(item => {
        const views = parseViewCount(item['播放量']) || item._estimatedViews || 0;
        const days = item._daysSincePublish || parseDateStr(item['发布时间']) || 1;
        const viewsPerDay = views / Math.max(1, days);

        const likes = item['点赞数'] || Math.floor(views * 0.02);
        const comments = item['评论数'] || Math.floor(views * 0.001);

        const likeRate = views > 0 ? (likes / views) * 100 : 0;
        const commentRate = views > 0 ? (comments / views) * 100 : 0;

        viewsPerDayList.push(viewsPerDay);
        likeRateList.push(likeRate);
        commentRateList.push(commentRate);
    });

    const vpdMin = Math.min(...viewsPerDayList) || 0;
    const vpdMax = Math.max(...viewsPerDayList) || 1;
    const lrMin = Math.min(...likeRateList) || 0;
    const lrMax = Math.max(...likeRateList) || 1;
    const crMin = Math.min(...commentRateList) || 0;
    const crMax = Math.max(...commentRateList) || 1;

    const normalize = (val, min, max) => {
        if (max === min) return 0.5;
        return (val - min) / (max - min);
    };

    resultItems.forEach(item => {
        const views = parseViewCount(item['播放量']) || item._estimatedViews || 0;
        const days = item._daysSincePublish || parseDateStr(item['发布时间']) || 1;
        const viewsPerDay = views / Math.max(1, days);

        const likes = item['点赞数'] || Math.floor(views * 0.02);
        const comments = item['评论数'] || Math.floor(views * 0.001);

        const likeRate = views > 0 ? (likes / views) * 100 : 0;
        const commentRate = views > 0 ? (comments / views) * 100 : 0;

        const normVpd = normalize(viewsPerDay, vpdMin, vpdMax);
        const normLr = normalize(likeRate, lrMin, lrMax);
        const normCr = normalize(commentRate, crMin, crMax);

        const rawScore = normVpd * 55 + normLr * 25 + normCr * 20;
        item['Score'] = Math.round(Math.max(0, Math.min(100, rawScore)));
        item['viewsPerDay'] = Math.round(viewsPerDay);
        item['likeRate'] = likeRate.toFixed(2);
        item['commentRate'] = commentRate.toFixed(2);

        item['Reason'] = generateReason(views, days, viewsPerDay, likeRate, commentRate);
    });
}

function generateReason(views, days, viewsPerDay, likeRate, commentRate) {
    const parts = [];

    const dayDesc = days === 0 ? '今天' : days === 1 ? '昨天' : `${days}天前`;

    if (views >= 1000000) {
        parts.push(`${dayDesc}${(views/10000).toFixed(0)}万播放`);
    } else if (views >= 10000) {
        parts.push(`${dayDesc}${(views/10000).toFixed(1)}万播放`);
    } else if (views >= 1000) {
        parts.push(`${dayDesc}${views}播放`);
    } else {
        parts.push(`${dayDesc}播放${views}`);
    }

    if (viewsPerDay >= 50000) {
        parts.push('增速极高');
    } else if (viewsPerDay >= 10000) {
        parts.push('增速高');
    } else if (viewsPerDay >= 3000) {
        parts.push('增速中等');
    } else if (viewsPerDay >= 500) {
        parts.push('增速稳定');
    }

    if (likeRate >= 5) {
        parts.push(`点赞率${likeRate.toFixed(1)}%极高`);
    } else if (likeRate >= 3) {
        parts.push(`点赞率${likeRate.toFixed(1)}%偏高`);
    } else if (likeRate >= 1.5) {
        parts.push(`点赞率${likeRate.toFixed(1)}%正常`);
    }

    if (commentRate >= 1) {
        parts.push(`评论${commentRate.toFixed(1)}%`);
    } else if (commentRate >= 0.5) {
        parts.push('评论活跃');
    }

    return parts.join('，') + '。';
}

// === 导出函数（复用 dashboard.js 逻辑）===
function exportToExcel(data, filename) {
    if (!data || data.length === 0) {
        alert('没有可导出的数据');
        return;
    }

    // 确保所有数据都有评分
    calculateScores(data);

    // 重新组织数据，确保字段顺序完整
    const exportData = data.map(item => ({
        '分组': item.group || item['分组'] || '',
        '频道ID': item.channelId || '',
        '频道名': item.channelTitle || item['频道名'] || '',
        '视频标题': item['视频标题'] || '',
        '发布时间': item.publishedAt || item['发布时间'] || '',
        '时长': item['时长'] || '',
        '播放量': item['播放量'] || '',
        '点赞数': item['点赞数'] || '0',
        '评论数': item['评论数'] || '0',
        '点赞率(%)': item['likeRate'] || '0',
        '评论率(%)': item['commentRate'] || '0',
        '日均播放': item['viewsPerDay'] || '0',
        'Score': item['Score'] || '0',
        'Reason': item['Reason'] || '',
        '链接': item['链接'] || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    ws['!cols'] = [
        { wch: 12 },  // 分组
        { wch: 25 },  // 频道ID
        { wch: 20 },  // 频道名
        { wch: 35 },  // 视频标题
        { wch: 15 },  // 发布时间
        { wch: 10 },  // 时长
        { wch: 12 },  // 播放量
        { wch: 12 },  // 点赞数
        { wch: 12 },  // 评论数
        { wch: 12 },  // 点赞率
        { wch: 12 },  // 评论率
        { wch: 15 },  // 日均播放
        { wch: 10 },  // Score
        { wch: 50 },  // Reason
        { wch: 40 }   // 链接
    ];

    XLSX.writeFile(wb, `${filename}_${new Date().getTime()}.xlsx`);
    log(`导出成功: ${data.length} 条数据`, 'success');
}
