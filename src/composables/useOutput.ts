import type { FileItem } from '../types'

export interface BatchSaveResult {
  ok: number
  fail: number
  target?: string
}

function fileExists(path: string): boolean {
  try {
    const s = window.preload.stat(path)
    return s.isFile || s.isDirectory
  } catch {
    return false
  }
}

export function useOutput() {
  async function copyToClipboard(md: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(md)
      return true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = md
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        return ok
      } catch {
        return false
      }
    }
  }

  function pasteToPrevWindow(md: string): boolean {
    return window.utools.hideMainWindowPasteText(md)
  }

  function saveAs(item: FileItem): boolean {
    const md = item.result && item.result.ok ? item.result.markdown : ''
    if (!md) return false
    const target = window.utools.showSaveDialog({
      title: '保存为 Markdown',
      defaultPath: `${item.name.replace(/\.\w+$/, '')}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (!target) return false
    try {
      window.preload.writeFile(target, md)
      return true
    } catch {
      return false
    }
  }

  function saveToSourceDir(item: FileItem): string | null {
    const md = item.result && item.result.ok ? item.result.markdown : ''
    if (!md) return null
    const dir = window.preload.dirOf(item.path)
    const base = window.preload.baseName(item.path)
    const target = window.preload.joinPath(dir, `${base}.md`)
    try {
      window.preload.writeFile(target, md)
      return target
    } catch {
      return null
    }
  }

  function saveAllToDirectory(items: FileItem[]): BatchSaveResult | null {
    const picked = window.utools.showOpenDialog({
      title: '导出 Markdown 到文件夹',
      properties: ['openDirectory'],
    })
    if (!picked || picked.length === 0) return null
    const dir = picked[0]
    const used = new Set<string>()
    let ok = 0
    let fail = 0
    for (const item of items) {
      const md = item.result && item.result.ok ? item.result.markdown : ''
      if (!md) continue
      const base = window.preload.baseName(item.path)
      let name = `${base}.md`
      let i = 1
      while (used.has(name) || fileExists(window.preload.joinPath(dir, name))) {
        name = `${base} (${i}).md`
        i++
      }
      used.add(name)
      try {
        window.preload.writeFile(window.preload.joinPath(dir, name), md)
        ok++
      } catch {
        fail++
      }
    }
    return { ok, fail, target: dir }
  }

  function saveAllToSourceDir(items: FileItem[]): BatchSaveResult {
    let ok = 0
    let fail = 0
    for (const item of items) {
      if (saveToSourceDir(item)) ok++
      else fail++
    }
    return { ok, fail }
  }

  return { copyToClipboard, pasteToPrevWindow, saveAs, saveToSourceDir, saveAllToDirectory, saveAllToSourceDir }
}
