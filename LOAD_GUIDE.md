# ⚠️ 图文教程：如何正确加载 Chrome 扩展

## 当前问题

你看到的错误：
```
文件：D:\gongzhonghao
错误：清单文件缺失或不可读取
```

这说明你选择了 **D:\gongzhonghao**，但应该选择 **D:\gongzhonghao\build\chrome-mv3-dev**

---

## 📸 完整操作步骤

### 第 1 步：打开扩展页面

在 Chrome 地址栏输入：
```
chrome://extensions/
```

### 第 2 步：启用开发者模式

找到右上角的 **"开发者模式"** 开关，点击打开。

### 第 3 步：点击加载按钮

点击左上角的 **"加载已解压的扩展程序"** 按钮。

### 第 4 步：⚠️ 关键！选择正确的文件夹

**会弹出文件夹选择窗口，请按照以下步骤操作：**

#### 方式 A：使用地址栏（推荐）

1. 在文件夹选择窗口顶部，找到地址栏
2. 删除现有内容
3. 粘贴以下路径：
   ```
   D:\gongzhonghao\build\chrome-mv3-dev
   ```
4. 按 Enter 键
5. 点击"选择文件夹"按钮

#### 方式 B：手动导航

1. 在文件夹选择窗口中，依次双击打开：
   ```
   本地磁盘 (D:)
   └─ gongzhonghao
      └─ build
         └─ chrome-mv3-dev  ← 选择这个文件夹！
   ```

2. 确保 **chrome-mv3-dev** 文件夹被选中（高亮显示）

3. 点击窗口底部的 **"选择文件夹"** 按钮

---

## ✅ 成功的标志

如果你选择了正确的文件夹，将会看到：

### 扩展卡片显示
- ✅ 名称：**DEV | 飞书文档转公众号助手**
- ✅ 描述：AI-powered tool to convert Feishu/Lark...
- ✅ 版本：**0.1.0**
- ✅ 图标：蓝色背景的"飞"字
- ✅ 状态：**已启用**

### 浏览器工具栏
- 右上角出现扩展图标（蓝色小方块）

---

## ❌ 常见错误对照表

| 你选择的路径 | 错误信息 | 原因 |
|------------|---------|------|
| `D:\gongzhonghao` | 清单文件缺失 | 这是项目根目录，不是构建输出 |
| `D:\gongzhonghao\build` | 清单文件缺失 | 这是构建父目录 |
| `D:\gongzhonghao\assets` | 清单文件缺失 | 这是资源目录 |
| `D:\gongzhonghao\build\chrome-mv3-dev` | ✅ 成功 | **正确！这是构建输出目录** |

---

## 📂 目录结构可视化

```
D:\gongzhonghao\                    ← ❌ 不要选择这个
│
├── assets\                         ← ❌ 不要选择这个
│   └── *.png
│
├── build\                          ← ❌ 不要选择这个
│   └── chrome-mv3-dev\             ← ✅ 选择这个！
│       ├── manifest.json           ← 清单文件在这里
│       ├── sidepanel.html
│       ├── *.js
│       └── icon*.png
│
├── src\                            ← ❌ 不要选择这个
├── package.json
└── icon.png
```

---

## 🔍 如何验证目录是否正确

在选择文件夹之前，检查该目录是否包含 `manifest.json`：

### Windows 文件资源管理器

1. 导航到 `D:\gongzhonghao\build\chrome-mv3-dev\`
2. 查看文件列表
3. 确认看到 **manifest.json** 文件

### 命令行验证

```cmd
dir D:\gongzhonghao\build\chrome-mv3-dev\manifest.json
```

应该显示：
```
manifest.json
```

---

## 🎯 最简单的方法

如果你觉得以上步骤太复杂，可以使用这个最简单的方法：

### 复制粘贴完整路径

1. 复制这个路径（包括引号）：
   ```
   D:\gongzhonghao\build\chrome-mv3-dev
   ```

2. 在 Chrome 扩展页面点击"加载已解压的扩展程序"

3. 在弹出的文件夹选择窗口：
   - 按 `Win + R` 打开运行对话框
   - 粘贴路径：`D:\gongzhonghao\build\chrome-mv3-dev`
   - 按回车
   - 这会直接打开正确的文件夹

4. 点击"选择文件夹"

---

## 💡 调试技巧

### 如果仍然看到错误

**检查 1：开发服务器是否正在运行**
```bash
# 在终端运行
pnpm dev
```

应该看到类似的输出：
```
➜  Local:   http://localhost:1234
➜  build/chrome-mv3-dev
```

**检查 2：构建目录是否存在**
```bash
# 在终端运行
dir build\chrome-mv3-dev\manifest.json
```

应该显示文件信息。

**检查 3：完全重新构建**
```bash
pnpm run clean
pnpm dev
```

---

## 📞 仍然无法解决？

如果尝试了所有方法仍然报错，请提供以下信息：

1. 你在文件夹选择窗口中看到的完整路径
2. `build/chrome-mv3-dev/` 目录是否包含 `manifest.json` 文件
3. 终端中 `pnpm dev` 的输出

---

**记住关键点**：选择 `chrome-mv3-dev` 文件夹，而不是项目根目录！
