@echo off
REM 这个脚本会直接打开扩展所在的文件夹

echo ========================================
echo   打开 Chrome 扩展构建目录
echo ========================================
echo.

REM 检查目录是否存在
if exist "build\chrome-mv3-dev\manifest.json" (
    echo [√] 找到扩展文件
    echo.
    echo [*] 正在打开文件夹...
    echo.

    REM 打开文件夹
    explorer "build\chrome-mv3-dev"

    echo.
    echo ========================================
    echo   接下来的步骤：
    echo ========================================
    echo.
    echo 1. 在打开的文件夹窗口中，确认看到：
    echo    - manifest.json
    echo    - sidepanel.html
    echo    - 一些 *.js 文件
    echo.
    echo 2. 回到 Chrome 浏览器
    echo.
    echo 3. 在 chrome://extensions/ 页面
    echo    点击"加载已解压的扩展程序"
    echo.
    echo 4. 在文件夹选择器中：
    echo    - 当前文件夹应该已经被选中
    echo    - 直接点击"选择文件夹"按钮
    echo.
    echo ========================================

) else (
    echo [×] 错误：找不到扩展文件
    echo.
    echo 请先运行以下命令构建扩展：
    echo   pnpm dev
    echo.
)

echo.
echo 按任意键关闭此窗口...
pause > nul
