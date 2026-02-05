#!/usr/bin/env python3
"""
下载 YouTube 视频和字幕
"""
import sys
import json
from pathlib import Path

def ensure_yt_dlp():
    try:
        import yt_dlp  # type: ignore
        return yt_dlp
    except ImportError:
        print("Installing yt-dlp...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "yt-dlp", "-q"])
        import yt_dlp  # type: ignore
        return yt_dlp

def resolve_output_dir(output_dir):
    if output_dir is None:
        output_dir = Path.cwd()
    else:
        output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir

def find_downloaded_files(output_dir, video_id):
    video_path = None
    subtitle_path = None
    for file in output_dir.glob(f"{video_id}.*"):
        if file.suffix == '.mp4':
            video_path = file
        elif file.suffix == '.vtt' or 'en.vtt' in file.name:
            subtitle_path = file
    return video_path, subtitle_path

def download_video(url, output_dir=None):
    yt_dlp = ensure_yt_dlp()
    output_dir = resolve_output_dir(output_dir)

    print(f"Downloading video from: {url}")
    print(f"Output directory: {output_dir}")

    ydl_opts = {
        'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
        'outtmpl': str(output_dir / '%(id)s.%(ext)s'),
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'subtitlesformat': 'vtt',
        'quiet': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Get video info
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            video_id = info.get('id', 'unknown')

            print(f"\nVideo Information:")
            print(f"  Title: {title}")
            print(f"  Duration: {duration // 60}:{duration % 60:02d}")
            print(f"  Video ID: {video_id}")

            # Download
            print("\nStarting download...")
            info = ydl.extract_info(url, download=True)

            # Find downloaded files
            video_path, subtitle_path = find_downloaded_files(output_dir, video_id)

            result = {
                'video_path': str(video_path) if video_path else None,
                'subtitle_path': str(subtitle_path) if subtitle_path else None,
                'title': title,
                'duration': duration,
                'video_id': video_id
            }

            print(f"\nDownload completed!")
            print(f"Video: {video_path}")
            print(f"Subtitle: {subtitle_path}")

            return result

    except Exception as e:
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://youtu.be/jKr9Omaf3Gs?si=vkDJoZEuaKw1Q1UT"
    result = download_video(url)
    print("\n" + "="*60)
    print(json.dumps(result, indent=2, ensure_ascii=False))
