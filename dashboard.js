// ============================================
// 油管挖掘机 Pro Max (静音防报错版)
// ============================================

let excelData = [];
let results = [];
let isRunning = false;

// === V2 新增：结果表格状态 ===
let tableData = [];
let currentSort = { field: 'score', order: 'desc' };

// === V2 新增：任务状态跟踪 ===
let taskStatus = {
    doneKeywords: 0,
    totalKeywords: 0,
    currentKeyword: '',
    currentCount: 0,
    currentLimit: 50,
    failureCount: 0,
    lastFailureReason: '',
    lastFailureType: ''  // 'network' | 'no_result' | 'rate_limited' | 'parse_error'
};

// === 配置区 ===
const CONFIG = {
    intervalBase: 5000,      
    intervalRandom: 5000,    
    batchSize: 20,           
    batchPause: 30000,       
    timeoutSearch: 20000,    
    timeoutDetail: 25000,    
    minDuration: 10          
};

const DOM_CACHE = {};
const $ = (id) => {
    const el = DOM_CACHE[id] || (DOM_CACHE[id] = document.getElementById(id));
    if (!el) {
        console.warn(`[Dashboard] Element not found: ${id}`);
    }
    return el;
};

// === 0. 启动检测 ===
window.onload = function() {
    checkBackup();
    initQuickButtons();
    initPresetSelect();
    initResultTableControls();
};

// === V2 新增：预设配置 ===
const PRESETS = {
    drama: {
        name: '短剧/泛娱乐',
        minViews: 10000,
        dayLimit: 30,
        minDuration: 10,
        maxPerKeyword: 50
    },
    shorts: {
        name: 'Shorts短视频',
        minViews: 20000,
        dayLimit: 14,
        minDuration: 0,
        maxPerKeyword: 80
    }
};

// === V2 新增：快捷按钮初始化 ===
function initQuickButtons() {
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.value;
            $('dayLimit').value = value;
            log(`已设置最近 ${value} 天发布`, 'info');
        });
    });
}

// === V2 新增：预设选择初始化 ===
function initPresetSelect() {
    const presetSelect = $('presetSelect');
    presetSelect.addEventListener('change', () => {
        const preset = presetSelect.value;
        if (preset && PRESETS[preset]) {
            const p = PRESETS[preset];
            $('minViews').value = p.minViews;
            $('dayLimit').value = p.dayLimit;
            $('minDuration').value = p.minDuration;
            $('maxPerKeyword').value = p.maxPerKeyword;
            log(`已应用预设：${p.name}`, 'success');
        }
    });
}

// === V2 新增：恢复默认 ===
function resetToDefaults() {
    $('minViews').value = 0;
    $('dayLimit').value = 0;
    $('minDuration').value = 0;
    $('maxPerKeyword').value = 50;
    $('presetSelect').value = '';
    $('deepMode').checked = false;
    log('已恢复默认设置', 'info');
}

// === 1. 中央状态管理器 ===
function updateUIState(state) {
    const startBtn = $('startBtn');
    const stopBtn = $('stopBtn');
    const exportBtn = $('exportBtn');
    const fileInput = $('fileInput');

    startBtn.style.opacity = "1";
    stopBtn.style.opacity = "1";
    exportBtn.style.opacity = "1";

    switch (state) {
        case 'IDLE': 
            startBtn.disabled = false;
            startBtn.innerText = "▶ 开始采集";
            startBtn.style.background = "#4CAF50"; 
            
            stopBtn.disabled = true;
            stopBtn.innerText = "⏹ 停止运行";
            stopBtn.style.background = "#555"; 
            stopBtn.style.opacity = "0.5";

            exportBtn.disabled = true; 
            fileInput.disabled = false;
            break;

        case 'RUNNING': 
            startBtn.disabled = true;
            startBtn.innerText = "🚀 运行中...";
            startBtn.style.background = "#555"; 
            startBtn.style.opacity = "0.5";

            stopBtn.disabled = false;
            stopBtn.innerText = "⏹ 停止运行";
            stopBtn.style.background = "#e53935"; 

            exportBtn.disabled = true;
            exportBtn.style.background = "#555";
            exportBtn.style.opacity = "0.5";
            
            fileInput.disabled = true; 
            break;

        case 'STOPPING': 
            startBtn.disabled = true;
            stopBtn.disabled = true;
            exportBtn.disabled = true;
            
            stopBtn.innerText = "⚠️ 正在停止...";
            stopBtn.style.background = "#FF9800"; 
            break;

        case 'FINISHED': 
            startBtn.disabled = false;
            startBtn.innerText = "▶ 重新开始";
            startBtn.style.background = "#4CAF50";

            stopBtn.disabled = true;
            stopBtn.innerText = "已停止";
            stopBtn.style.background = "#555";
            stopBtn.style.opacity = "0.5";

            exportBtn.disabled = false;
            exportBtn.innerText = "💾 导出结果";
            exportBtn.style.background = "#2196F3"; 
            
            fileInput.disabled = false;
            break;
            
        case 'RECOVERY': 
            exportBtn.disabled = false;
            exportBtn.style.background = "#FF9800"; 
            break;
    }
}

// === 2. 备份检测 ===
function checkBackup() {
    updateUIState('IDLE');
    const backup = localStorage.getItem('yt_miner_backup');
    if (backup) {
        try {
            const savedData = JSON.parse(backup);
            if (savedData && savedData.length > 0) {
                log(`🚨 发现上次未导出的 ${savedData.length} 条数据！`, 'warn');
                updateUIState('RECOVERY');

                // V2: 恢复表格数据
                tableData = [...savedData];
                updateTableDisplay();

                const exportBtn = $('exportBtn');
                exportBtn.innerText = `📂 恢复上次数据 (${savedData.length}条)`;

                exportBtn.onclick = () => {
                    exportToExcel(savedData, "数据恢复");
                    if(confirm("恢复成功！是否清空缓存？")) {
                        localStorage.removeItem('yt_miner_backup');
                        location.reload();
                    }
                };
            }
        } catch(e) {}
    }
}

// === 3. 文件读取 ===
$('fileInput').addEventListener('change', (e) => {
    localStorage.removeItem('yt_miner_backup');
    updateUIState('IDLE');

    const file = e.target.files[0];
    if (!file) return;

    // 显示加载状态
    log('正在读取 Excel 文件...', 'info');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                log('⚠️ Excel 文件没有工作表', 'warn');
                return;
            }

            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            if (!worksheet) {
                log('⚠️ 无法读取工作表', 'warn');
                return;
            }

            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (!json || !Array.isArray(json)) {
                log('⚠️ Excel 文件格式不正确', 'warn');
                return;
            }

            // 安全地提取数据，检查每一行
            excelData = json
                .map(row => {
                    if (Array.isArray(row) && row.length > 0) {
                        return row[0];
                    }
                    return null;
                })
                .filter(item => item !== null && item !== undefined && item !== '');

            if (excelData.length === 0) {
                log('⚠️ Excel 文件为空或格式不正确', 'warn');
                return;
            }

            log(`📂 剧单加载成功：${excelData.length} 部`, 'success');
        } catch (err) {
            log(`❌ Excel 读取失败: ${err.message}`, 'error');
            console.error('Excel read error:', err);
        }
    };
    reader.onerror = () => {
        log('❌ 文件读取失败，请重试', 'error');
    };
    reader.readAsArrayBuffer(file);
});

// === 4. 停止按钮 ===
$('stopBtn').addEventListener('click', () => {
    if (isRunning) {
        isRunning = false;
        updateUIState('STOPPING');
        log('🛑 收到指令，正在安全停止...', 'warn');
    }
});

// === 4.1 恢复默认按钮 ===
$('resetBtn').addEventListener('click', () => {
    resetToDefaults();
});

// === 4.2 监控按钮 ===
$('monitorBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('monitor.html') });
});

// === 4.3 下载页面按钮 ===
$('downloadPageBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('download.html') });
});

// === 5. 开始按钮 ===
$('startBtn').addEventListener('click', async () => {
    if (excelData.length === 0) { alert("请先上传剧单！"); return; }
    
    if (localStorage.getItem('yt_miner_backup')) {
        if(!confirm("⚠️ 还有未导出的旧数据，开始新任务将覆盖它。\n确定要开始吗？")) return;
        localStorage.removeItem('yt_miner_backup');
    }

    isRunning = true;
    updateUIState('RUNNING');
    results = [];
    tableData = [];
    updateTableDisplay();

    const minViews = parseInt($('minViews').value) || 0;
    const dayLimit = parseInt($('dayLimit').value) || 0;
    const minDuration = parseInt($('minDuration').value) || 0;
    const maxPerKeyword = parseInt($('maxPerKeyword').value) || 50;
    const isDeepMode = $('deepMode').checked;

    // 初始化任务状态
    resetTaskStatus(excelData.length, maxPerKeyword);

    log(`🚀 任务开始... (每关键词上限: ${maxPerKeyword}条)`, 'info');

    for (let i = 0; i < excelData.length; i++) {
        if (!isRunning) { log('🚫 任务终止', 'error'); break; }

        if (i > 0 && i % CONFIG.batchSize === 0) {
            log(`☕ 休息 ${CONFIG.batchPause/1000} 秒...`, 'rest');
            for(let k=0; k<CONFIG.batchPause/1000; k++) {
                if(!isRunning) break;
                await sleep(1000);
            }
        }
        if (!isRunning) break;

        const keyword = excelData[i];
        updateProgress(i, excelData.length, keyword);
        updateCurrentKeywordProgress(keyword, 0, maxPerKeyword);

        try {
            let items = await withTimeout(
                searchYoutubeWithRetry(keyword, 2),
                CONFIG.timeoutSearch, "搜索超时"
            );

            if (!isRunning) break;

            if (items.length > 0) {
                items = items.filter(item => {
                    const v = parseViewCount(item['播放量']);
                    const d = parseDateStr(item['发布时间']);
                    const t = parseDuration(item['时长']);
                    return (minViews === 0 || v >= minViews) &&
                           (dayLimit === 0 || d <= dayLimit) &&
                           (minDuration === 0 || t >= minDuration);
                });

                // 应用每关键词抓取上限
                if (items.length > maxPerKeyword) {
                    items = items.slice(0, maxPerKeyword);
                }
            }

            if (isDeepMode && items.length > 0) {
                if (!isRunning) break;
                try {
                    const topVideo = items[0];
                    log(`   ⚡ 深度扫描...`, 'info');
                    const details = await withTimeout(
                        scrapeVideoDetails(topVideo['链接']), 
                        CONFIG.timeoutDetail, "详情超时"
                    );
                    Object.assign(topVideo, details);
                } catch (e) {
                    log(`   ⚠ 深度跳过: ${e.message}`, 'warn');
                }
            }

            if (items.length > 0) {
                log(`   ✔ 成功`, 'success', items[0]['封面图']);
                items.forEach(item => {
                    item['原搜剧名'] = keyword;
                    results.push(item);
                    tableData.push(item);  // V2: 同时添加到表格数据
                });
                localStorage.setItem('yt_miner_backup', JSON.stringify(results));

                // 更新当前关键词抓取数
                updateCurrentKeywordProgress(keyword, items.length, maxPerKeyword);

                // V2: 每批处理后更新表格显示
                if (results.length % 5 === 0 || i === excelData.length - 1) {
                    updateTableDisplay();
                }

                completeKeyword();
            } else {
                log(`   ⚠ 无结果`, 'warn');
                recordFailure('no_result', '关键词无搜索结果');
                const noResultItem = { '原搜剧名': keyword, '视频标题': '无结果' };
                results.push(noResultItem);
                tableData.push(noResultItem);  // V2: 同时添加到表格数据
                localStorage.setItem('yt_miner_backup', JSON.stringify(results));
                completeKeyword();
            }

        } catch (err) {
            log(`   ❌ 跳过: ${err.message}`, 'error');
            // 根据错误信息分类失败类型
            let failType = 'parse_error';
            if (err.message.includes('timeout') || err.message.includes('网络')) {
                failType = 'network';
            } else if (err.message.includes('rate') || err.message.includes('限制')) {
                failType = 'rate_limited';
            }
            recordFailure(failType, err.message);
            completeKeyword();
        }

        if (isRunning) {
            const wait = CONFIG.intervalBase + Math.floor(Math.random() * CONFIG.intervalRandom);
            await sleep(wait);
        }
    }

    finishTask();
});

function finishTask() {
    isRunning = false;
    updateUIState('FINISHED');

    // V2: 最终更新表格显示
    updateTableDisplay();

    const exportBtn = $('exportBtn');
    exportBtn.onclick = () => {
        if(results.length === 0) { alert("没有采集到数据"); return; }
        exportToExcel(results, "采集结果");
        localStorage.removeItem('yt_miner_backup');
    };
    if(results.length === excelData.length) {
        alert("🎉 任务全部完成！");
    }
}

function exportToExcel(data, filename) {
    try {
        if (!data || data.length === 0) {
            alert("没有采集到数据");
            return;
        }

        // V2: 确保所有数据都有评分
        calculateScores(data);

        // 重新组织数据，确保字段顺序完整
        const exportData = data.map(item => ({
            '关键词': item['原搜剧名'] || '',
            '视频标题': item['视频标题'] || '',
            '频道名': item['频道名'] || '',
            '播放量': item['播放量'] || '',
            '发布时间': item['发布时间'] || '',
            '时长': item['时长'] || '',
            '点赞数': item['点赞数'] || '0',
            '评论数': item['评论数'] || '0',
            '点赞率(%)': item['likeRate'] || '0',
            '评论率(%)': item['commentRate'] || '0',
            '日均播放': item['viewsPerDay'] || '0',
            'Score': item['Score'] || '0',
            'Reason': item['Reason'] || '',
            '封面图': item['封面图'] || '',
            '链接': item['链接'] || '',
            'SEO标签': item['SEO标签'] || '',
            '精确发布日期': item['精确发布日期'] || '',
            '频道订阅': item['频道订阅'] || '',
            '描述摘要': item['描述摘要'] || ''
        }));

        // 过滤有效数据（排除"无结果"项）
        const validData = exportData.filter(item => item['视频标题'] !== '无结果');

        // 创建工作簿
        const wb = XLSX.utils.book_new();

        // Sheet1: Raw (全量数据)
        const wsRaw = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, wsRaw, "Raw");

        // Sheet2: Top 50 (按 Score 排序前 50)
        if (validData.length > 0) {
            // 按 Score 降序排序
            const sortedData = [...validData].sort((a, b) => {
                const scoreA = parseFloat(a['Score']) || 0;
                const scoreB = parseFloat(b['Score']) || 0;
                return scoreB - scoreA;
            });

            // 取前 50 条
            const topData = sortedData.slice(0, Math.min(50, sortedData.length));
            const wsTop = XLSX.utils.json_to_sheet(topData);
            XLSX.utils.book_append_sheet(wb, wsTop, "Top");

            // 设置列宽（两个 sheet 共用）
            const colWidths = [
                { wch: 15 },  // 关键词
                { wch: 30 },  // 视频标题
                { wch: 15 },  // 频道名
                { wch: 10 },  // 播放量
                { wch: 12 },  // 发布时间
                { wch: 8 },   // 时长
                { wch: 10 },  // 点赞数
                { wch: 10 },  // 评论数
                { wch: 10 },  // 点赞率
                { wch: 10 },  // 评论率
                { wch: 12 },  // 日均播放
                { wch: 8 },   // Score
                { wch: 50 },  // Reason
                { wch: 40 },  // 封面图
                { wch: 40 },  // 链接
                { wch: 30 },  // SEO标签
                { wch: 15 },  // 精确发布日期
                { wch: 12 },  // 频道订阅
                { wch: 40 }   // 描述摘要
            ];

            wsRaw['!cols'] = colWidths;
            wsTop['!cols'] = colWidths;
        } else {
            wsRaw['!cols'] = [
                { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
                { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
                { wch: 12 }, { wch: 8 }, { wch: 50 }, { wch: 40 }, { wch: 40 },
                { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 40 }
            ];
        }

        XLSX.writeFile(wb, `${filename}_${new Date().getTime()}.xlsx`);
        log(`✓ 导出成功: ${data.length} 条数据`, 'success');
    } catch (err) {
        log(`❌ 导出失败: ${err.message}`, 'error');
        console.error('Export error:', err);
        alert('导出失败，请重试');
    }
}

function withTimeout(promise, ms, errorMsg) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
        promise.then(res => { clearTimeout(timer); resolve(res); }, err => { clearTimeout(timer); reject(err); });
    });
}

function createInactiveTab(url) {
    return new Promise((resolve, reject) => {
        chrome.tabs.create({ url: url, active: false }, (tab) => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            if (!tab || !tab.id) {
                return reject(new Error("Failed to create tab: no tab returned"));
            }
            resolve(tab);
        });
    });
}

function waitForTabComplete(tabId, timeoutMs) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            chrome.tabs.onUpdated.removeListener(onUpdated);
        };
        const onUpdated = (id, info) => {
            if (id === tabId && info.status === 'complete') {
                cleanup();
                resolve();
            }
        };
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error("Tab load timeout"));
        }, timeoutMs);
        chrome.tabs.onUpdated.addListener(onUpdated);
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                cleanup();
                return reject(new Error("Tab closed"));
            }
            if (tab.status === 'complete') {
                cleanup();
                resolve();
            }
        });
    });
}

function execScript(tabId, func) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({ target: { tabId: tabId }, function: func }, (res) => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            resolve(res);
        });
    });
}

function safeRemoveTab(tabId) {
    if (!tabId) return;
    chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
            // ignore remove errors
        }
    });
}

async function searchYoutubeWithRetry(keyword, retries) {
    for (let j = 0; j < retries; j++) {
        try {
            return await searchYoutube(keyword);
        } catch (e) {
            if (j === retries - 1) {
                throw e;
            }
            log(`   重试 ${j + 1}/${retries - 1}...`, 'warn');
            await sleep(3000);
        }
    }
    throw new Error('搜索失败，已达到最大重试次数');
}

async function searchYoutube(keyword) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`;
    const tab = await createInactiveTab(url);
    try {
        await waitForTabComplete(tab.id, CONFIG.timeoutSearch);
        await sleep(1200);
        const res = await execScript(tab.id, scrapeListPage);
        if (!res || !res[0]) return [];
        return res[0].result || [];
    } finally {
        safeRemoveTab(tab.id);
    }
}

async function scrapeVideoDetails(url) {
    if (!url) return {};
    const tab = await createInactiveTab(url);
    try {
        await waitForTabComplete(tab.id, CONFIG.timeoutDetail);
        await sleep(1200);
        const res = await execScript(tab.id, scrapeDetailPage);
        if (!res || !res[0]) return {};
        return res[0].result || {};
    } catch (e) {
        return {};
    } finally {
        safeRemoveTab(tab.id);
    }
}

// ... (scrapeListPage, scrapeDetailPage, parse functions 等保持不变，为了节省篇幅，这里复用之前一样的代码) ...
// === 必须保留的网页注入函数 ===
function scrapeListPage() {
    const list = [];
    const els = document.querySelectorAll('ytd-video-renderer');
    window.scrollTo(0, 500);
    for (let i = 0; i < Math.min(5, els.length); i++) {
        try {
            const el = els[i];
            const titleEl = el.querySelector('#video-title');
            const metaEls = el.querySelectorAll('#metadata-line span');
            const channelEl = el.querySelector('#channel-info #text a');
            const timeEl = el.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
            let views = "0", date = "";
            if (metaEls.length >= 2) { views = metaEls[0].innerText; date = metaEls[1].innerText; }
            let thumb = "";
            if (titleEl && titleEl.href) {
                try { const vid = new URL(titleEl.href).searchParams.get("v"); if (vid) thumb = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`; } catch(e){}
            }
            list.push({
                '视频标题': titleEl ? titleEl.innerText.trim() : "",
                '播放量': views, '发布时间': date,
                '时长': timeEl ? timeEl.innerText.trim() : "0:00",
                '频道名': channelEl ? channelEl.innerText.trim() : "",
                '封面图': thumb, '链接': titleEl ? titleEl.href : ""
            });
        } catch(e) {}
    }
    return list;
}

function scrapeDetailPage() {
    try {
        const subEl = document.querySelector('#owner-sub-count');
        const tagMeta = document.querySelector('meta[name="keywords"]');
        const dateMeta = document.querySelector('meta[itemprop="datePublished"]');
        const descEl = document.querySelector('#description-inline-expander');
        return {
            'SEO标签': tagMeta ? tagMeta.getAttribute('content') : "",
            '精确发布日期': dateMeta ? dateMeta.getAttribute('content') : "",
            '频道订阅': subEl ? subEl.innerText : "",
            '描述摘要': descEl ? descEl.innerText.substring(0, 100).replace(/\n/g, " ") : ""
        };
    } catch(e) { return {}; }
}

function parseDuration(str) {
    if (!str) return 0;
    const p = str.split(':').map(Number);
    if (p.length === 3) return p[0]*60 + p[1];
    if (p.length === 2) return p[0];
    return 0;
}
function parseViewCount(str) {
    if (!str) return 0;
    let n = parseFloat(str.replace(/,/g, ''));
    if (str.includes('万')) n *= 10000;
    if (str.includes('亿')) n *= 100000000;
    if (str.toUpperCase().includes('K')) n *= 1000;
    if (str.toUpperCase().includes('M')) n *= 1000000;
    return isNaN(n) ? 0 : n;
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

function updateProgress(i, total, title) {
    const pct = Math.round(((i + 1) / total) * 100);
    $('progFill').style.width = pct + "%";
    $('progText').innerText = `${i + 1}/${total} - ${title}`;
    document.title = pct + "% 运行中";
}

function log(msg, type = 'info', imageUrl = null) {
    const logWin = $('logWindow');
    if (!logWin) return;
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.style.borderBottom = "1px solid #333";
    entry.style.padding = "6px 0";
    let color = "#2196F3"; let icon = "ℹ";
    if (type === 'success') { color = "#4CAF50"; icon = "✔"; }
    else if (type === 'error') { color = "#FF5252"; icon = "❌"; }
    else if (type === 'warn') { color = "#FFC107"; icon = "⚠"; }
    else if (type === 'skip') { color = "#777"; icon = "✂"; }
    else if (type === 'rest') { color = "#9C27B0"; icon = "☕"; }

    // Create time span
    const timeSpan = document.createElement('span');
    timeSpan.style.color = "#666";
    timeSpan.style.fontSize = "12px";
    timeSpan.style.marginRight = "8px";
    timeSpan.textContent = `[${time}]`;
    entry.appendChild(timeSpan);

    // Create message span (safe from XSS as we use textContent)
    const msgSpan = document.createElement('span');
    msgSpan.style.color = color;
    msgSpan.style.fontWeight = "bold";
    msgSpan.textContent = `${icon} ${msg}`;
    entry.appendChild(msgSpan);

    // Add image if provided (sanitize URL)
    if (imageUrl) {
        const imgDiv = document.createElement('div');
        imgDiv.style.marginTop = "5px";
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.height = "80px";
        img.style.borderRadius = "4px";
        img.style.border = "1px solid #444";
        imgDiv.appendChild(img);
        entry.appendChild(imgDiv);
    }

    logWin.appendChild(entry);
    logWin.scrollTop = logWin.scrollHeight;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================
// V2 新增：任务状态跟踪功能
// ============================================

// === 初始化/重置任务状态 ===
function resetTaskStatus(totalKeywords, maxPerKeyword) {
    taskStatus = {
        doneKeywords: 0,
        totalKeywords: totalKeywords,
        currentKeyword: '',
        currentCount: 0,
        currentLimit: maxPerKeyword || 50,
        failureCount: 0,
        lastFailureReason: '',
        lastFailureType: ''
    };
    updateTaskStatusBar();
}

// === 更新任务状态显示 ===
function updateTaskStatusBar() {
    const statusBar = $('taskStatusBar');
    const totalProgressEl = $('statusTotalProgress');
    const currentKeywordEl = $('statusCurrentKeyword');
    const currentCountEl = $('statusCurrentCount');
    const failureEl = $('statusFailure');

    // 控制显示/隐藏
    if (taskStatus.totalKeywords > 0) {
        statusBar.classList.add('visible');
    } else {
        statusBar.classList.remove('visible');
    }

    // 总进度
    totalProgressEl.textContent = `${taskStatus.doneKeywords} / ${taskStatus.totalKeywords}`;

    // 当前关键词
    currentKeywordEl.textContent = taskStatus.currentKeyword || '-';

    // 当前抓取进度
    currentCountEl.textContent = `${taskStatus.currentCount} / ${taskStatus.currentLimit}`;

    // 失败状态
    if (taskStatus.failureCount > 0) {
        failureEl.className = 'status-value ' + (taskStatus.failureCount > 5 ? 'error' : 'warning');
        const reasonMap = {
            'network': '网络错误',
            'no_result': '无结果',
            'rate_limited': '限流',
            'parse_error': '解析失败'
        };
        const reasonText = reasonMap[taskStatus.lastFailureType] || '其他';
        failureEl.textContent = `${taskStatus.failureCount} / ${reasonText}`;
    } else {
        failureEl.className = 'status-value neutral';
        failureEl.textContent = '0 / -';
    }
}

// === 记录失败 ===
function recordFailure(errorType, reason) {
    taskStatus.failureCount++;
    taskStatus.lastFailureType = errorType;
    taskStatus.lastFailureReason = reason;
    updateTaskStatusBar();
}

// === 更新当前关键词进度 ===
function updateCurrentKeywordProgress(keyword, count, limit) {
    taskStatus.currentKeyword = keyword;
    taskStatus.currentCount = count;
    taskStatus.currentLimit = limit;
    updateTaskStatusBar();
}

// === 完成一个关键词 ===
function completeKeyword() {
    taskStatus.doneKeywords++;
    taskStatus.currentKeyword = '';
    taskStatus.currentCount = 0;
    updateTaskStatusBar();
}

// ============================================
// V2 新增：评分与表格功能
// ============================================

// === 计算每个视频的 Score 和 Reason ===
function calculateScores(resultItems) {
    if (resultItems.length === 0) return;

    // 首先收集所有有效的数据点用于 min-max 归一化
    const viewsPerDayList = [];
    const likeRateList = [];
    const commentRateList = [];

    resultItems.forEach(item => {
        if (item['视频标题'] === '无结果') return;

        const views = parseViewCount(item['播放量']) || 0;
        const days = parseDateStr(item['发布时间']) || 1;
        const viewsPerDay = views / Math.max(1, days);

        // 深度模式可能有点赞数，否则估算
        const likes = item['点赞数'] || Math.floor(views * 0.02);
        const comments = item['评论数'] || Math.floor(views * 0.001);

        const likeRate = views > 0 ? (likes / views) * 100 : 0;
        const commentRate = views > 0 ? (comments / views) * 100 : 0;

        viewsPerDayList.push(viewsPerDay);
        likeRateList.push(likeRate);
        commentRateList.push(commentRate);
    });

    // 计算 min-max 用于归一化
    const vpdMin = viewsPerDayList.length ? Math.min(...viewsPerDayList) : 0;
    const vpdMax = viewsPerDayList.length ? Math.max(...viewsPerDayList) : 1;
    const lrMin = likeRateList.length ? Math.min(...likeRateList) : 0;
    const lrMax = likeRateList.length ? Math.max(...likeRateList) : 1;
    const crMin = commentRateList.length ? Math.min(...commentRateList) : 0;
    const crMax = commentRateList.length ? Math.max(...commentRateList) : 1;

    // 归一化函数
    const normalize = (val, min, max) => {
        if (max === min) return 0.5;
        return (val - min) / (max - min);
    };

    // 为每个项目计算 Score 和 Reason
    resultItems.forEach(item => {
        if (item['视频标题'] === '无结果') {
            item['Score'] = 0;
            item['Reason'] = '无搜索结果';
            item['viewsPerDay'] = 0;
            item['likeRate'] = 0;
            item['commentRate'] = 0;
            return;
        }

        const views = parseViewCount(item['播放量']) || 0;
        const days = parseDateStr(item['发布时间']) || 1;
        const viewsPerDay = views / Math.max(1, days);

        const likes = item['点赞数'] || Math.floor(views * 0.02);
        const comments = item['评论数'] || Math.floor(views * 0.001);

        const likeRate = views > 0 ? (likes / views) * 100 : 0;
        const commentRate = views > 0 ? (comments / views) * 100 : 0;

        // 归一化 (0-1)
        const normVpd = normalize(viewsPerDay, vpdMin, vpdMax);
        const normLr = normalize(likeRate, lrMin, lrMax);
        const normCr = normalize(commentRate, crMin, crMax);

        // 计算最终 Score (0-100)
        const rawScore = normVpd * 55 + normLr * 25 + normCr * 20;
        item['Score'] = Math.round(Math.max(0, Math.min(100, rawScore)));
        item['viewsPerDay'] = Math.round(viewsPerDay);
        item['likeRate'] = likeRate.toFixed(2);
        item['commentRate'] = commentRate.toFixed(2);

        // 生成 Reason
        item['Reason'] = generateReason(views, days, viewsPerDay, likeRate, commentRate);
    });
}

// === 生成 Reason 文本 ===
function generateReason(views, days, viewsPerDay, likeRate, commentRate) {
    const parts = [];

    // 天数描述
    const dayDesc = days === 0 ? '今天' : days === 1 ? '昨天' : `${days}天前`;

    // 播放量描述
    if (views >= 1000000) {
        parts.push(`${dayDesc}${(views/10000).toFixed(0)}万播放`);
    } else if (views >= 10000) {
        parts.push(`${dayDesc}${(views/10000).toFixed(1)}万播放`);
    } else if (views >= 1000) {
        parts.push(`${dayDesc}${views}播放`);
    } else {
        parts.push(`${dayDesc}播放${views}`);
    }

    // 增速判断
    if (viewsPerDay >= 50000) {
        parts.push('增速极高');
    } else if (viewsPerDay >= 10000) {
        parts.push('增速高');
    } else if (viewsPerDay >= 3000) {
        parts.push('增速中等');
    } else if (viewsPerDay >= 500) {
        parts.push('增速稳定');
    }

    // 点赞率
    if (likeRate >= 5) {
        parts.push(`点赞率${likeRate.toFixed(1)}%极高`);
    } else if (likeRate >= 3) {
        parts.push(`点赞率${likeRate.toFixed(1)}%偏高`);
    } else if (likeRate >= 1.5) {
        parts.push(`点赞率${likeRate.toFixed(1)}%正常`);
    }

    // 评论率
    if (commentRate >= 1) {
        parts.push(`评论${commentRate.toFixed(1)}%`);
    } else if (commentRate >= 0.5) {
        parts.push('评论活跃');
    }

    return parts.join('，') + '。';
}

// === 初始化结果表格控件 ===
function initResultTableControls() {
    // 排序选择
    $('sortSelect').addEventListener('change', (e) => {
        const value = e.target.value;
        const [field, order] = value.split('-');
        currentSort = { field, order };
        renderTable();
    });

    // 关键词筛选
    $('keywordFilter').addEventListener('input', () => {
        renderTable();
    });

    // 刷新按钮
    $('refreshTable').addEventListener('click', () => {
        renderTable();
        log('表格已刷新', 'info');
    });

    // 表头排序点击
    document.querySelectorAll('#resultTable th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            // 切换排序方向
            if (currentSort.field === field) {
                currentSort.order = currentSort.order === 'desc' ? 'asc' : 'desc';
            } else {
                currentSort.field = field;
                currentSort.order = 'desc';
            }

            // 更新排序选择器
            $('sortSelect').value = `${field}-${currentSort.order}`;
            renderTable();
        });
    });
}

// === 渲染结果表格 ===
function renderTable() {
    const tbody = $('resultTableBody');
    const keywordFilter = $('keywordFilter').value.toLowerCase();
    const countEl = $('resultCount');

    // 过滤数据
    let displayData = tableData.filter(item => {
        if (item['视频标题'] === '无结果') return false;
        if (keywordFilter && item['原搜剧名'] && !item['原搜剧名'].toLowerCase().includes(keywordFilter)) {
            return false;
        }
        return true;
    });

    // 排序
    displayData.sort((a, b) => {
        let aVal, bVal;

        switch (currentSort.field) {
            case 'score':
                aVal = a['Score'] || 0;
                bVal = b['Score'] || 0;
                break;
            case 'views':
                aVal = parseViewCount(a['播放量']) || 0;
                bVal = parseViewCount(b['播放量']) || 0;
                break;
            case 'likes':
                aVal = parseViewCount(a['点赞数']) || 0;
                bVal = parseViewCount(b['点赞数']) || 0;
                break;
            case 'comments':
                aVal = parseViewCount(a['评论数']) || 0;
                bVal = parseViewCount(b['评论数']) || 0;
                break;
            case 'likeRate':
                aVal = parseFloat(a['likeRate']) || 0;
                bVal = parseFloat(b['likeRate']) || 0;
                break;
            case 'commentRate':
                aVal = parseFloat(a['commentRate']) || 0;
                bVal = parseFloat(b['commentRate']) || 0;
                break;
            case 'date':
                aVal = parseDateStr(a['发布时间']) || 9999;
                bVal = parseDateStr(b['发布时间']) || 9999;
                break;
            case 'title':
                aVal = a['视频标题'] || '';
                bVal = b['视频标题'] || '';
                break;
            case 'channel':
                aVal = a['频道名'] || '';
                bVal = b['频道名'] || '';
                break;
            case 'keyword':
                aVal = a['原搜剧名'] || '';
                bVal = b['原搜剧名'] || '';
                break;
            default:
                return 0;
        }

        const isString = typeof aVal === 'string' || typeof bVal === 'string';
        const compareResult = isString
            ? String(aVal).localeCompare(String(bVal))
            : (aVal > bVal ? 1 : aVal < bVal ? -1 : 0);

        return currentSort.order === 'asc' ? compareResult : -compareResult;
    });

    countEl.textContent = `共 ${displayData.length} 条`;

    // 渲染
    if (displayData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" style="text-align: center; color: #666; padding: 40px;">
                    暂无数据
                </td>
            </tr>
        `;
        return;
    }

    // 限制显示数量（避免页面卡顿）
    const maxRows = 100;
    const showData = displayData.slice(0, maxRows);

    tbody.innerHTML = showData.map(item => {
        const score = item['Score'] || 0;
        const scoreClass = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';
        const views = formatNumber(parseViewCount(item['播放量']) || 0);
        const likes = formatNumber(item['点赞数'] || 0);
        const comments = formatNumber(item['评论数'] || 0);
        const date = item['发布时间'] || '';
        const exactDate = item['精确发布日期'] || '';
        const reason = item['Reason'] || '';
        const url = item['链接'] || '';
        const thumbnail = item['封面图'] || '';
        const duration = item['时长'] || '';

        // Generate status icon based on score/reason
        let statusIcon = '';
        let statusTooltip = '';
        if (score >= 70 || (reason && (reason.includes('极高') || reason.includes('强')))) {
            statusIcon = '<span class="status-icon fire">🔥</span>';
            statusTooltip = escapeHtml(reason || '高增速潜力');
        } else if (parseFloat(item['likeRate']) >= 5 || parseFloat(item['commentRate']) >= 1) {
            statusIcon = '<span class="status-icon thumbs-up">👍</span>';
            statusTooltip = escapeHtml(reason || '高互动率');
        } else {
            statusIcon = '<span class="status-icon neutral">●</span>';
            statusTooltip = escapeHtml(reason || '一般');
        }

        // Format duration for display
        const durationDisplay = duration ? formatDuration(duration) : '';

        // Generate relative time
        const relativeTime = formatRelativeTime(date, exactDate);

        // Sanitize URL attributes properly
        const safeUrl = escapeHtmlAttribute(url);
        const safeThumbnail = escapeHtmlAttribute(thumbnail);

        // 生成下载链接（跳转到在线下载网站）
        const videoId = url.match(/\/watch\?v=([^&]+)/)?.[1] || '';
        let downloadBtn = '';
        if (videoId) {
            // ytdown.to 的格式：https://ytdown.to/watch?v=VIDEO_ID
            const onlineDownloadUrl = `https://ytdown.to/watch?v=${videoId}`;
            downloadBtn = `<button class="download-btn" onclick="event.stopPropagation(); window.open('${onlineDownloadUrl}', '_blank')" title="在线下载视频">⬇️</button>`;
        }

        return `
            <tr data-url="${safeUrl}">
                <td style="max-width: 100px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item['原搜剧名'] || '')}</td>
                <td class="thumbnail-cell">
                    ${thumbnail ? `
                        <div class="thumbnail-wrapper">
                            <img src="${safeThumbnail}" alt="thumbnail" loading="lazy">
                            ${durationDisplay ? `<span class="duration-badge">${escapeHtml(durationDisplay)}</span>` : ''}
                        </div>
                    ` : ''}
                </td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item['视频标题'] || '')}">${escapeHtml(item['视频标题'] || '')}</td>
                <td style="max-width: 100px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item['频道名'] || '')}</td>
                <td>${views}</td>
                <td>${likes}</td>
                <td>${comments}</td>
                <td>${item['likeRate'] || 0}%</td>
                <td>${item['commentRate'] || 0}%</td>
                <td class="time-cell" title="${escapeHtml(exactDate || date)}">${relativeTime}</td>
                <td><span class="score-badge ${scoreClass}">${score}</span></td>
                <td class="status-cell">
                    <span class="status-icon-wrapper" title="${statusTooltip}">
                        ${statusIcon}
                    </span>
                </td>
                <td style="text-align: center;">${downloadBtn}</td>
                <td class="link-cell">${url ? `<a href="${safeUrl}" target="_blank">打开</a>` : ''}</td>
            </tr>
        `;
    }).join('');

    if (displayData.length > maxRows) {
        tbody.innerHTML += `
            <tr>
                <td colspan="14" style="text-align: center; color: #888; padding: 10px; font-size: 11px;">
                    仅显示前 ${maxRows} 条，共 ${displayData.length} 条结果。请导出查看完整数据。
                </td>
            </tr>
        `;
    }

    // 添加行点击事件
    tbody.querySelectorAll('tr[data-url]').forEach(row => {
        row.addEventListener('click', (e) => {
            // 如果点击的是链接或其他交互元素，不处理
            if (e.target.tagName === 'A' || e.target.closest('a')) return;

            const url = row.dataset.url;
            if (url) {
                chrome.tabs.create({ url });
            }
        });
    });

    // 更新表头排序指示器
    document.querySelectorAll('#resultTable th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === currentSort.field) {
            th.classList.add(currentSort.order === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

// === 更新表格显示 ===
function updateTableDisplay() {
    const section = $('resultSection');
    if (!section) {
        console.warn('[Dashboard] Result section not found');
        return;
    }

    if (tableData.length > 0) {
        section.classList.add('visible');
        calculateScores(tableData);
        renderTable();
    } else {
        section.classList.remove('visible');
    }
}

// === 格式化数字 ===
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

// === 格式化时长 ===
function formatDuration(str) {
    if (!str) return '';
    // Parse duration like "1:23:45" or "12:34"
    const parts = str.split(':').map(Number);
    if (parts.length === 3) {
        // HH:MM:SS format
        const hours = parts[0];
        const minutes = parts[1];
        const seconds = parts[2];
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else if (parts.length === 2) {
        // MM:SS format
        return `${parts[0]}:${parts[1].toString().padStart(2, '0')}`;
    }
    return str;
}

// === 格式化相对时间 ===
function formatRelativeTime(relativeDateStr, exactDateStr) {
    if (exactDateStr) {
        // Try to parse the exact ISO date
        const exactDate = new Date(exactDateStr);
        if (!isNaN(exactDate.getTime())) {
            return timeAgo(exactDate);
        }
    }

    // Fallback to parsing relative string
    if (!relativeDateStr) return '-';

    const lowerStr = relativeDateStr.toLowerCase();

    // Already in relative format (Chinese)
    if (lowerStr.includes('小时') || lowerStr.includes('小时前') || lowerStr.includes('hour')) {
        const match = relativeDateStr.match(/(\d+)/);
        return match ? `${match[1]}h` : relativeDateStr;
    }
    if (lowerStr.includes('分钟') || lowerStr.includes('分钟前') || lowerStr.includes('minute') || lowerStr.includes('just')) {
        return 'now';
    }
    if (lowerStr.includes('天') || lowerStr.includes('天前') || lowerStr.includes('day')) {
        const match = relativeDateStr.match(/(\d+)/);
        return match ? `${match[1]}d` : relativeDateStr;
    }
    if (lowerStr.includes('周') || lowerStr.includes('周前') || lowerStr.includes('week')) {
        const match = relativeDateStr.match(/(\d+)/);
        return match ? `${match[1]}w` : relativeDateStr;
    }
    if (lowerStr.includes('月') || lowerStr.includes('月前') || lowerStr.includes('month')) {
        const match = relativeDateStr.match(/(\d+)/);
        return match ? `${match[1]}mo` : relativeDateStr;
    }
    if (lowerStr.includes('年') || lowerStr.includes('年前') || lowerStr.includes('year')) {
        const match = relativeDateStr.match(/(\d+)/);
        return match ? `${match[1]}y` : relativeDateStr;
    }
    if (lowerStr.includes('昨天') || lowerStr.includes('yesterday')) {
        return '1d';
    }

    return relativeDateStr;
}

// === 计算相对时间（从日期对象）===
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        年: 31536000,
        月: 2592000,
        周: 604800,
        天: 86400,
        小时: 3600,
        分钟: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            // Short format for display
            const shortUnit = unit === '年' ? 'y' : unit === '月' ? 'mo' : unit === '周' ? 'w' : unit === '天' ? 'd' : unit === '小时' ? 'h' : unit === '分钟' ? 'm' : '';
            return `${interval}${shortUnit}`;
        }
    }

    return 'now';
}
