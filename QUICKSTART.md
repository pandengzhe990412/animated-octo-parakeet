# 快速启动指南

## ✅ 问题已解决

### 修复的问题
1. **图标路径解析错误** - Plasmo 无法找到 `assets/icon16.png`
2. **构建缓存残留** - 需要清理 `.plasmo` 和 `build` 目录

### 修改内容
- ✅ 将主图标 `icon.png` 复制到项目根目录
- ✅ 移除 `package.json` 中的 `manifest.icons` 配置（让 Plasmo 自动处理）
- ✅ 创建跨平台清理脚本 `scripts/clean.js`
- ✅ 添加 `pnpm run clean` 命令
- ✅ 添加 `predev` 钩子，每次启动前自动清理

---

## 🚀 启动项目

### 方式一：一键启动（推荐）

```bash
pnpm dev
```

**说明**：
- `predev` 钩子会自动运行 `pnpm run clean`
- 自动清理 `.plasmo`、`build`、`dist`、`package` 目录
- 然后启动开发服务器

### 方式二：手动清理后启动

```bash
# 1. 手动清理
pnpm run clean

# 2. 启动开发服务器
pnpm dev
```

### 方式三：组合命令

```bash
# Windows (PowerShell)
pnpm run clean; pnpm dev

# Windows (CMD)
pnpm run clean && pnpm dev

# macOS/Linux
pnpm run clean && pnpm dev
```

---

## 📁 文件结构

```
gongzhonghao/
├── icon.png              # ✅ 主图标（512x512，Plasmo自动处理）
├── assets/               # 备用图标存储（手动生成）
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon512.png
├── scripts/
│   ├── clean.js         # ✅ 跨平台清理脚本
│   └── generate-icons.js # 图标生成脚本
├── .plasmo/             # Plasmo 缓存（自动清理）
└── build/               # 构建输出（自动清理）
```

---

## 🎯 Plasmo 图标处理机制

### Plasmo 的自动处理规则

1. **根目录图标**：Plasmo 会自动识别根目录的以下文件：
   - `icon.png` / `icon.jpg` / `icon.svg`
   - 自动生成所有需要的尺寸（16, 32, 48, 128, 512）

2. **不需要显式配置**：
   ```json
   // ❌ 不需要这样配置
   "manifest": {
     "icons": {
       "16": "assets/icon16.png",
       ...
     }
   }

   // ✅ 只需要在根目录放置 icon.png
   // Plasmo 会自动处理
   ```

3. **优先级**：
   - 如果根目录有 `icon.png`，Plasmo 会自动使用
   - 如果同时在 `manifest.icons` 中配置，Plasmo 会报错
   - **最佳实践**：只使用根目录图标，移除 `manifest.icons` 配置

---

## 🔧 清理脚本说明

### `pnpm run clean`

清理以下目录：
- `.plasmo/` - Plasmo 缓存和构建中间文件
- `build/` - 开发模式构建输出
- `dist/` - 生产模式构建输出
- `package/` - 打包输出

### 自动清理

`package.json` 中配置了 `predev` 钩子：
```json
"scripts": {
  "predev": "pnpm run clean"  // 每次 pnpm dev 前自动执行
}
```

这意味着：
- 每次运行 `pnpm dev` 时，都会先自动清理
- 不需要手动运行 `pnpm run clean`
- 确保每次启动都是干净的构建

---

## 🎨 自定义图标

### 更换主图标

1. 准备一个 512x512 的 PNG 图标
2. 命名为 `icon.png`
3. 放在项目根目录（替换现有的 `icon.png`）
4. 重启开发服务器：
   ```bash
   pnpm dev  # 会自动清理并重新构建
   ```

### 重新生成占位图标

```bash
# 生成蓝色占位图标
pnpm run generate-icons

# 复制主图标到根目录
cp assets/icon512.png icon.png

# 重启开发服务器
pnpm dev
```

---

## ⚠️ 常见问题

### 问题 1：图标不显示

**解决方案**：
1. 确认 `icon.png` 在项目根目录
2. 确认文件名正确（小写，PNG 格式）
3. 清理并重启：
   ```bash
   pnpm run clean
   pnpm dev
   ```
4. 在 Chrome 扩展页面重新加载扩展

### 问题 2：构建缓存导致旧图标显示

**解决方案**：
```bash
# 完全清理
pnpm run clean

# 删除 node_modules/.cache
rm -rf node_modules/.cache

# 重新安装（可选）
pnpm install

# 重启
pnpm dev
```

### 问题 3：Plasmo 报错 "Failed to resolve icon"

**可能原因**：
- `icon.png` 不在根目录
- `package.json` 中同时配置了 `manifest.icons`
- 图标文件格式不正确

**解决方案**：
```bash
# 检查文件是否存在
ls -lh icon.png

# 检查 package.json 配置
cat package.json | grep -A 10 "manifest"

# 确保没有 icons 配置
# 如果有，请删除 manifest.icons 部分
```

---

## 📊 验证清单

启动前检查：

- [ ] `icon.png` 在项目根目录
- [ ] `package.json` 的 `manifest` 中**没有** `icons` 配置
- [ ] 运行 `pnpm run clean` 清理缓存
- [ ] 运行 `pnpm dev` 启动开发服务器
- [ ] 在 Chrome 扩展页面检查图标是否正确显示

---

## 🎯 下一步

项目启动后：

1. **打开 Chrome 扩展页面**：`chrome://extensions/`
2. **启用开发者模式**：右上角开关
3. **加载扩展**：点击"加载已解压的扩展程序"
4. **选择构建目录**：选择项目的 `build/chromium-mv3` 目录
5. **验证图标**：检查扩展卡片、工具栏图标是否正确显示

---

**更新时间**：2026-02-06
