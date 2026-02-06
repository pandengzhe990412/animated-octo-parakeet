#!/usr/bin/env node

/**
 * Cross-platform clean script
 * Removes build artifacts and cache directories
 */

const fs = require("fs")
const path = require("path")

// Directories to remove
const dirsToRemove = [
  ".plasmo",
  "build",
  "dist",
  "package",
]

/**
 * Recursively delete a directory
 */
function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return
  }

  // Remove directory recursively
  fs.rmSync(dirPath, { recursive: true, force: true })
}

console.log("🧹 Cleaning build artifacts...\n")

let removedCount = 0

for (const dir of dirsToRemove) {
  const dirPath = path.join(process.cwd(), dir)

  if (fs.existsSync(dirPath)) {
    try {
      removeDir(dirPath)
      console.log(`✓ Removed: ${dir}/`)
      removedCount++
    } catch (error) {
      console.error(`✗ Failed to remove ${dir}/:`, error.message)
    }
  } else {
    console.log(`⊘ Skipped: ${dir}/ (not found)`)
  }
}

console.log("\n" + "=".repeat(40))

if (removedCount > 0) {
  console.log(`✨ Cleaned ${removedCount} director${removedCount > 1 ? "ies" : "y"}!`)
} else {
  console.log("✔ Already clean - nothing to remove")
}

console.log("=".repeat(40))
