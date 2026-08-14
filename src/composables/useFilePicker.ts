import { onMounted, onUnmounted } from 'vue'
import type { MatchFile, PluginEnterAction } from '../types'

export const SUPPORTED_EXTENSIONS = [
  'doc', 'docx', 'docm',
  'ppt', 'pps', 'pot', 'pptx', 'pptm', 'ppsx', 'ppsm',
  'xls', 'xlsx', 'xlsm', 'xlsb',
  'odt', 'ods', 'odp',
  'rtf', 'epub', 'csv', 'pdf',
]

export function useFilePicker(onFiles: (paths: string[]) => void) {
  let enterHandler: ((action: PluginEnterAction) => void) | null = null

  onMounted(() => {
    enterHandler = (action) => {
      if (action.code === 'doc2md-files') {
        const files = action.payload as MatchFile[]
        if (Array.isArray(files)) onFiles(files.filter((f) => f.isFile).map((f) => f.path))
      }
    }
    window.utools.onPluginEnter(enterHandler)
  })

  onUnmounted(() => {
    enterHandler = null
  })

  function pickWithDialog(): void {
    const files = window.utools.showOpenDialog({
      title: '选择要转换的文档',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '文档', extensions: SUPPORTED_EXTENSIONS },
        { name: '所有文件', extensions: ['*'] },
      ],
    })
    if (files && files.length > 0) onFiles(files)
  }

  return { pickWithDialog }
}

export function dropPaths(event: DragEvent): string[] {
  if (!event.dataTransfer) return []
  const paths: string[] = []
  for (const f of Array.from(event.dataTransfer.files)) {
    const p = (f as File & { path?: string }).path
    if (p) paths.push(p)
  }
  return paths
}
