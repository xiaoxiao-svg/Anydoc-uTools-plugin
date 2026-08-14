/// <reference types="vite/client" />

import type { MatchFile } from './types'

interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
}

interface OpenDialogOptions {
  title?: string
  properties?: string[]
  filters?: { name: string; extensions: string[] }[]
}

interface Preload {
  readFileBytes: (filePath: string) => Uint8Array
  writeFile: (filePath: string, text: string) => void
  stat: (filePath: string) => { size: number; isFile: boolean; isDirectory: boolean }
  dirOf: (filePath: string) => string
  joinPath: (...parts: string[]) => string
  baseName: (filePath: string) => string
  readWasmBytes: () => Uint8Array
}

interface Utools {
  onPluginEnter: (callback: (action: { code: string; type: string; payload: MatchFile[] | string; from: string }) => void) => void
  hideMainWindowPasteText: (text: string) => boolean
  showOpenDialog: (options: OpenDialogOptions) => string[] | undefined
  showSaveDialog: (options: SaveDialogOptions) => string | undefined
  shellShowItemInFolder: (fullPath: string) => void
  setExpendHeight: (height: number) => boolean
}

declare global {
  interface Window {
    preload: Preload
    utools: Utools
  }
}

export {}
