#!/usr/bin/env python3
"""
YouTube 长视频下载器 - 专门用于下载 1 小时以上的视频
使用多种绕过策略和断点续传功能

使用方法:
python download_long_video.py "URL" [--quality 1080|720|480|best] [--subtitles]
"""
import sys
import os
import json
import time
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

# ============================================
# 命令行参数解析
# ============================================
def parse_args():
    parser = argparse.ArgumentParser(description='YouTube 视频下载器')
    parser.add_argument('url', help='YouTube 视频链接')
    parser.add_argument('--quality', default='1080', choices=['1080', '720', '480', 'best'],
                       help='视频质量 (默认: 1080)')
    parser.add_argument('--subtitles', action='store_true', help='同时下载字幕')
    return parser.parse_args()

args = parse_args()

# ============================================
# 配置区域
# ============================================
VIDEO_URL = args.url
QUALITY = args.quality
DOWNLOAD_SUBTITLES = args.subtitles
OUTPUT_DIR = Path(r"D:\YT_Market_Tool\youtube-clips")
COOKIES_FILE = Path(r"D:\YT_Market_Tool\cookies.txt")

# ============================================
# FFmpeg 配置 - 如果已安装，指定路径
# ============================================
# 方法1: 如果 ffmpeg 在系统 PATH 中，设为 None
# FFMPEG_PATH = None

# 方法2: 如果 ffmpeg 在特定位置，指定完整路径
FFMPEG_PATH = r"D:\pdf\kaopu\ffmpeg-master-latest-win64-gpl-shared\ffmpeg-master-latest-win64-gpl-shared\bin\ffmpeg.exe"

# 方法3: 如果放在项目目录中
# FFMPEG_PATH = Path(__file__).parent / "ffmpeg.exe"

# ============================================
# 日志和输出
# ============================================
log_file = Path(r"D:\YT_Market_Tool\download_long_video_log.txt")

def log(msg):
    timestamp = datetime.now().strftime("[%H:%M:%S]")
    log_msg = f"{timestamp} {msg}"
    print(log_msg)
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(log_msg + '\n')
        f.flush()

# ============================================
# 检查 yt-dlp
# ============================================
def check_ytdlp():
    try:
        result = subprocess.run(['yt-dlp', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.strip()
            log(f"✅ yt-dlp 已安装: {version}")
            return True
    except FileNotFoundError:
        pass

    log("❌ yt-dlp 未安装")
    log("正在安装 yt-dlp...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '--upgrade', 'yt-dlp'], check=True)
        log("✅ yt-dlp 安装成功")
        return True
    except Exception as e:
        log(f"❌ 安装失败: {e}")
        return False

# ============================================
# 下载策略 1: 使用 cookies 文件
# ============================================
def download_with_cookies():
    if not COOKIES_FILE.exists():
        log(f"⚠️ cookies.txt 不存在: {COOKIES_FILE}")
        return None

    log("🍪 尝试方法 1: 使用 cookies 文件")

    output_template = str(OUTPUT_DIR / '%(title)s.%(ext)s')

    # 根据质量参数构建格式字符串
    if QUALITY == 'best':
        format_str = 'bestvideo+bestaudio/best'
    else:
        format_str = f'bestvideo[height<={QUALITY}][ext=mp4]+bestaudio[ext=m4a]/best[height<={QUALITY}][ext=mp4]/best'

    cmd = [
        'yt-dlp',
        '--cookies', str(COOKIES_FILE),
        '--format', format_str,
        '--output', output_template,
        '--merge-output-format', 'mp4',
    ]

    # 添加 ffmpeg 路径（如果指定）
    if FFMPEG_PATH:
        cmd.extend(['--ffmpeg-location', str(FFMPEG_PATH)])

    # 添加字幕选项
    if DOWNLOAD_SUBTITLES:
        cmd.extend(['--write-subs', '--sub-lang', 'zh-Hans,en', '--embed-subs'])

    cmd.extend(['--progress', '--newline', VIDEO_URL])

    return run_download(cmd, "方法 1 (cookies)")

# ============================================
# 下载策略 2: 从浏览器提取 cookies
# ============================================
def download_from_browser():
    log("🍪 尝试方法 2: 从浏览器提取 cookies")

    # 尝试多个浏览器
    browsers = ['chrome', 'edge', 'firefox', 'brave']

    # 根据质量参数构建格式字符串
    if QUALITY == 'best':
        format_str = 'bestvideo+bestaudio/best'
    else:
        format_str = f'bestvideo[height<={QUALITY}][ext=mp4]+bestaudio[ext=m4a]/best[height<={QUALITY}][ext=mp4]/best'

    for browser in browsers:
        log(f"   尝试浏览器: {browser}")

        output_template = str(OUTPUT_DIR / '%(title)s.%(ext)s')

        cmd = [
            'yt-dlp',
            '--cookies-from-browser', browser,
            '--format', format_str,
            '--output', output_template,
            '--merge-output-format', 'mp4',
        ]

        # 添加 ffmpeg 路径（如果指定）
        if FFMPEG_PATH:
            cmd.extend(['--ffmpeg-location', str(FFMPEG_PATH)])

        # 添加字幕选项
        if DOWNLOAD_SUBTITLES:
            cmd.extend(['--write-subs', '--sub-lang', 'zh-Hans,en', '--embed-subs'])

        cmd.extend(['--progress', '--newline', VIDEO_URL])

        result = run_download(cmd, f"方法 2 ({browser})")
        if result and result['success']:
            return result

    return None

# ============================================
# 下载策略 3: 使用 Android client (绕过机器人检测)
# ============================================
def download_with_android_client():
    log("📱 尝试方法 3: 使用 Android 客户端 (绕过机器人检测)")

    output_template = str(OUTPUT_DIR / '%(title)s.%(ext)s')

    # 根据质量参数构建格式字符串
    if QUALITY == 'best':
        format_str = 'bestvideo+bestaudio/best'
    else:
        format_str = f'bestvideo[height<={QUALITY}][ext=mp4]+bestaudio[ext=m4a]/best[height<={QUALITY}][ext=mp4]/best'

    cmd = [
        'yt-dlp',
        '--extractor-args', 'youtube:player_client=android',
        '--format', format_str,
        '--output', output_template,
        '--merge-output-format', 'mp4',
    ]

    # 添加 ffmpeg 路径（如果指定）
    if FFMPEG_PATH:
        cmd.extend(['--ffmpeg-location', str(FFMPEG_PATH)])

    # 添加字幕选项
    if DOWNLOAD_SUBTITLES:
        cmd.extend(['--write-subs', '--sub-lang', 'zh-Hans,en', '--embed-subs'])

    cmd.extend(['--progress', '--newline', VIDEO_URL])

    return run_download(cmd, "方法 3 (Android)")

# ============================================
# 下载策略 4: 使用 iOS client
# ============================================
def download_with_ios_client():
    log("📱 尝试方法 4: 使用 iOS 客户端")

    output_template = str(OUTPUT_DIR / '%(title)s.%(ext)s')

    # 根据质量参数构建格式字符串
    if QUALITY == 'best':
        format_str = 'bestvideo+bestaudio/best'
    else:
        format_str = f'bestvideo[height<={QUALITY}][ext=mp4]+bestaudio[ext=m4a]/best[height<={QUALITY}][ext=mp4]/best'

    cmd = [
        'yt-dlp',
        '--extractor-args', 'youtube:player_client=ios',
        '--format', format_str,
        '--output', output_template,
        '--merge-output-format', 'mp4',
    ]

    # 添加 ffmpeg 路径（如果指定）
    if FFMPEG_PATH:
        cmd.extend(['--ffmpeg-location', str(FFMPEG_PATH)])

    # 添加字幕选项
    if DOWNLOAD_SUBTITLES:
        cmd.extend(['--write-subs', '--sub-lang', 'zh-Hans,en', '--embed-subs'])

    cmd.extend(['--progress', '--newline', VIDEO_URL])

    return run_download(cmd, "方法 4 (iOS)")

# ============================================
# 下载策略 5: 使用 embed URL (绕过某些限制)
# ============================================
def download_with_embed():
    log("🔗 尝试方法 5: 使用 embed URL")

    # 转换为 embed URL
    if 'watch?v=' in VIDEO_URL:
        video_id = VIDEO_URL.split('watch?v=')[1].split('&')[0]
        embed_url = f"https://www.youtube.com/embed/{video_id}"
    elif 'youtu.be/' in VIDEO_URL:
        video_id = VIDEO_URL.split('youtu.be/')[1].split('?')[0]
        embed_url = f"https://www.youtube.com/embed/{video_id}"
    else:
        log("⚠️ 无法转换为 embed URL")
        return None

    output_template = str(OUTPUT_DIR / '%(title)s.%(ext)s')

    # 根据质量参数构建格式字符串
    if QUALITY == 'best':
        format_str = 'bestvideo+bestaudio/best'
    else:
        format_str = f'bestvideo[height<={QUALITY}][ext=mp4]+bestaudio[ext=m4a]/best[height<={QUALITY}][ext=mp4]/best'

    cmd = [
        'yt-dlp',
        '--format', format_str,
        '--output', output_template,
        '--merge-output-format', 'mp4',
    ]

    # 添加 ffmpeg 路径（如果指定）
    if FFMPEG_PATH:
        cmd.extend(['--ffmpeg-location', str(FFMPEG_PATH)])

    # 添加字幕选项
    if DOWNLOAD_SUBTITLES:
        cmd.extend(['--write-subs', '--sub-lang', 'zh-Hans,en', '--embed-subs'])

    cmd.extend(['--progress', '--newline', embed_url])

    return run_download(cmd, "方法 5 (embed)")

# ============================================
# 执行下载的通用函数
# ============================================
def run_download(cmd, method_name):
    log(f"🚀 执行命令...")
    log(f"命令: {' '.join(cmd[:5])}...")

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        last_progress = 0
        download_file = None

        for line in process.stdout:
            line = line.strip()
            if line:
                print(line)  # 实时输出

                # 解析进度信息
                if '[download]' in line:
                    if '%' in line:
                        try:
                            progress_str = line.split('%')[0].split()[-1]
                            progress = float(progress_str)
                            if progress > last_progress + 5:  # 每5%记录一次
                                log(f"   下载进度: {progress:.1f}%")
                                last_progress = progress
                        except:
                            pass

                    # 检测下载的文件名
                    if 'Destination' in line:
                        download_file = line.split('Destination:')[-1].strip()
                        log(f"   目标文件: {download_file}")

                # 检测完成
                if '100%' in line:
                    log("✅ 下载完成!")

        returncode = process.wait()

        if returncode == 0:
            log(f"✅ {method_name} 成功!")

            # 查找下载的文件
            if download_file and Path(download_file).exists():
                file_size = Path(download_file).stat().st_size / (1024*1024)
                log(f"文件大小: {file_size:.2f} MB")

                return {
                    'success': True,
                    'method': method_name,
                    'file_path': str(download_file),
                    'file_size_mb': file_size
                }

            # 如果找不到具体文件，搜索最新下载的视频
            mp4_files = list(OUTPUT_DIR.glob("*.mp4"))
            if mp4_files:
                latest_file = max(mp4_files, key=lambda p: p.stat().st_mtime)
                file_size = latest_file.stat().st_size / (1024*1024)
                log(f"找到文件: {latest_file.name}")
                log(f"文件大小: {file_size:.2f} MB")

                return {
                    'success': True,
                    'method': method_name,
                    'file_path': str(latest_file),
                    'file_size_mb': file_size
                }

            return {'success': True, 'method': method_name}
        else:
            log(f"⚠️ {method_name} 失败 (返回码: {returncode})")
            return None

    except Exception as e:
        log(f"❌ {method_name} 出错: {e}")
        return None

# ============================================
# 主函数
# ============================================
def main():
    log("="*60)
    log("YouTube 长视频下载器")
    log("="*60)
    log(f"视频 URL: {VIDEO_URL}")
    log(f"视频质量: {QUALITY}")
    log(f"下载字幕: {'是' if DOWNLOAD_SUBTITLES else '否'}")
    log(f"输出目录: {OUTPUT_DIR}")
    log("="*60)

    # 创建输出目录
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 检查 yt-dlp
    if not check_ytdlp():
        log("❌ 无法继续，请手动安装 yt-dlp")
        log("命令: pip install yt-dlp")
        return

    # 获取视频信息
    log("📊 获取视频信息...")
    info_cmd = ['yt-dlp', '--dump-json', VIDEO_URL]

    try:
        result = subprocess.run(info_cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            info = json.loads(result.stdout)
            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            duration_min = duration // 60
            duration_sec = duration % 60
            log(f"标题: {title}")
            log(f"时长: {duration_min}分{duration_sec}秒 ({duration}秒)")

            if duration > 3600:  # 超过1小时
                log(f"⏰ 这是一个长视频 ({duration_min} 分钟)")
                log("⚠️ 下载可能需要较长时间，请耐心等待...")
    except Exception as e:
        log(f"⚠️ 无法获取视频信息: {e}")

    # 尝试不同的下载方法
    methods = [
        download_with_cookies,
        download_from_browser,
        download_with_android_client,
        download_with_ios_client,
        download_with_embed,
    ]

    for method in methods:
        try:
            result = method()
            if result and result.get('success'):
                log("="*60)
                log("🎉 下载成功!")
                log(f"使用方法: {result['method']}")
                if 'file_path' in result:
                    log(f"文件路径: {result['file_path']}")
                if 'file_size_mb' in result:
                    log(f"文件大小: {result['file_size_mb']:.2f} MB")
                log("="*60)

                # 保存结果
                result_file = OUTPUT_DIR / "download_result.json"
                result['timestamp'] = datetime.now().isoformat()
                result['video_url'] = VIDEO_URL
                with open(result_file, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)

                return
        except Exception as e:
            log(f"⚠️ 方法出错: {e}")
            continue

    # 所有方法都失败
    log("="*60)
    log("❌ 所有下载方法都失败了")
    log("="*60)
    log("")
    log("可能的原因:")
    log("1. YouTube 机器人验证 - 需要有效的 cookies")
    log("2. 视频有地区限制")
    log("3. 网络连接问题")
    log("")
    log("建议:")
    log("1. 等待几小时后重试")
    log("2. 尝试更换网络/IP")
    log("3. 关闭所有浏览器后重试")
    log("4. 使用 VPN 连接到其他地区")
    log("")
    log("获取 Cookies 的方法:")
    log("1. 安装浏览器扩展: 'Get cookies.txt LOCALLY'")
    log("2. 访问 YouTube 并登录")
    log("3. 导出 cookies 到: " + str(COOKIES_FILE))
    log("4. 重新运行此脚本")
    log("="*60)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log("\n⚠️ 用户中断下载")
    except Exception as e:
        log(f"\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
