<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FileItem } from '../types'
import { useOutput } from '../composables/useOutput'

const props = defineProps<{
  item: FileItem
}>()

const { copyToClipboard, pasteToPrevWindow, saveAs, saveToSourceDir } = useOutput()
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function notify(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2500)
}

const disabled = computed(() => !props.item.result || !props.item.result.ok)

async function onCopy() {
  const md = props.item.result && props.item.result.ok ? props.item.result.markdown : ''
  const ok = await copyToClipboard(md)
  notify(ok ? '已复制到剪贴板' : '复制失败')
}

function onPaste() {
  const md = props.item.result && props.item.result.ok ? props.item.result.markdown : ''
  pasteToPrevWindow(md)
  notify('已粘贴到上一窗口')
}

function onSaveAs() {
  const ok = saveAs(props.item)
  notify(ok ? '已保存' : '保存失败')
}

function onSaveToDir() {
  const target = saveToSourceDir(props.item)
  if (target) {
    notify(`已保存到源目录：${target}`)
  } else {
    notify('保存失败')
  }
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
