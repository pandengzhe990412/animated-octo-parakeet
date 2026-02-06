# 安装故障排查指南

## 问题 1：Sharp 库下载超时

### 症状
```
Error: sharp: Installation failed due to network issues
```

### 解决方案

项目已配置 `.npmrc` 文件，使用淘宝镜像加速下载：

```ini
sharp_binary_host=https://npmmirror.com/mirrors/sharp/
sharp_libvips_binary_host=https://npmmirror.com/mirrors/sharp-libvips/
```

### 手动清理步骤

如果安装仍然失败，请按以下步骤操作：

#### Windows (PowerShell)
```powershell
# 1. 清理缓存
pnpm store prune

# 2. 删除 node_modules
Remove-Item -Recurse -Force node_modules

# 3. 删除锁文件（如果存在）
Remove-Item pnpm-lock.yaml

# 4. 重新安装
pnpm install
```

#### Windows (CMD)
```cmd
# 1. 清理缓存
pnpm store prune

# 2. 删除 node_modules
rmdir /s /q node_modules

# 3. 删除锁文件（如果存在）
del pnpm-lock.yaml

# 4. 重新安装
pnpm install
```

#### macOS / Linux
```bash
# 1. 清理缓存
pnpm store prune

# 2. 删除 node_modules
rm -rf node_modules

# 3. 删除锁文件（如果存在）
rm -f pnpm-lock.yaml

# 4. 重新安装
pnpm install
```

---

## 问题 2：@types/juice 404 错误

### 状态
✅ **已解决** - 项目已移除 juice 依赖，改用浏览器原生实现。

### 说明
- `src/lib/inline-css.ts` 现在使用纯浏览器 API，无需外部依赖
- 类型声明已添加到 `src/types/global.d.ts`

---

## 问题 3：依赖版本不匹配

### 验证依赖版本

运行以下命令检查所有依赖是否真实可用：

```bash
pnpm ls --depth=0
```

### 如果出现 `ERR_PNPM_NO_MATCHING_VERSION`

这表示某个包的版本不存在。请检查 `package.json` 中的版本号：

```bash
# 查找不可用的包
pnpm why <package-name>

# 更新到最新版本
pnpm update <package-name>
```

---

## 常见错误及解决方案

### ECONNREFUSED / ETIMEDOUT

**原因**：网络连接问题

**解决**：
1. 确保 `.npmrc` 配置正确
2. 尝试使用 VPN
3. 或者配置公司代理：

```ini
# 在 .npmrc 中添加
proxy=http://your-proxy:port
https-proxy=http://your-proxy:port
```

### CERT_HAS_EXPIRED / UNABLE_TO_VERIFY_LEAF_SIGNATURE

**原因**：SSL 证书问题

**解决**：
```bash
# 临时禁用 SSL 验证（不推荐用于生产）
pnpm install --strict-ssl=false
```

### 404 Not Found

**原因**：包名或版本不存在

**解决**：
1. 检查包名拼写
2. 访问 https://www.npmjs.com/ 确认包是否存在
3. 尝试安装最新版本：
   ```bash
   pnpm add <package-name>@latest
   ```

---

## 完整重装流程

如果以上方法都无效，请执行完整重装：

### 1. 完全清理

```bash
# 停止所有 Plasmo 进程
# Windows: Ctrl+Shift+Esc 打开任务管理器，结束 node.exe

# 清理所有缓存和文件
pnpm store prune
rm -rf node_modules
rm -f pnpm-lock.yaml
rm -rf .plasmo
rm -rf build
rm -rf dist
```

### 2. 清理 NPM 缓存

```bash
# pnpm 缓存
pnpm store prune

# 全局缓存（可选）
pnpm store clear
```

### 3. 重新安装

```bash
# 使用详细日志查看安装过程
pnpm install --reporter=silent
# 或
pnpm install --verbose
```

### 4. 验证安装

```bash
# 检查依赖树
pnpm ls

# 检查是否有安全漏洞
pnpm audit

# 尝试启动项目
pnpm dev
```

---

## 镜像源配置说明

### 当前配置（.npmrc）

```ini
registry=https://registry.npmmirror.com
sharp_binary_host=https://npmmirror.com/mirrors/sharp/
sharp_libvips_binary_host=https://npmmirror.com/mirrors/sharp-libvips/
```

### 其他可用镜像

如果淘宝镜像不稳定，可以尝试：

#### 腾讯云镜像
```ini
registry=https://mirrors.cloud.tencent.com/npm/
sharp_binary_host=https://mirrors.cloud.tencent.com/npm/sharp/
sharp_libvips_binary_host=https://mirrors.cloud.tencent.com/npm/sharp-libvips/
```

#### 华为云镜像
```ini
registry=https://mirrors.huaweicloud.com/repository/npm/
sharp_binary_host=https://mirrors.huaweicloud.com/repository/npm/sharp/
sharp_libvips_binary_host=https://mirrors.huaweicloud.com/repository/npm/sharp-libvips/
```

---

## 获取帮助

如果问题仍未解决：

1. **查看详细日志**：
   ```bash
   pnpm install --verbose > install.log
   ```

2. **检查环境**：
   ```bash
   node --version  # 应该 >= 18.0.0
   pnpm --version  # 应该 >= 8.0.0
   ```

3. **提交 Issue**：
   - 附加 `install.log` 文件
   - 说明操作系统和 Node.js 版本
   - 附带 `package.json` 内容

---

## 快速诊断脚本

创建一个诊断脚本 `check-env.sh`（或 `.bat`）：

### check-env.sh (macOS/Linux)
```bash
#!/bin/bash
echo "=== 环境诊断 ==="
echo "Node 版本: $(node --version)"
echo "PNPM 版本: $(pnpm --version)"
echo "操作系统: $(uname -s)"
echo ""
echo "=== 网络测试 ==="
curl -I https://registry.npmmirror.com
curl -I https://npmmirror.com/mirrors/sharp-libvips/
echo ""
echo "=== 磁盘空间 ==="
df -h
```

### check-env.bat (Windows)
```batch
@echo off
echo === 环境诊断 ===
echo Node 版本:
node --version
echo PNPM 版本:
pnpm --version
echo.
echo === 网络测试 ===
curl -I https://registry.npmmirror.com
curl -I https://npmmirror.com/mirrors/sharp-libvips/
```

运行诊断：
```bash
# macOS/Linux
chmod +x check-env.sh
./check-env.sh

# Windows
check-env.bat
```

---

**最后更新**：2026-02-06
