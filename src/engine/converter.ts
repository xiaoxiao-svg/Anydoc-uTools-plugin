import type { ConvertErrorCode, ConvertResult } from '../types'

// ---------------------------------------------------------------------------
// 隔离进程路径（默认）
//
// 转换交给 preload 派生的独立子进程。引擎在极端输入下会内存失控并被系统
// 硬终止，这种终止在 JS 层捕获不到——放在子进程里，被杀的只是那个一次性
// 进程，界面不受影响，且崩溃前已落盘的结果仍会回传。
// ---------------------------------------------------------------------------

export interface ConvertTaskResult {
  id: string
  ok: boolean
  markdown?: string
  code?: ConvertErrorCode
  message?: string
}

export function convertIsolated(items: { id: string; path: string }[]): Promise<ConvertTaskResult[]> {
  return window.preload.convertDocuments(items)
}

/** 隔离进程不可用时，释放它并回退到内置 Worker 路径 */
export function abandonIsolation(): void {
  window.preload.killConvertProcess()
}

// ---------------------------------------------------------------------------
// 内置 Worker 路径（仅在隔离进程不可用时降级使用）
// ---------------------------------------------------------------------------

type WorkerResponse =
  | { type: 'init-ok' }
  | { type: 'init-err'; message: string }
  | { type: 'convert-done'; id: number; result: ConvertResult }

let worker: Worker | null = null
let initPromise: Promise<void> | null = null
let seq = 0
const pending = new Map<number, (result: ConvertResult) => void>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./convert.worker.ts', import.meta.url))
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      if (msg.type === 'convert-done') {
        const resolve = pending.get(msg.id)
        if (resolve) {
          pending.delete(msg.id)
          resolve(msg.result)
        }
      }
    }
  }
  return worker
}

export function ensureWasmInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const bytes = window.preload.readWasmBytes()
      const w = getWorker()
      await new Promise<void>((resolve, reject) => {
        const onMsg = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.type === 'init-ok') {
            cleanup()
            resolve()
          } else if (e.data.type === 'init-err') {
            cleanup()
            reject(new Error(e.data.message))
          }
        }
        const onErr = (e: ErrorEvent) => {
          cleanup()
          reject(new Error(e.message || 'worker error'))
        }
        const cleanup = () => {
          w.removeEventListener('message', onMsg)
          w.removeEventListener('error', onErr)
        }
        w.addEventListener('message', onMsg)
        w.addEventListener('error', onErr)
        w.postMessage({ type: 'init', bytes }, [bytes.buffer])
      })
    })().catch((err: Error) => {
      initPromise = null
      throw err
    })
  }
  return initPromise
}

export function resetWasmInit(): void {
  initPromise = null
  worker?.terminate()
  worker = null
}

export function convertBytes(bytes: Uint8Array): Promise<ConvertResult> {
  const w = getWorker()
  const id = ++seq
  return new Promise<ConvertResult>((resolve) => {
    pending.set(id, resolve)
    w.postMessage({ type: 'convert', id, bytes }, [bytes.buffer])
  })
}
