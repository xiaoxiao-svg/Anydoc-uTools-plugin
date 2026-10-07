import { ref, nextTick } from 'vue'
import type { FileItem, FileStatus } from '../types'
import { abandonIsolation, convertBytes, convertIsolated, ensureWasmInit } from '../engine/converter'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let idSeed = 0
const nextId = () => `f-${Date.now()}-${++idSeed}`

// 隔离进程一旦确认不可用，本次会话不再尝试，直接走内置引擎
let isolationOn = true

export function useFileQueue() {
  const items = ref<FileItem[]>([])
  const converting = ref(false)
  const wasmError = ref<string | null>(null)
  const currentId = ref<string | null>(null)

  function normalizeStatus(result: FileItem['result']): FileStatus {
    return result && result.ok ? 'success' : 'error'
  }

  async function convertItem(item: FileItem): Promise<FileItem['result']> {
    if (isolationOn) {
      try {
        const [result] = await convertIsolated([{ id: item.id, path: item.path }])
        if (result && result.code === 'isolationUnavailable') {
          isolationOn = false
          abandonIsolation()
        } else if (result) {
          return result.ok
            ? { ok: true, markdown: result.markdown ?? '' }
            : { ok: false, code: result.code ?? 'unknown', message: result.message ?? '' }
        }
      } catch {
        // 调用层异常同样按「隔离不可用」处理，退到内置引擎
        isolationOn = false
        abandonIsolation()
      }
    }
    await ensureWasmInit()
    const bytes = await window.preload.readFileBytesAsync(item.path)
    return convertBytes(bytes)
  }

  async function enqueue(paths: string[]): Promise<void> {
    const existing = new Set(items.value.map((i) => i.path))
    const fresh: FileItem[] = []
    for (const p of paths) {
      if (existing.has(p)) continue
      existing.add(p)
      const name = p.split(/[\\/]/).pop() || p
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
          item.result = await convertItem(item)
        } catch (err: unknown) {
          const message = String((err as Error)?.message ?? err)
          wasmError.value = message
          item.result = { ok: false, code: 'unknown', message }
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
    if (currentId.value === id) currentId.value = null
    items.value = items.value.filter((i) => i.id !== id)
  }

  function clearAll(): void {
    currentId.value = null
    items.value = []
  }

  function toggleSelect(id: string): void {
    const item = items.value.find((i) => i.id === id)
    if (!item) return
    item.selected = !item.selected
  }

  function setCurrent(id: string): void {
    currentId.value = id
  }

  function toggleSelectAll(): void {
    const all = items.value.length > 0 && items.value.every((i) => i.selected)
    for (const item of items.value) item.selected = !all
  }

  function currentItem(): FileItem | null {
    return items.value.find((i) => i.id === currentId.value) ?? null
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
    setCurrent,
    toggleSelectAll,
    currentItem,
    selectedItems,
  }
}
