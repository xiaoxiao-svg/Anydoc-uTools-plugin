# 文档转Markdown（uTools 插件）

基于 [firecrawl/anydoc](https://github.com/firecrawl/anydoc)（MIT）的 uTools 插件：将 Word、PPT、Excel、PDF、EPUB 等 14 种文档格式一键转换为干净的 GitHub-Flavored Markdown。

- **纯本地离线**：WebAssembly 转换引擎，文件不出本机
- **毫秒级转换**：官方基准中位耗时 4.4ms/文档
- **输出灵活**：复制到剪贴板 / 粘贴回上一窗口 / 另存为 / 保存到源目录

## 使用方式

| 方式 | 说明 |
|---|---|
| 选中/拖入文档 | 选中文件后搜索「文档转Markdown」并回车，或直接拖入文件 |
| 关键词进入 | 搜索「文档转Markdown」打开界面手动选择 |

支持格式：`doc docx docm`、`ppt pps pot pptx pptm ppsx ppsm`、`xls xlsx xlsm xlsb`、`odt ods odp`、`rtf epub csv pdf`

## AI Agent 工具

插件向 AI Agent（如 OpenClaw、Claude Code 等支持 uTools 工具的宿主）暴露 `doc_to_markdown` 工具，可直接把本地文档转为 Markdown，无需打开界面。

| 参数 | 类型 | 说明 |
|---|---|---|
| `filePaths` | string（必填） | 单个文档绝对路径，或多个路径用换行 / 逗号 / 分号分隔（批量） |
| `outputDir` | string（可选） | 统一输出目录；缺省时在源文件同目录输出 `.md` |
| `returnContent` | boolean（可选） | 为 `true` 时在结果中附带 markdown 文本，默认只返回输出路径 |

返回 `results`：每项含 `filePath`、`outputPath`、`ok`，失败项含 `error`。

调用示例：

```json
{ "filePaths": "D:\\文档\\示例.epub", "returnContent": true }
```

实现要点与踩坑见 `docs/agent-tool.md`。

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
