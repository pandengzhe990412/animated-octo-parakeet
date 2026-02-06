#!/bin/bash

# Generate placeholder icons for the Chrome extension

echo "========================================"
echo "  Generate Placeholder Icons"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[!] Error: node_modules not found"
    echo "[!] Please run: pnpm install"
    echo ""
    exit 1
fi

echo "[*] Generating icons..."
echo ""

node scripts/generate-icons.js

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "  Success! Icons generated"
    echo "========================================"
    echo ""
    echo "Icons created in: assets/"
    echo ""
else
    echo ""
    echo "[!] Error: Failed to generate icons"
    echo ""
    exit 1
fi
