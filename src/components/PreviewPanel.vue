<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FileItem } from '../types'

const props = defineProps<{
  item: FileItem
}>()

const tab = ref<'source' | 'text'>('source')
const markdown = computed(() => (props.item.result && props.item.result.ok ? props.item.result.markdown : ''))
</script>

<template>
  <div class="preview">
    <div class="preview-head">
      <div class="tabs">
        <button :class="{ active: tab === 'source' }" @click="tab = 'source'">源码</button>
        <button :class="{ active: tab === 'text' }" @click="tab = 'text'">纯文本</button>
      </div>
      <span class="preview-name">{{ item.name }}</span>
    </div>
    <textarea
      class="preview-body"
      :value="markdown"
      readonly
      spellcheck="false"
      placeholder="转换结果将显示在这里"
    ></textarea>
  </div>
</template>

<style scoped>
.preview {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.preview-head {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 36px;
  padding: 0 12px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
  font-size: 13px;
  box-sizing: border-box;
}
.tabs {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.tabs button {
  border: none;
  background: none;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  flex-shrink: 0;
}
.tabs button.active {
  background: #2f7de1;
  color: #fff;
}
.preview-name {
  margin-left: auto;
  font-size: 12px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-body {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 12px;
  font-family: 'SF Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #333;
  background: #fff;
  white-space: pre;
}
</style>
