#!/usr/bin/env python3
"""
只下载字幕，不下载视频
"""
import sys
import json
from pathlib import Path

try:
    import yt_dlp
except ImportError:
    print("Installing yt-dlp...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "yt-dlp", "-q"])
    import yt_dlp

def download_subtitles_only(url, output_dir):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Downloading subtitles for: {url}")
    print(f"Output directory: {output_dir}\n")

    ydl_opts = {
        'skip_download': True,  # 不下载视频
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'zh-Hans', 'zh-Hant'],  # 英文、简体中文、繁体中文
        'subtitlesformat': 'vtt',
        'outtmpl': str(output_dir / '%(id)s.%(ext)s'),
        'quiet': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            video_id = info.get('id', 'unknown')

            print(f"\nVideo Information:")
            print(f"  Title: {title}")
            print(f"  Duration: {duration // 60}:{duration % 60:02d}")
            print(f"  Video ID: {video_id}")

            # 下载字幕
            print("\nDownloading subtitles...")
            ydl.extract_info(url, download=False)

            # 查找字幕文件
            subtitle_files = list(output_dir.glob(f"{video_id}*.vtt"))

            print(f"\nFound {len(subtitle_files)} subtitle file(s):")
            for f in subtitle_files:
                print(f"  - {f.name}")

            return {
                'title': title,
                'duration': duration,
                'video_id': video_id,
                'subtitle_files': [str(f) for f in subtitle_files]
            }

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    url = "https://youtu.be/jKr9Omaf3Gs?si=vkDJoZEuaKw1Q1UT"
    result = download_subtitles_only(url, r"D:\YT_Market_Tool\youtube-clips")

    if result:
        print("\n" + "="*60)
        print("RESULT:")
        print("="*60)
        print(json.dumps(result, indent=2, ensure_ascii=False))
