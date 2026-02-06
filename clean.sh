#!/bin/bash

# 项目清理脚本 - macOS/Linux
# 用于清理所有缓存和生成文件，准备重新安装

set -e

echo "========================================"
echo "  清理项目缓存和依赖"
echo "========================================"
echo ""

# 检查是否为 macOS 或 Linux
OS_TYPE=$(uname -s)
echo "检测到操作系统: $OS_TYPE"
echo ""

echo "[1/5] 停止 Plasmo 开发服务器..."
if pgrep -f "plasmo" > /dev/null; then
    pkill -f "plasmo" || true
    echo "[√] 已停止 Plasmo 进程"
else
    echo "[i] 没有运行中的 Plasmo 进程"
fi
echo ""

echo "[2/5] 清理 node_modules..."
if [ -d "node_modules" ]; then
    # macOS 使用 GNU rm 或 BSD rm
    if [ "$OS_TYPE" = "Darwin" ]; then
        rm -rf node_modules
    else
        rm -rf node_modules
    fi
    echo "[√] node_modules 已删除"
else
    echo "[i] node_modules 不存在"
fi
echo ""

echo "[3/5] 清理锁文件..."
if [ -f "pnpm-lock.yaml" ]; then
    rm -f pnpm-lock.yaml
    echo "[√] pnpm-lock.yaml 已删除"
else
    echo "[i] pnpm-lock.yaml 不存在"
fi
echo ""

echo "[4/5] 清理构建文件..."
rm -rf .plasmo build dist package 2>/dev/null || true
echo "[√] 构建文件已清理"
echo ""

echo "[5/5] 清理 PNPM 缓存..."
if command -v pnpm &> /dev/null; then
    pnpm store prune
    echo "[√] PNPM 缓存已清理"
else
    echo "[!] PNPM 未安装，跳过缓存清理"
fi
echo ""

echo "========================================"
echo "  清理完成！"
echo "========================================"
echo ""
echo "下一步操作："
echo "  1. 运行安装命令: pnpm install"
echo "  2. 启动开发模式: pnpm dev"
echo ""
