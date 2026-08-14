// anydoc_wasm.js 类型声明（@firecrawl/anydoc-wasm@0.1.9 wasm-bindgen 胶水，MIT）
// 完整 API 见包内 anydoc_wasm.d.ts，此处仅声明本项目使用到的导出。

export function __wbg_get_imports(): WebAssembly.Imports

export function __wbg_finalize_init(
  instance: WebAssembly.Instance,
  module: WebAssembly.Module
): WebAssembly.Exports

export function initSync(module: { module: WebAssembly.Module } | unknown): unknown

export function __wbg_init(module?: unknown): Promise<unknown>

export function toMarkdownBytes(bytes: Uint8Array, format?: string): string

export function formatFromBytes(bytes: Uint8Array): string | undefined
