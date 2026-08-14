<script setup lang="ts">
import { ref } from 'vue'
import { dropPaths } from '../composables/useFilePicker'

const emit = defineEmits<{
  add: [paths: string[]]
  pick: []
}>()

const dragging = ref(false)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragging.value = true
}
function onDragLeave() {
  dragging.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const paths = dropPaths(e)
  if (paths.length > 0) emit('add', paths)
}
</script>

<template>
  <div
    class="drop-zone"
    :class="{ dragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="hint">拖入文档到此处，或</div>
    <button class="pick-btn" @click="emit('pick')">选择文件</button>
    <div class="formats">支持 docx / pptx / xlsx / pdf / epub / rtf / csv / odt 等 14 种格式</div>
  </div>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed var(--border-strong);
  border-radius: 8px;
  padding: 18px 12px;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.drop-zone.dragging {
  border-color: #2f7de1;
  background: var(--accent-bg);
}
.hint {
  color: var(--text-secondary);
  display: inline;
  margin-right: 8px;
}
.pick-btn {
  padding: 4px 14px;
  background: #2f7de1;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.pick-btn:hover {
  background: #2566bb;
}
.formats {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-faint);
}
</style>
