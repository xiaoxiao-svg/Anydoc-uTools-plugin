const fs = require('fs')
const path = require('path')

const readFileBytes = (filePath) => {
  const buf = fs.readFileSync(filePath)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

const readFileBytesAsync = async (filePath) => {
  const buf = await fs.promises.readFile(filePath)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

const writeFile = (filePath, text) => {
  fs.writeFileSync(filePath, text, 'utf8')
}

const stat = (filePath) => {
  const s = fs.statSync(filePath)
  return { size: s.size, isFile: s.isFile(), isDirectory: s.isDirectory() }
}

const dirOf = (filePath) => path.dirname(filePath)
const joinPath = (...parts) => path.join(...parts)
const baseName = (filePath) => path.basename(filePath, path.extname(filePath))

const readWasmBytes = () => {
  const p = path.join(__dirname, 'wasm', 'anydoc_wasm_bg.wasm')
  const buf = fs.readFileSync(p)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

window.preload = {
  readFileBytes,
  readFileBytesAsync,
  writeFile,
  stat,
  dirOf,
  joinPath,
  baseName,
  readWasmBytes,
}
