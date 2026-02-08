// ============================================
// 油管挖掘机 Pro - Background Service Worker
// 用于定时监控任务和通知
// ============================================

let isMonitorRunning = false;
const MONITOR_CONCURRENCY = 4;

// === 监听 Alarm 触发 ===
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'competitor_monitor') {
        console.log('[Monitor] Alarm triggered, running check...');
        await runMonitorCheck();
    }
});

// === 启动时恢复定时任务 ===
chrome.runtime.onStartup.addListener(async () => {
    console.log('[Background] Extension started');
    await restoreMonitorAlarm();
});

// === 扩展安装/更新时 ===
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Background] Extension installed/updated:', details.reason);
    if (details.reason === 'install') {
        // 首次安装，初始化默认配置
        await chrome.storage.local.set({
            watchlistChannels: [],
            monitorConfig: {
                enabled: false,
                intervalMin: 60,
                notifyEnabled: true,
                fetchTopN: 10
            },
            monitorLastRun: null,
            monitorLastResult: { newVideos: [], alerts: [] }
        });
    } else {
        // 更新时恢复定时任务
        await restoreMonitorAlarm();
    }
});

// === 恢复定时任务 ===
async function restoreMonitorAlarm() {
    const result = await chrome.storage.local.get(['monitorConfig']);
    const config = result.monitorConfig || { enabled: false, intervalMin: 60 };

    if (config.enabled) {
        console.log('[Background] Restoring monitor alarm:', config.intervalMin, 'min');
        await chrome.alarms.create('competitor_monitor', {
            periodInMinutes: config.intervalMin
        });
    } else {
        await chrome.alarms.clear('competitor_monitor');
    }
}

// === 执行监控检查（从 storage 读取配置和 watchlist）===
async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (cursor < items.length) {
            const index = cursor++;
            try {
                results[index] = await worker(items[index], index);
            } catch (e) {
                results[index] = { error: e };
            }
        }
    });
    await Promise.all(workers);
    return results;
}

async function runMonitorCheck() {
    if (isMonitorRunning) {
        console.log('[Monitor] Previous run still in progress, skipping');
        return;
    }
    isMonitorRunning = true;
    try {
        const result = await chrome.storage.local.get(['watchlistChannels', 'monitorConfig']);
        const channels = result.watchlistChannels || [];
        const config = result.monitorConfig || { fetchTopN: 10, notifyEnabled: true };

        if (channels.length === 0) {
            console.log('[Monitor] No channels in watchlist');
            return;
        }

        const newVideos = [];
        const alerts = [];
        const nowIso = new Date().toISOString();

        // 过滤无效的 channel 对象
        const validChannels = channels.filter(ch => {
            if (!ch || typeof ch !== 'object') {
                console.error('[Monitor] Invalid channel object:', ch);
                return false;
            }
            if (!ch.channelId || typeof ch.channelId !== 'string') {
                console.error('[Monitor] Channel missing channelId:', ch);
                return false;
            }
            return true;
        });

        if (validChannels.length === 0) {
            console.log('[Monitor] No valid channels to check');
            return;
        }

        const channelResults = await mapWithConcurrency(validChannels, MONITOR_CONCURRENCY, async (channel) => {
            try {
                const latestVideos = await fetchChannelVideos(channel.channelId, config.fetchTopN);
                const diffed = diffNewVideos(channel, latestVideos);

                const channelNew = [];
                const channelAlerts = [];

                for (const video of diffed) {
                    const withChannel = { ...video, channel };
                    channelNew.push(withChannel);
                    if (checkAlertRules(video)) {
                        channelAlerts.push(withChannel);
                    }
                }

                channel.lastSeenVideoIds = latestVideos.map(v => v.videoId).slice(0, 200);
                channel.lastCheckedAt = nowIso;

                return { newVideos: channelNew, alerts: channelAlerts };
            } catch (e) {
                console.error('[Monitor] Error checking channel:', channel.channelId, e);
                return null;
            }
        });

        for (const r of channelResults) {
            if (r && !r.error) {
                if (r.newVideos?.length) newVideos.push(...r.newVideos);
                if (r.alerts?.length) alerts.push(...r.alerts);
            }
        }

        await chrome.storage.local.set({
            watchlistChannels: channels,
            monitorLastRun: nowIso,
            monitorLastResult: {
                newVideos,
                alerts,
                timestamp: nowIso
            }
        });

        if (alerts.length > 0 && config.notifyEnabled) {
            await sendMonitorNotification(alerts);
        }

        console.log('[Monitor] Check completed:', newVideos.length, 'new videos,', alerts.length, 'alerts');

    } catch (e) {
        console.error('[Monitor] Error in runMonitorCheck:', e);
    } finally {
        isMonitorRunning = false;
    }
}


// === 获取频道视频列表（通过 YouTube Feeds API）===
async function fetchChannelVideos(channelId, topN) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    try {
        const response = await fetch(feedUrl, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlText = await response.text();
        return parseFeedEntries(xmlText, topN);

    } catch (e) {
        throw new Error(`Failed to fetch feed: ${e.message}`);
    }
}

function parseFeedEntries(xmlText, topN) {
    const videos = [];

    if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const entries = xmlDoc.querySelectorAll('entry');

        for (let i = 0; i < Math.min(entries.length, topN); i++) {
            const entry = entries[i];
            const videoId = entry.querySelector('yt\\:videoId, videoId')?.textContent || '';
            const title = entry.querySelector('title')?.textContent || '';
            const published = entry.querySelector('published')?.textContent || '';
            const link = entry.querySelector('link[rel=\"alternate\"]')?.getAttribute('href') || '';
            const videoIdFromLink = link.match(/\/watch\?v=([^&]+)/)?.[1] || videoId;

            videos.push({
                videoId: videoIdFromLink,
                title,
                publishedAt: published,
                url: `https://www.youtube.com/watch?v=${videoIdFromLink}`
            });
        }

        return videos;
    }

    const entryMatches = xmlText.split('<entry>').slice(1);
    for (const entry of entryMatches) {
        if (videos.length >= topN) break;
        const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || entry.match(/<videoId>([^<]+)<\/videoId>/))?.[1] || '';
        const title = (entry.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
        const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
        const link = (entry.match(/<link[^>]+rel=\"alternate\"[^>]+href=\"([^\"]+)\"/) || [])[1] || '';
        const videoIdFromLink = link.match(/\/watch\?v=([^&]+)/)?.[1] || videoId;

        videos.push({
            videoId: videoIdFromLink,
            title,
            publishedAt: published,
            url: `https://www.youtube.com/watch?v=${videoIdFromLink}`
        });
    }

    return videos;
}

// === Diff 新视频 ===
function diffNewVideos(channel, latestVideos) {
    const seenIds = new Set(channel.lastSeenVideoIds || []);
    return latestVideos.filter(v => !seenIds.has(v.videoId));
}

// === 检查预警规则 ===
function checkAlertRules(video) {
    // 简化版规则：发布时间在48小时内且有一定播放潜力
    // 注意：Feeds 没有播放量数据，需要后续在 monitor 页面抓取详情后重新评估
    const publishedTime = new Date(video.publishedAt);
    const hoursSincePublish = (Date.now() - publishedTime.getTime()) / (1000 * 60 * 60);

    // 暂时只按时间筛选（48小时内的新视频）
    return hoursSincePublish <= 48;
}

// === 发送通知 ===
async function sendMonitorNotification(alerts) {
    const count = alerts.length;
    const title = `发现 ${count} 个对标新视频`;
    const message = alerts.slice(0, 3).map(a => {
        const channel = a.channel;
        const displayName = channel?.title || channel?.channelId || '未知频道';
        return displayName;
    }).join('、');
    const more = count > 3 ? `等${count}个频道` : '';

    try {
        await chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title: title,
            message: `${message}${more}`,
            buttons: [
                { title: '查看详情' }
            ]
        });
    } catch (e) {
        console.error('[Background] Failed to send notification:', e);
    }
}

// === 监听通知点击 ===
chrome.notifications.onClicked.addListener(async (notificationId) => {
    await chrome.tabs.create({ url: chrome.runtime.getURL('monitor.html') });
});

// === 监听通知按钮点击 ===
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
        await chrome.tabs.create({ url: chrome.runtime.getURL('monitor.html') });
    }
});

// === 监听来自 monitor 页面的消息 ===
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || !request.action) {
        sendResponse({ error: 'Invalid request: missing action' });
        return false;
    }

    if (request.action === 'runMonitorNow') {
        runMonitorCheck()
            .then(() => sendResponse({ success: true }))
            .catch(e => sendResponse({ success: false, error: e.message }));
        return true; // 异步响应
    }

    if (request.action === 'updateMonitorAlarm') {
        if (!request.config) {
            sendResponse({ success: false, error: 'Missing config parameter' });
            return false;
        }
        updateMonitorAlarm(request.config)
            .then(() => sendResponse({ success: true }))
            .catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }

    if (request.action === 'getMonitorStatus') {
        chrome.storage.local.get(['monitorLastRun', 'monitorLastResult'], (result) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            sendResponse(result);
        });
        return true;
    }

    // 未知 action
    sendResponse({ error: `Unknown action: ${request.action}` });
    return false;
});

// === 更新定时任务 ===
async function updateMonitorAlarm(config) {
    // 先清除旧的
    await chrome.alarms.clear('competitor_monitor');

    // 如果启用，创建新的
    if (config.enabled) {
        await chrome.alarms.create('competitor_monitor', {
            periodInMinutes: config.intervalMin
        });
    }

    // 保存配置
    await chrome.storage.local.set({ monitorConfig: config });
}
