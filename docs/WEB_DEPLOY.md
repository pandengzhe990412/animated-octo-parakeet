# 网页版部署说明（GitHub Pages）

## 本地启动

```bash
pnpm install
pnpm dev
```

启动后浏览器打开 `http://localhost:5173`。

## 本地打包

```bash
pnpm build
pnpm preview
```

打包产物在 `dist/`。

## GitHub Pages 自动发布

项目已包含工作流文件：`.github/workflows/deploy-pages.yml`。

你只需要：

1. 把仓库推送到 GitHub 的 `main` 分支。
2. 打开仓库 `Settings > Pages`。
3. 在 `Build and deployment` 里选择 `Source = GitHub Actions`。
4. 再次 push 一次代码（或手动触发 workflow）。

发布完成后，GitHub 会在 Actions 日志里给出页面地址。

## 兼容说明

- 当前默认命令已经切到网页版：
  - `pnpm dev` -> 网页开发
  - `pnpm build` -> 网页打包
- 扩展版命令仍保留：
  - `pnpm dev:ext`
  - `pnpm build:ext`
  - `pnpm package:ext`
