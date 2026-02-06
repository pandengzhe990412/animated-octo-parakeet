@echo off
REM 项目清理脚本 - Windows
REM 用于清理所有缓存和生成文件，准备重新安装

echo ========================================
echo   清理项目缓存和依赖
echo ========================================
echo.

REM 检查是否以管理员身份运行
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [√] 已获得管理员权限
) else (
    echo [!] 警告: 未以管理员身份运行，可能遇到权限问题
    echo.
)

echo [1/5] 停止 Plasmo 开发服务器...
taskkill /F /IM node.exe /T 2>nul
if %errorLevel% == 0 (
    echo [√] 已停止所有 Node 进程
) else (
    echo [i] 没有运行中的 Node 进程
)
echo.

echo [2/5] 清理 node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    if %errorLevel% == 0 (
        echo [√] node_modules 已删除
    ) else (
        echo [×] 删除 node_modules 失败，请手动删除
        pause
        exit /b 1
    )
) else (
    echo [i] node_models 不存在
)
echo.

echo [3/5] 清理锁文件...
if exist pnpm-lock.yaml (
    del /q pnpm-lock.yaml
    echo [√] pnpm-lock.yaml 已删除
) else (
    echo [i] pnpm-lock.yaml 不存在
)
echo.

echo [4/5] 清理构建文件...
if exist .plasmo rmdir /s /q .plasmo
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist package rmdir /s /q package
echo [√] 构建文件已清理
echo.

echo [5/5] 清理 PNPM 缓存...
pnpm store prune
if %errorLevel% == 0 (
    echo [√] PNPM 缓存已清理
) else (
    echo [!] PNPM 缓存清理失败，请手动运行: pnpm store prune
)
echo.

echo ========================================
echo   清理完成！
echo ========================================
echo.
echo 下一步操作：
echo   1. 运行安装命令: pnpm install
echo   2. 启动开发模式: pnpm dev
echo.

pause
