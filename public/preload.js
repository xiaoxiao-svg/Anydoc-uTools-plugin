const fs = require('fs')
const path = require('path')

const readFileBytes = (filePath) => {
  const buf = fs.readFileSync(filePath)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

const readFileBytesAsync = async (filePath) => {
  const buf = await fs.promises.readFile(filePath)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

const writeFile = (filePath, text) => {
  fs.writeFileSync(filePath, text, 'utf8')
}

const stat = (filePath) => {
  const s = fs.statSync(filePath)
  return { size: s.size, isFile: s.isFile(), isDirectory: s.isDirectory() }
}

const dirOf = (filePath) => path.dirname(filePath)
const joinPath = (...parts) => path.join(...parts)
const baseName = (filePath) => path.basename(filePath, path.extname(filePath))

const readWasmBytes = () => {
  const p = path.join(__dirname, 'wasm', 'anydoc_wasm_bg.wasm')
  const buf = fs.readFileSync(p)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

const wasmPath = path.join(__dirname, 'wasm', 'anydoc_wasm_bg.wasm')
const wasmGlue = require('./wasm/anydoc_wasm.cjs')
let wasmReadyPromise = null

const ensureWasmModule = () => {
  if (!wasmReadyPromise) {
    wasmReadyPromise = (async () => {
      const bytes = fs.readFileSync(wasmPath)
      const imports = wasmGlue.__wbg_get_imports()
      const module = await WebAssembly.compile(bytes)
      const instance = await WebAssembly.instantiate(module, imports)
      wasmGlue.__wbg_finalize_init(instance, module)
      return wasmGlue
    })().catch((err) => {
      wasmReadyPromise = null
      throw err
    })
  }
  return wasmReadyPromise
}

const toMarkdown = async (filePath, outputDir) => {
  const mod = await ensureWasmModule()
  const srcBuf = fs.readFileSync(filePath)
  const srcBytes = new Uint8Array(srcBuf.buffer, srcBuf.byteOffset, srcBuf.byteLength)
  const format = mod.formatFromPath ? mod.formatFromPath(filePath) : undefined
  const markdown = mod.toMarkdownBytes(srcBytes, format)
  const base = baseName(filePath)
  const outPath = outputDir
    ? path.join(outputDir, base + '.md')
    : path.join(path.dirname(filePath), base + '.md')
  fs.writeFileSync(outPath, markdown, 'utf8')
  return outPath
}

const splitPaths = (text) => {
  const trimmed = text.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed.map(String)
    if (typeof parsed === 'string') return [parsed]
  } catch (e) {}
  const parts = trimmed.split(/\r?\n|[,;]+/).map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts : [trimmed]
}

const extractPaths = (params) => {
  if (typeof params === 'string') return splitPaths(params)
  if (!params || typeof params !== 'object') return []
  const candidates = []
  const collect = (value) => {
    if (typeof value === 'string' && value.trim()) {
      splitPaths(value).forEach((p) => candidates.push(p))
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'string') splitPaths(item).forEach((p) => candidates.push(p))
      })
    }
  }
  ;['filePaths', 'filePath', 'path', 'paths', 'input', 'file', 'document', 'src', 'source'].forEach((key) => {
    if (params[key] !== undefined) collect(params[key])
  })
  if (candidates.length === 0) {
    Object.values(params).forEach(collect)
  }
  return candidates
}

if (typeof utools !== 'undefined' && typeof utools.registerTool === 'function') {
  utools.registerTool('doc_to_markdown', async (params, ctx) => {
    const { outputDir, returnContent } = params || {}
    const paths = extractPaths(params)
    if (paths.length === 0) {
      throw new Error('未提供可识别的文档路径，请传入 filePaths（字符串或字符串数组）')
    }
    const results = []
    for (let i = 0; i < paths.length; i++) {
      const filePath = paths[i]
      try {
        const outputPath = await toMarkdown(filePath, outputDir)
        const item = { filePath, outputPath, ok: true }
        if (returnContent) {
          item.markdown = fs.readFileSync(outputPath, 'utf8')
        }
        results.push(item)
      } catch (err) {
        results.push({ filePath, ok: false, error: String(err && err.message ? err.message : err) })
      }
      if (ctx && typeof ctx.sendProgress === 'function') {
        await ctx.sendProgress({
          progress: i + 1,
          total: paths.length,
          message: `转换中 ${i + 1}/${paths.length}`,
        })
      }
    }
    return { results }
  })
}

window.preload = {
  readFileBytes,
  readFileBytesAsync,
  writeFile,
  stat,
  dirOf,
  joinPath,
  baseName,
  readWasmBytes,
}
