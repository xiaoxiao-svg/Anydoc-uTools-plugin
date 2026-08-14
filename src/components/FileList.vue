<script setup lang="ts">
import type { FileItem } from '../types'
import { errorText } from '../engine/errorMessages'
import EllipsisName from './EllipsisName.vue'

defineProps<{
  items: FileItem[]
  converting: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  retry: [id: string]
  retryFailed: []
  remove: [id: string]
  clear: []
}>()

const STATUS_LABEL: Record<FileItem['status'], string> = {
  pending: '等待',
  converting: '转换中…',
  success: '成功',
  error: '失败',
}

function sizeText(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function errorTip(item: FileItem): string {
  if (item.status !== 'error' || !item.result || item.result.ok) return ''
  return errorText(item.result.code, item.result.message)
}
</script>

<template>
  <div class="file-list">
    <div class="list-head">
      <span>文件队列</span>
      <div class="head-actions">
        <button class="link-btn" :disabled="converting" @click="emit('retryFailed')" title="重试全部失败项">重试失败</button>
        <button class="link-btn" @click="emit('clear')">清空</button>
      </div>
    </div>
    <div class="list-body">
      <div
        v-for="item in items"
        :key="item.id"
        class="file-row"
        :class="[`status-${item.status}`, { selected: item.selected }]"
        @click="emit('select', item.id)"
      >
        <div class="row-main">
          <EllipsisName :text="item.name" />
          <span class="size">{{ sizeText(item.size) }}</span>
        </div>
        <div class="row-meta">
          <span class="status">{{ STATUS_LABEL[item.status] }}</span>
          <span v-if="errorTip(item)" class="err-tip" :title="errorTip(item)">ⓘ</span>
          <span class="row-actions">
            <button v-if="item.status === 'error'" class="mini-btn" @click.stop="emit('retry', item.id)">重试</button>
            <button class="mini-btn" @click.stop="emit('remove', item.id)">×</button>
          </span>
        </div>
      </div>
      <div v-if="items.length === 0" class="empty">暂无文件</div>
    </div>
  </div>
</template>

<style scoped>
.file-list {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  background: var(--head-bg);
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
  color: var(--text-secondary);
  box-sizing: border-box;
}
.head-actions {
  display: flex;
  gap: 8px;
}
.link-btn {
  border: none;
  background: none;
  color: #2f7de1;
  cursor: pointer;
  font-size: 12px;
}
.link-btn:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.list-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}
.file-row {
  padding: 8px 12px;
  border-bottom: 1px solid var(--row-divider);
  cursor: pointer;
  overflow: hidden;
}
.file-row:hover {
  background: var(--row-hover);
}
.file-row.selected {
  background: var(--row-selected);
}
.row-main {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.size {
  color: var(--text-faint);
  font-size: 12px;
  flex-shrink: 0;
}
.row-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
}
.status-success .status {
  color: #1a7f37;
}
.status-error .status {
  color: #b3261e;
}
.status-converting .status {
  color: #2f7de1;
}
.err-tip {
  color: #b3261e;
  cursor: help;
}
.row-actions {
  margin-left: auto;
}
.mini-btn {
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 0 4px;
}
.mini-btn:hover {
  color: #2f7de1;
}
.empty {
  padding: 24px;
  text-align: center;
  color: var(--text-disabled);
}
</style>
