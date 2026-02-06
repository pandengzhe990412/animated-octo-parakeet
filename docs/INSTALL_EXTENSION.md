# Chrome 扩展加载指南

## ❌ 错误原因

你选择了项目根目录 `D:\gongzhonghao`，但应该选择构建输出目录。

## ✅ 正确加载步骤

### 步骤 1：打开 Chrome 扩展页面

在 Chrome 浏览器地址栏输入：
```
chrome://extensions/
```

或者通过菜单：
```
Chrome菜单 → 更多工具 → 扩展程序
```

### 步骤 2：启用开发者模式

在扩展页面右上角，打开 **"开发者模式"** 开关。

### 步骤 3：加载扩展

点击左上角的 **"加载已解压的扩展程序"** 按钮。

### 步骤 4：选择正确的目录 ⚠️ 重要！

**❌ 错误路径**（会导致"清单文件缺失"错误）：
```
D:\gongzhonghao
```

**✅ 正确路径**：
```
D:\gongzhonghao\build\chrome-mv3-dev
```

在文件夹选择器中：
1. 导航到 `D:\gongzhonghao\build\`
2. 选择 `chrome-mv3-dev` 文件夹
3. 点击"选择文件夹"

### 步骤 5：验证加载成功

加载成功后，你应该看到：

**扩展卡片显示**：
- ✅ 名称：飞书文档转公众号助手
- ✅ 图标：蓝色背景的"飞"字图标
- ✅ 版本：0.1.0
- ✅ 状态：已启用

**浏览器工具栏**：
- 右上角应该出现扩展图标（蓝色方块）
- 点击图标可以打开侧边栏

---

## 🔧 常见问题

### 问题 1：找不到 `chrome-mv3-dev` 目录

**原因**：还没有运行 `pnpm dev`

**解决**：
```bash
# 运行开发模式
pnpm dev

# 等待构建完成，看到以下输出：
# ➜  Local:   http://localhost:1234
# ➜  build/chrome-mv3-dev
```

### 问题 2：目录存在但仍报错

**检查清单**：
- [ ] 确认选择了 `chrome-mv3-dev` 而不是项目根目录
- [ ] 确认 `chrome-mv3-dev/manifest.json` 文件存在
- [ ] 尝试重新构建：
  ```bash
  pnpm run clean
  pnpm dev
  ```

### 问题 3：图标不显示

**解决方案**：
1. 确认 `icon.png` 在项目根目录
2. 清理并重新构建：
   ```bash
   pnpm run clean
   pnpm dev
   ```
3. 在扩展页面点击"重新加载"按钮（扩展卡片右下角的箭头图标）

---

## 📂 构建输出目录说明

### 开发模式
```bash
pnpm dev
```
输出目录：`build/chrome-mv3-dev/`

包含：
- `manifest.json` - 扩展清单
- `sidepanel.html` - 侧边栏页面
- `*.js` - 打包后的 JavaScript
- `icon*.png` - 处理后的图标文件

### 生产模式
```bash
pnpm build
```
输出目录：`build/chromium-mv3/`

这是生产环境构建，用于发布到 Chrome Web Store。

---

## 🎯 完整工作流程

### 第一次加载

```bash
# 1. 终端运行
pnpm dev

# 2. 浏览器操作
# 打开 chrome://extensions/
# 启用开发者模式
# 加载 D:\gongzhonghao\build\chrome-mv3-dev
```

### 后续开发

```bash
# 代码会自动热更新
# 修改代码后，刷新扩展即可：

# 方式一：在扩展页面点击重新加载按钮
# 方式二：快捷键 Ctrl+R（在扩展页面）
```

### 卸载扩展

在 `chrome://extensions/` 页面：
1. 找到"飞书文档转公众号助手"
2. 点击"移除"按钮
3. 确认删除

---

## 💡 提示

### 开发时的最佳实践

1. **保持开发服务器运行**：
   ```bash
   pnpm dev  # 保持运行，不要关闭
   ```

2. **代码自动热更新**：
   - 修改代码后，Plasmo 会自动重新构建
   - 在扩展页面点击"重新加载"即可看到更改

3. **查看日志**：
   ```bash
   # 在终端查看构建日志
   # 在浏览器按 F12 查看扩展日志
   ```

4. **清理缓存**（如果遇到奇怪的问题）：
   ```bash
   pnpm run clean
   pnpm dev
   ```

---

## 🔄 重新加载扩展

### 方法一：扩展页面重新加载

1. 打开 `chrome://extensions/`
2. 找到扩展卡片
3. 点击右下角的重新加载图标（🔄）

### 方法二：键盘快捷键

在 `chrome://extensions/` 页面：
- Windows: `Ctrl + R`
- Mac: `Cmd + R`

### 方法三：完全重新加载

```bash
# 停止开发服务器（Ctrl+C）
# 清理缓存
pnpm run clean
# 重新启动
pnpm dev
# 在浏览器重新加载扩展
```

---

**更新时间**：2026-02-06
