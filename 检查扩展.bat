@echo off
chcp 65001 > nul
cls
echo ========================================
echo   检查扩展文件
echo ========================================
echo.

cd /d "%~dp0"

echo [检查] 必需文件...
echo.

set "BUILD_DIR=build\chrome-mv3-dev"
set "ALL_OK=1"

if exist "%BUILD_DIR%\manifest.json" (
    echo [OK] manifest.json
) else (
    echo [FAIL] manifest.json - 未找到
    set "ALL_OK=0"
)

if exist "%BUILD_DIR%\sidepanel.html" (
    echo [OK] sidepanel.html
) else (
    echo [FAIL] sidepanel.html - 未找到
    set "ALL_OK=0"
)

if exist "%BUILD_DIR%\sidepanel.*.js" (
    echo [OK] sidepanel.js
) else (
    echo [FAIL] sidepanel.js - 未找到
    set "ALL_OK=0"
)

if exist "%BUILD_DIR%\content.*.js" (
    echo [OK] content.js
) else (
    echo [FAIL] content.js - 未找到
    set "ALL_OK=0"
)

if exist "%BUILD_DIR%\icon*.png" (
    echo [OK] 图标文件
) else (
    echo [FAIL] 图标文件 - 未找到
    set "ALL_OK=0"
)

echo.
echo ========================================

if "%ALL_OK%"=="1" (
    echo ✓ 所有文件检查通过！
    echo.
    echo 下一步：在 Chrome 中加载扩展
    echo.
    echo 1. 打开 chrome://extensions/
    echo 2. 开启"开发者模式"
    echo 3. 点击"加载已解压的扩展程序"
    echo 4. 选择这个文件夹：
    echo.
    echo    %CD%\%BUILD_DIR%
    echo.
) else (
    echo ✗ 文件检查失败！
    echo.
    echo 请运行以下命令重新构建：
    echo.
    echo   cd %CD%
    echo   pnpm build
    echo.
)

echo ========================================
echo.
echo 按任意键关闭...
pause > nul

REM 询问是否打开文件夹
echo.
echo 是否打开构建目录？ (Y/N)
set /p OPEN=
if /i "%OPEN%"=="Y" (
    explorer "%BUILD_DIR%"
)
