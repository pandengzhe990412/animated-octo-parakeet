@echo off
REM Generate placeholder icons for the Chrome extension

echo ========================================
echo   Generate Placeholder Icons
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [!] Error: node_modules not found
    echo [!] Please run: pnpm install
    echo.
    pause
    exit /b 1
)

echo [*] Generating icons...
echo.

node scripts/generate-icons.js

if %errorLevel% == 0 (
    echo.
    echo ========================================
    echo   Success! Icons generated
    echo ========================================
    echo.
    echo Icons created in: assets\
    echo.
) else (
    echo.
    echo [!] Error: Failed to generate icons
    echo.
)

pause
