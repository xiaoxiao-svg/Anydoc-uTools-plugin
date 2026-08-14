import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'

const validatePluginJson = (): Plugin => ({
  name: 'validate-plugin-json',
  enforce: 'pre',
  buildStart() {
    const p = path.resolve(process.cwd(), 'public', 'plugin.json')
    const buf = fs.readFileSync(p)
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      throw new Error('plugin.json 含 BOM，uTools 会解析失败')
    }
    JSON.parse(buf.toString('utf8'))
  },
})

const stripDevelopment = (): Plugin => ({
  name: 'strip-plugin-development',
  closeBundle() {
    const p = path.resolve(process.cwd(), 'dist', 'plugin.json')
    const json = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (json.development) {
      delete json.development
      fs.writeFileSync(p, JSON.stringify(json, null, 2), 'utf8')
    }
  },
})

const removeRedundantWasm = (): Plugin => ({
  name: 'remove-redundant-wasm',
  closeBundle() {
    const assetsDir = path.resolve(process.cwd(), 'dist', 'assets')
    if (!fs.existsSync(assetsDir)) return
    for (const f of fs.readdirSync(assetsDir)) {
      if (f.startsWith('anydoc_wasm_bg-')) {
        fs.rmSync(path.join(assetsDir, f))
      }
    }
  },
})

export default defineConfig({
  plugins: [vue(), validatePluginJson(), stripDevelopment(), removeRedundantWasm()],
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2021',
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
