<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FileItem } from '../types'
import { useOutput } from '../composables/useOutput'

const props = defineProps<{
  items: FileItem[]
}>()

const { copyToClipboard, pasteToPrevWindow, saveAs, saveAllToDirectory, saveAllToSourceDir } = useOutput()
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function notify(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2500)
}

const ready = computed(() => props.items.filter((i) => i.result && i.result.ok))
const disabled = computed(() => ready.value.length === 0)
const skipped = computed(() => props.items.length - ready.value.length)

function markdownOf(item: FileItem): string {
  return item.result && item.result.ok ? item.result.markdown : ''
}

function joined(): string {
  return ready.value
    .map((it) => `# ${it.name}\n\n---\n\n${markdownOf(it).trimEnd()}`)
    .join('\n\n')
}

function output(): string {
  return ready.value.length === 1 ? markdownOf(ready.value[0]) : joined()
}

function skipTip(): string {
  return skipped.value > 0 ? `，跳过 ${skipped.value} 个未完成项` : ''
}

async function onCopy() {
  const ok = await copyToClipboard(output())
  if (ok) {
    notify(ready.value.length > 1 ? `已复制 ${ready.value.length} 个文件${skipTip()}` : '已复制到剪贴板')
  } else {
    notify('复制失败')
  }
}

function onPaste() {
  pasteToPrevWindow(output())
  notify(ready.value.length > 1 ? `已粘贴 ${ready.value.length} 个文件到上一窗口${skipTip()}` : '已粘贴到上一窗口')
}

function onSaveAs() {
  if (ready.value.length === 1) {
    const ok = saveAs(ready.value[0])
    notify(ok ? '已保存' : '保存失败')
    return
  }
  const res = saveAllToDirectory(ready.value)
  if (!res) return
  notify(
    res.fail > 0
      ? `已导出 ${res.ok} 个，失败 ${res.fail} 个${skipTip()}`
      : `已导出 ${res.ok} 个文件到目标文件夹${skipTip()}`
  )
}

function onSaveToDir() {
  const res = saveAllToSourceDir(ready.value)
  notify(
    res.fail > 0
      ? `已保存 ${res.ok} 个，失败 ${res.fail} 个${skipTip()}`
      : `已保存 ${res.ok} 个文件到源目录${skipTip()}`
  )
}
</script>

<template>
  <div class="output-bar">
    <button class="out-btn primary" :disabled="disabled" @click="onCopy">复制</button>
    <button class="out-btn" :disabled="disabled" @click="onSaveAs">另存为…</button>
    <button class="out-btn" :disabled="disabled" @click="onSaveToDir">保存到源目录</button>
    <button class="out-btn" :disabled="disabled" @click="onPaste">粘贴回上一窗口</button>
    <span v-if="toast" class="toast">{{ toast }}</span>
  </div>
</template>

<style scoped>
.output-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.out-btn {
  padding: 5px 16px;
  border: 1px solid var(--border-strong);
  background: var(--panel-bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.out-btn:hover:not(:disabled) {
  border-color: #2f7de1;
  color: #2f7de1;
}
.out-btn.primary {
  background: #2f7de1;
  color: #fff;
  border-color: #2f7de1;
}
.out-btn.primary:hover:not(:disabled) {
  background: #2566bb;
}
.out-btn:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.toast {
  margin-left: 8px;
  color: #1a7f37;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
