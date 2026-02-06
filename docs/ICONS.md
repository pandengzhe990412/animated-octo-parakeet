# 图标生成说明

## 概述

Chrome 扩展需要多种尺寸的图标文件。本项目提供了一个自动生成脚本，使用 Sharp 库创建占位图标。

## 图标尺寸

项目需要以下尺寸的图标：
- **16x16** - 浏览器工具栏小图标
- **32x32** - Windows 托盘图标等
- **48x48** - 扩展管理页面
- **128x128** - Chrome Web Store 和安装对话框
- **512x512** - 开发者仪表板和其他高分辨率场景

## 快速生成

### 方法一：使用 npm 脚本（推荐）

```bash
# 生成所有图标
pnpm run generate-icons

# 或使用 npm
npm run generate-icons

# 或使用 yarn
yarn generate-icons
```

### 方法二：直接运行脚本

```bash
node scripts/generate-icons.js
```

### 方法三：使用批处理脚本

#### Windows
双击运行 `generate-icons.bat`

#### macOS/Linux
```bash
chmod +x generate-icons.sh
./generate-icons.sh
```

## 图标样式

当前生成的占位图标特点：
- **背景色**：蓝色渐变 (#3b82f6)
- **文字**：白色 "飞" 字（代表飞书）
- **形状**：正方形圆角

## 自定义图标

如果你想使用自己的图标，请：

1. 准备一个高分辨率图标（建议 512x512 或更大）
2. 使用图像处理软件（如 Photoshop、GIMP）导出以下尺寸：
   - icon16.png (16x16)
   - icon32.png (32x32)
   - icon48.png (48x48)
   - icon128.png (128x128)
   - icon512.png (512x512)
3. 将文件放到 `assets/` 目录
4. 确保所有图标都是 PNG 格式

## 推荐设计工具

- **Figma** - https://www.figma.com/ （免费，推荐）
- **Canva** - https://www.canva.com/
- **Photopea** - https://www.photopea.com/ （免费在线 Photoshop 替代品）
- **GIMP** - https://www.gimp.org/ （免费开源）

## 设计规范

### Chrome 扩展图标设计最佳实践

1. **简洁明了** - 避免过多细节
2. **高对比度** - 确保在深色和浅色主题都可见
3. **品牌一致性** - 使用品牌主色调
4. **可识别性** - 即使在小尺寸下也清晰可辨

### 尺寸建议

- **16x16**: 避免文字，使用简单图形
- **32x32**: 可以包含简单文字或图标
- **48x48**: 主要品牌标识
- **128x128**: 详细版本的品牌标识
- **512x512**: 高分辨率版本，可用于营销材料

## 修改生成脚本

如果你想修改自动生成的图标样式，编辑 `scripts/generate-icons.js`：

```javascript
// 修改颜色
const backgroundColor = {
  r: 59,   // 红色 (0-255)
  g: 130,  // 绿色 (0-255)
  b: 246,  // 蓝色 (0-255)
}

// 修改文字
<text>飞</text>  <!-- 改成你想要的文字 -->

// 修改形状
<rect ... />     <!-- 正方形 -->
<circle ... />   <!-- 圆形 -->
```

## 故障排查

### 错误：Cannot find module 'sharp'

**解决方案**：
```bash
pnpm install
```

### 错误：ENOENT: no such file or directory

**解决方案**：确保 `assets/` 目录存在
```bash
mkdir assets
```

### 生成的图标不显示

**检查清单**：
- [ ] 确认 `package.json` 中的 `manifest.icons` 路径正确
- [ ] 确认图标文件确实在 `assets/` 目录
- [ ] 重新加载扩展（chrome://extensions/ → 点击刷新按钮）

## 相关文件

- `package.json` - 图标路径配置
- `scripts/generate-icons.js` - 图标生成脚本
- `assets/` - 图标文件存储目录

---

**更新时间**：2026-02-06
