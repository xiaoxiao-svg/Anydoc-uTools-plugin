# 文档转 Markdown（uTools 插件）

基于 [firecrawl/anydoc](https://github.com/firecrawl/anydoc)（MIT）的 uTools 插件：将 Word、PPT、Excel、PDF、EPUB 等 14 种文档格式一键转换为干净的 GitHub-Flavored Markdown。

- **纯本地离线**：WebAssembly 转换引擎，文件不出本机
- **毫秒级转换**：官方基准中位耗时 4.4ms/文档
- **输出灵活**：复制到剪贴板 / 粘贴回上一窗口 / 另存为 / 保存到源目录

## 使用方式

| 方式 | 说明 |
|---|---|
| 选中/拖入文档 | 选中文件后搜索「文件转markdown」并回车，或直接拖入文件 |
| 关键词进入 | 搜索「文件转markdown」打开界面手动选择 |

支持格式：`doc docx docm`、`ppt pps pot pptx pptm ppsx ppsm`、`xls xlsx xlsm xlsb`、`odt ods odp`、`rtf epub csv pdf`

## 开发

```bash
npm install
npm run dev        # 开发模式，配置 development.main 热更新
npm run build      # 构建到 dist/
```

构建后在 uTools 开发者工具中选择 `dist/plugin.json` 打包。

## 技术栈

- Vite + Vue 3 + TypeScript（`target: es2021`，兼容 uTools 的 Chromium 91）
- 转换引擎：`@firecrawl/anydoc-wasm`（官方 WebAssembly 绑定，MIT）

## 授权

- 插件代码：MIT
- 转换引擎：anydoc，MIT，https://github.com/firecrawl/anydoc
