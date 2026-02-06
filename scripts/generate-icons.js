#!/usr/bin/env node

/**
 * Generate placeholder icons for the Chrome extension
 * This script uses Sharp to create simple colored icons
 */

const sharp = require("sharp")
const path = require("path")
const fs = require("fs")

// Icon sizes to generate
const sizes = [16, 32, 48, 128, 512]

// Icon color (blue gradient)
const backgroundColor = {
  r: 59,
  g: 130,
  b: 246,
}

const textColor = {
  r: 255,
  g: 255,
  b: 255,
}

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, "..", "assets")
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
  console.log(`✓ Created directory: ${assetsDir}`)
}

// Generate icons
async function generateIcons() {
  console.log("🎨 Generating placeholder icons...\n")

  for (const size of sizes) {
    const outputPath = path.join(assetsDir, `icon${size}.png`)

    try {
      // Create a simple colored square with text
      const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" fill="rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})"/>
          <text
            x="50%"
            y="50%"
            font-family="Arial, sans-serif"
            font-size="${size * 0.4}"
            font-weight="bold"
            fill="rgb(${textColor.r}, ${textColor.g}, ${textColor.b})"
            text-anchor="middle"
            dominant-baseline="central"
          >飞</text>
        </svg>
      `

      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(outputPath)

      console.log(`✓ Generated icon${size}.png (${size}x${size})`)
    } catch (error) {
      console.error(`✗ Failed to generate icon${size}.png:`, error.message)
    }
  }

  console.log("\n✨ All icons generated successfully!")
  console.log(`📁 Location: ${assetsDir}`)
}

// Run the generator
generateIcons().catch((error) => {
  console.error("\n❌ Error generating icons:", error)
  process.exit(1)
})
