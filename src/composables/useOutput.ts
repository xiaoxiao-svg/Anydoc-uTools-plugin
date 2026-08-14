import type { FileItem } from '../types'

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

  return { copyToClipboard, pasteToPrevWindow, saveAs, saveToSourceDir }
}
