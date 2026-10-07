// 独立进程文档转换器。
//
// 为什么单独起一个进程：引擎在处理某些 PDF（单页含多个大矢量图、
// 或内容密集的多页文档）时内存会失控，撞上 V8 上限后整个进程被直接
// 终止——这是进程级硬崩，JS 的 try/catch 抓不住。让它崩在这个一次性的
// 子进程里，插件界面就不受影响，还能把崩溃前已产出的结果捞回来。
//
// 协议（每行一个 JSON）：
//   入（stdin）：{ id, filePath, outPath }
//   出（stdout）：{ type: 'ready', ... }                启动握手
//                { id, ok: true, bytes }               转换成功
//                { id, ok: false, code, message }      转换失败（引擎抛错）
//
// 结果按「先写 .part-<pid> 再改名」落盘：改名是同分区原子操作，
// 所以 outPath 上要么是完整结果，要么不存在，不会留半截内容。

const readline = require('node:readline')
const fs = require('node:fs')
const path = require('node:path')

// wasm 胶水用到 globalThis.crypto；Node 19 以下没有全局 crypto，
// 而 Electron 内置的 Node 版本随 uTools 升级而变，这里兜底。
if (!globalThis.crypto) {
  globalThis.crypto = require('node:crypto').webcrypto
}

let engine = null

function loadEngine() {
  if (engine) return engine
  engine = require('./wasm/anydoc_wasm.cjs')
  engine.initSync({ module: fs.readFileSync(path.join(__dirname, 'wasm', 'anydoc_wasm_bg.wasm')) })
  return engine
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n')
}

function convert(task) {
  const mod = loadEngine()
  const buf = fs.readFileSync(task.filePath)
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const markdown = mod.toMarkdownBytes(bytes, mod.formatFromPath(task.filePath))
  const part = `${task.outPath}.part-${process.pid}`
  fs.writeFileSync(part, markdown, 'utf8')
  fs.renameSync(part, task.outPath)
  return Buffer.byteLength(markdown, 'utf8')
}

// 握手：父进程据此确认子进程真的以 Node 模式起来了（而不是被当成
// uTools 主程序拉起来），握手失败按「隔离不可用」处理，另行降级。
emit({ type: 'ready', node: process.version, hasCrypto: !!globalThis.crypto })

const lines = readline.createInterface({ input: process.stdin })
lines.on('line', (line) => {
  if (!line.trim()) return
  let task
  try {
    task = JSON.parse(line)
  } catch {
    return
  }
  try {
    emit({ id: task.id, ok: true, bytes: convert(task) })
  } catch (err) {
    emit({
      id: task.id,
      ok: false,
      code: (err && err.code) || 'unknown',
      message: String((err && err.message) || err),
    })
  }
})
