import {
  __wbg_get_imports,
  __wbg_finalize_init,
  toMarkdownBytes,
} from './wasm/anydoc_wasm.js'
import type { ConvertErrorCode, ConvertResult } from '../types'

type WorkerRequest =
  | { type: 'init'; bytes: Uint8Array }
  | { type: 'convert'; id: number; bytes: Uint8Array }

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  if (msg.type === 'init') {
    try {
      const module = await WebAssembly.compile(msg.bytes)
      const instance = await WebAssembly.instantiate(module, __wbg_get_imports())
      __wbg_finalize_init(instance, module)
      self.postMessage({ type: 'init-ok' })
    } catch (err: unknown) {
      self.postMessage({ type: 'init-err', message: String(err) })
    }
    return
  }
  if (msg.type === 'convert') {
    let result: ConvertResult
    try {
      result = { ok: true, markdown: toMarkdownBytes(msg.bytes) }
    } catch (err: unknown) {
      const e = err as { code?: ConvertErrorCode; message?: string }
      result = { ok: false, code: e?.code ?? 'unknown', message: String(e?.message ?? err) }
    }
    self.postMessage({ type: 'convert-done', id: msg.id, result })
  }
}
