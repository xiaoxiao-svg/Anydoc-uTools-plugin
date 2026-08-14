import type { ConvertResult } from '../types'

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
