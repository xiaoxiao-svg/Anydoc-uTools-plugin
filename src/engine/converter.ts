import {
  __wbg_get_imports,
  __wbg_finalize_init,
  toMarkdownBytes,
  formatFromBytes,
} from './wasm/anydoc_wasm.js'
import type { ConvertErrorCode, ConvertResult } from '../types'

let initialized = false
let initError: Error | null = null

export async function ensureWasmInit(): Promise<void> {
  if (initialized) return
  if (initError) throw initError
  try {
    const bytes = window.preload.readWasmBytes()
    // Chromium 主线程禁止同步编译/实例化 >4KB 的 wasm（WebAssembly.Module / WebAssembly.Instance 构造器均受限），
    // 胶水默认的 init() 又依赖 fetch（file:// 下不可用）。
    // 因此走官方推荐的异步路径：compile + instantiate 完成后，用 __wbg_finalize_init 设置胶水内部状态。
    const module = await WebAssembly.compile(bytes)
    const instance = await WebAssembly.instantiate(module, __wbg_get_imports())
    __wbg_finalize_init(instance, module)
    initialized = true
  } catch (err: unknown) {
    initError = err instanceof Error ? err : new Error(String(err))
    throw initError
  }
}

export function resetWasmInit(): void {
  initialized = false
  initError = null
}

export function convertBytes(bytes: Uint8Array): ConvertResult {
  try {
    const markdown = toMarkdownBytes(bytes)
    return { ok: true, markdown }
  } catch (err: unknown) {
    const e = err as { code?: ConvertErrorCode; message?: string }
    return { ok: false, code: e?.code ?? 'unknown', message: String(e?.message ?? err) }
  }
}

export function detectFormat(bytes: Uint8Array): string | undefined {
  return formatFromBytes(bytes)
}
