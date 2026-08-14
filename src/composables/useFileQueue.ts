import { ref, nextTick } from 'vue'
import type { FileItem, FileStatus } from '../types'
import { convertBytes, ensureWasmInit } from '../engine/converter'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let idSeed = 0
const nextId = () => `f-${Date.now()}-${++idSeed}`

export function useFileQueue() {
  const items = ref<FileItem[]>([])
  const converting = ref(false)
  const wasmError = ref<string | null>(null)

  function normalizeStatus(result: FileItem['result']): FileStatus {
    return result && result.ok ? 'success' : 'error'
  }

  async function enqueue(paths: string[]): Promise<void> {
    const existing = new Set(items.value.map((i) => i.path))
    const fresh: FileItem[] = []
    for (const p of paths) {
      if (existing.has(p)) continue
      existing.add(p)
      let name = p.split(/[\\/]/).pop() || p
      let size = 0
      try {
        const s = window.preload.stat(p)
        if (!s.isFile) continue
        size = s.size
      } catch {
        continue
      }
      fresh.push({ id: nextId(), name, path: p, size, status: 'pending', selected: false })
    }
    if (fresh.length === 0) return
    items.value.push(...fresh)
    await ensureWasmInit().catch((err: Error) => {
      wasmError.value = String(err?.message ?? err)
    })
    if (wasmError.value) {
      for (const item of fresh) {
        item.status = 'error'
        item.result = { ok: false, code: 'unknown', message: wasmError.value }
      }
      return
    }
    void drain()
  }

  async function drain(): Promise<void> {
    if (converting.value) return
    converting.value = true
    try {
      for (const item of items.value) {
        if (item.status !== 'pending') continue
        item.status = 'converting'
        await nextTick()
        try {
          const bytes = await window.preload.readFileBytesAsync(item.path)
          item.result = await convertBytes(bytes)
        } catch (err: unknown) {
          item.result = { ok: false, code: 'io', message: String(err) }
        }
        item.status = normalizeStatus(item.result)
        await sleep(0)
      }
    } finally {
      converting.value = false
    }
  }

  function retry(id: string): void {
    const item = items.value.find((i) => i.id === id)
    if (!item) return
    item.status = 'pending'
    item.result = undefined
    void drain()
  }

  function retryFailed(): void {
    for (const item of items.value) {
      if (item.status === 'error') {
        item.status = 'pending'
        item.result = undefined
      }
    }
    void drain()
  }

  function remove(id: string): void {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function clearAll(): void {
    items.value = []
  }

  function toggleSelect(id: string): void {
    const item = items.value.find((i) => i.id === id)
    if (!item) return
    item.selected = !item.selected
  }

  function selectOnly(id: string): void {
    for (const item of items.value) item.selected = item.id === id
  }

  function selectedItems(): FileItem[] {
    return items.value.filter((i) => i.selected)
  }

  return {
    items,
    converting,
    wasmError,
    enqueue,
    retry,
    retryFailed,
    remove,
    clearAll,
    toggleSelect,
    selectOnly,
    selectedItems,
  }
}
