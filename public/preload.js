const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

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

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true })
}

const stat = (filePath) => {
  const s = fs.statSync(filePath)
  return { size: s.size, isFile: s.isFile(), isDirectory: s.isDirectory() }
}

const dirOf = (filePath) => path.dirname(filePath)
const joinPath = (...parts) => path.join(...parts)
const baseName = (filePath) => path.basename(filePath, path.extname(filePath))

// 降级路径（内置 Worker）需要它把 wasm 二进制交给 Worker
const readWasmBytes = () => {
  const p = path.join(__dirname, 'wasm', 'anydoc_wasm_bg.wasm')
  const buf = fs.readFileSync(p)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

// ---------------------------------------------------------------------------
// 转换：交给独立的 converter.cjs 子进程执行
//
// 引擎处理某些 PDF 时内存失控会导致整个进程被 V8 硬终止，这种终止在 JS 层
// 无法捕获。放到子进程后，被杀掉的只是那个一次性进程，插件界面不受影响，
// 且崩溃前已落盘的结果仍可回收。
// ---------------------------------------------------------------------------

const CONVERTER = path.join(__dirname, 'converter.cjs')
const READY_TIMEOUT_MS = 8000
const TASK_TIMEOUT_MS = 5 * 60 * 1000

let child = null
let readyPromise = null
let responseHandler = null
let pending = null
let spawnFailed = false

// 全局串行：界面批量转换与 AI 工具可能同时触发，两个子进程并行会把内存打爆
let chain = Promise.resolve()
const serialize = (fn) => {
  const run = chain.then(fn, fn)
  chain = run.catch(() => {})
  return run
}

const tempOutput = (id) => path.join(os.tmpdir(), `anydoc-${process.pid}-${id}.md`)

function cleanupTemp(id) {
  const target = tempOutput(id)
  try {
    fs.rmSync(target, { force: true })
  } catch {}
  try {
    // 崩溃时可能残留的 .part-* 片段
    const dir = path.dirname(target)
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(path.basename(target) + '.part-')) {
        fs.rmSync(path.join(dir, name), { force: true })
      }
    }
  } catch {}
}

function detachChild() {
  const proc = child
  child = null
  readyPromise = null
  responseHandler = null
  if (!proc) return
  try {
    proc.stdin.end()
  } catch {}
  try {
    proc.kill()
  } catch {}
}

function startChild() {
  if (spawnFailed) return Promise.reject(new Error('隔离进程不可用'))
  const proc = spawn(process.execPath, [CONVERTER], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child = proc
  proc.stdin.on('error', () => {})
  proc.stdout.setEncoding('utf8')
  let buffer = ''
  proc.stdout.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      let message
      try {
        message = JSON.parse(line)
      } catch {
        continue
      }
      if (message.type === 'ready') {
        if (readyPromise) readyPromise.resolve()
        continue
      }
      if (responseHandler) responseHandler(message)
    }
  })
  proc.stderr.setEncoding('utf8')
  let stderrTail = ''
  proc.stderr.on('data', (chunk) => {
    stderrTail = (stderrTail + chunk).slice(-2000)
  })
  proc.on('error', (err) => {
    // 只理会当前这一代进程的事件，避免上一代的回调串扰到新进程/新任务
    if (proc !== child) return
    // spawn 本身失败（ENOENT / EPERM）：标记隔离不可用，后续走降级
    spawnFailed = true
    if (readyPromise) readyPromise.reject(err)
    if (pending) pending.settleCrash(stderrTail)
  })
  proc.on('close', () => {
    if (proc !== child) return
    if (readyPromise) readyPromise.reject(new Error('隔离进程已退出'))
    if (pending) pending.settleCrash(stderrTail)
  })

  readyPromise = (() => {
    let resolve, reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    const timer = setTimeout(() => reject(new Error('隔离进程启动超时')), READY_TIMEOUT_MS)
    return {
      promise,
      resolve: () => {
        clearTimeout(timer)
        resolve()
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    }
  })()
  return readyPromise.promise
}

async function ensureChild() {
  if (child && readyPromise) {
    try {
      await readyPromise.promise
      // 握手成功不代表进程还活着：空闲期自退的进程要在这里识别出来，
      // 否则下一个任务会写进死管道，白等到超时
      if (child && child.exitCode === null && !child.killed) return child
    } catch {}
    detachChild()
  }
  return startChild().then(() => child)
}

// 单个任务：派发 -> 等结果；子进程被杀时以「结果文件是否完整落盘」判定
function runTask(id, filePath) {
  const outPath = tempOutput(id)
  cleanupTemp(id)
  return new Promise((resolve) => {
    let settled = false
    let timer = null

    const finish = (result) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      pending = null
      responseHandler = null
      resolve(result)
    }

    pending = {
      id,
      settleCrash: (stderrTail) => {
        // 进程没了。结果文件若已原子落盘（崩在转换之后），仍算成功
        if (fs.existsSync(outPath)) {
          try {
            const markdown = fs.readFileSync(outPath, 'utf8')
            finish({ ok: true, markdown })
            return
          } catch {}
        }
        finish({
          ok: false,
          code: 'engineCrash',
          message: stderrTail && stderrTail.trim() ? stderrTail.trim().slice(-300) : '',
        })
      },
    }

    responseHandler = (message) => {
      if (message.id !== id) return
      if (message.ok) {
        try {
          finish({ ok: true, markdown: fs.readFileSync(outPath, 'utf8') })
        } catch (err) {
          finish({ ok: false, code: 'io', message: String(err && err.message ? err.message : err) })
        }
        return
      }
      finish({ ok: false, code: message.code || 'unknown', message: message.message || '' })
    }

    timer = setTimeout(() => {
      detachChild()
      if (fs.existsSync(outPath)) {
        try {
          finish({ ok: true, markdown: fs.readFileSync(outPath, 'utf8') })
          return
        } catch {}
      }
      finish({ ok: false, code: 'engineTimeout', message: '' })
    }, TASK_TIMEOUT_MS)

    try {
      // 派发前最后确认进程还在：写进已死管道不会报错，只会静默吞掉，
      // 那样这个文件就要白等到超时
      if (!child || child.exitCode !== null || child.killed) throw new Error('隔离进程已退出')
      child.stdin.write(JSON.stringify({ id, filePath, outPath }) + '\n')
    } catch (err) {
      pending.settleCrash(String(err && err.message ? err.message : err))
    }
  })
}

async function convertOne(id, filePath) {
  try {
    await ensureChild()
  } catch (err) {
    // 隔离进程起不来：交给调用方降级到内置 Worker 路径
    return {
      ok: false,
      code: 'isolationUnavailable',
      message: String(err && err.message ? err.message : err),
    }
  }
  const result = await runTask(id, filePath)
  // 子进程崩溃或被超时杀掉后，下一个任务需要新的进程
  if (child && (child.exitCode !== null || child.killed)) detachChild()
  return result
}

// items: [{ id, path }] -> [{ id, ok, markdown?, code?, message? }]
async function convertDocuments(items) {
  const results = []
  for (const item of items) {
    const result = await serialize(() => convertOne(item.id, item.path))
    cleanupTemp(item.id)
    results.push({ id: item.id, ...result })
  }
  return results
}

// AI 工具入口：转换单个文件并按既定规则写出 .md
const TOOL_FAIL_TEXT = {
  engineCrash: '转换引擎内存不足，未能生成结果；同一批的其他文件不受影响',
  engineTimeout: '处理超时，已跳过该文件',
  isolationUnavailable: '转换引擎启动失败',
}
async function convertToFile(filePath, outputDir) {
  const id = `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const result = await serialize(() => convertOne(id, filePath))
  cleanupTemp(id)
  if (!result.ok) {
    // 崩溃/超时这类没有引擎错误详情的情况，用中文归因，
    // 否则调用方只会看到一句无从判断的“转换失败”
    const reason = result.message || TOOL_FAIL_TEXT[result.code] || ''
    const err = new Error(reason || '转换失败')
    err.code = result.code
    throw err
  }
  const base = baseName(filePath)
  const outPath = outputDir
    ? path.join(outputDir, base + '.md')
    : path.join(path.dirname(filePath), base + '.md')
  if (outputDir) ensureDir(outputDir)
  fs.writeFileSync(outPath, result.markdown, 'utf8')
  return outPath
}

// 插件窗口关闭 / 插件退出时兜底清理，避免留下孤儿进程
const killChild = () => detachChild()
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('exit', killChild)
}
if (typeof utools !== 'undefined' && typeof utools.onPluginOut === 'function') {
  // isKill 为 false 表示插件只是被隐藏到后台、进程仍在存活。
  // 此时不能杀子进程，否则正在跑的长转换会被打断并被误判为引擎崩溃。
  utools.onPluginOut((isKill) => {
    if (isKill) killChild()
  })
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
        const outputPath = await convertToFile(filePath, outputDir)
        const item = { filePath, outputPath, ok: true }
        if (returnContent) {
          item.markdown = fs.readFileSync(outputPath, 'utf8')
        }
        results.push(item)
      } catch (err) {
        const code = err && err.code
        const detail = err && err.message ? err.message : String(err)
        results.push({
          filePath,
          ok: false,
          error: code && code !== 'unknown' ? `${code}: ${detail}` : detail,
        })
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
  ensureDir,
  stat,
  dirOf,
  joinPath,
  baseName,
  readWasmBytes,
  convertDocuments,
  killConvertProcess: killChild,
}
