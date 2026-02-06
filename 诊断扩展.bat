@echo off
chcp 65001 > nul
echo ========================================
echo   扩展诊断工具
echo ========================================
echo.

REM 检查构建目录
echo [1/5] 检查构建目录...
if exist "build\chrome-mv3-dev\manifest.json" (
    echo ✓ 找到 manifest.json
) else (
    echo ✗ 未找到 manifest.json
    echo.
    echo 请先运行: pnpm build
    pause
    exit /b 1
)

if exist "build\chrome-mv3-dev\sidepanel.html" (
    echo ✓ 找到 sidepanel.html
) else (
    echo ✗ 未找到 sidepanel.html
    pause
    exit /b 1
)

if exist "build\chrome-mv3-dev\sidepanel.*.js" (
    echo ✓ 找到 sidepanel.js
) else (
    echo ✗ 未找到 sidepanel.js
    pause
    exit /b 1
)

echo.

REM 检查关键配置
echo [2/5] 检查 manifest.json 配置...
findstr /C:"side_panel" "build\chrome-mv3-dev\manifest.json" > nul
if %errorlevel% equ 0 (
    echo ✓ side_panel 配置存在
) else (
    echo ✗ 缺少 side_panel 配置
)

findstr /C:"scripting" "build\chrome-mv3-dev\manifest.json" > nul
if %errorlevel% equ 0 (
    echo ✓ scripting 权限存在
) else (
    echo ✗ 缺少 scripting 权限
)

echo.

REM 显示文件大小
echo [3/5] 检查文件大小...
for %%A in ("build\chrome-mv3-dev\manifest.json") do echo   manifest.json: %%~zA 字节
for %%A in ("build\chrome-mv3-dev\sidepanel.html") do echo   sidepanel.html: %%~zA 字节
for %%A in ("build\chrome-mv3-dev\sidepanel.*.js") do echo   sidepanel.js: %%~zA 字节

echo.

REM 检查是否已加载到 Chrome
echo [4/5] 检查 Chrome 扩展...
set "EXT_PATH=%USERPROFILE%\AppData\Local\Google\Chrome\User Data\Default\Extensions"
if exist "%EXT_PATH%" (
    echo ✓ Chrome 扩展目录存在
) else (
    echo ! 无法找到 Chrome 扩展目录
    echo   这可能是正常的，取决于 Chrome 安装位置
)

echo.

REM 提供下一步指引
echo [5/5] 下一步操作：
echo.
echo 1. 打开 Chrome 浏览器
echo 2. 访问: chrome://extensions/
echo 3. 打开右上角的"开发者模式"
echo 4. 点击"加载已解压的扩展程序"
echo 5. 选择这个文件夹:
echo.
echo    %CD%\build\chrome-mv3-dev
echo.
echo ========================================
echo   诊断完成
echo ========================================
echo.

REM 询问是否打开构建目录
echo 是否打开构建目录？(Y/N)
set /p OPEN_DIR=
if /i "%OPEN_DIR%"=="Y" (
    explorer "build\chrome-mv3-dev"
)

echo.
echo 按任意键关闭...
pause > nul
