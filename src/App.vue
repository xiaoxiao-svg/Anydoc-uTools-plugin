<script setup lang="ts">
import { computed } from 'vue'
import { useFileQueue } from './composables/useFileQueue'
import { useFilePicker, dropPaths } from './composables/useFilePicker'
import FileDropZone from './components/FileDropZone.vue'
import FileList from './components/FileList.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import OutputBar from './components/OutputBar.vue'

const { items, converting, wasmError, enqueue, retry, retryFailed, remove, clearAll, selectOnly, selectedItems } = useFileQueue()
const { pickWithDialog } = useFilePicker((paths) => void enqueue(paths))

const selected = computed(() => selectedItems()[0])
const summary = computed(() => {
  const ok = items.value.filter((i) => i.status === 'success').length
  const err = items.value.filter((i) => i.status === 'error').length
  return { total: items.value.length, ok, err }
})

function reload() {
  window.location.reload()
}

</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="title">文档转 Markdown</div>
      <div class="subtitle">离线转换 · 文件不出本机</div>
      <div v-if="summary.total > 0" class="summary">
        共 {{ summary.total }} 项 · 成功 {{ summary.ok }} · 失败 {{ summary.err }}
        <span v-if="converting" class="spinner"></span>
      </div>
    </header>

    <div v-if="wasmError" class="wasm-error">
      转换引擎初始化失败：{{ wasmError }}
      <button @click="reload">重试</button>
    </div>

    <FileDropZone @add="(paths: string[]) => enqueue(paths)" @pick="pickWithDialog" />

    <main class="main" v-if="items.length > 0">
      <section class="left">
        <FileList
          :items="items"
          :converting="converting"
          @select="selectOnly"
          @retry="retry"
          @retry-failed="retryFailed"
          @remove="remove"
          @clear="clearAll"
        />
      </section>
      <section class="right">
        <PreviewPanel v-if="selected" :item="selected" />
        <div v-else class="placeholder">在左侧选择文件查看 Markdown</div>
      </section>
    </main>

    <footer class="footer" v-if="selected">
      <OutputBar :item="selected" />
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html,
body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  color: #333;
  background: #fff;
}
#app {
  height: 100%;
}
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 16px;
  gap: 10px;
}
.app-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.app-header .title {
  font-size: 16px;
  font-weight: 600;
}
.app-header .subtitle {
  color: #999;
  font-size: 12px;
}
.summary {
  margin-left: auto;
  color: #666;
  font-size: 12px;
}
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-left: 6px;
  border: 2px solid #ccc;
  border-top-color: #2f7de1;
  border-radius: 50%;
  vertical-align: -2px;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.wasm-error {
  background: #fdecea;
  color: #b3261e;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}
.wasm-error button {
  margin-left: 8px;
  padding: 2px 10px;
  border: 1px solid #b3261e;
  background: #fff;
  color: #b3261e;
  border-radius: 4px;
  cursor: pointer;
}
.main {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
}
.left {
  flex: 0 0 320px;
  min-height: 0;
}
.right {
  flex: 1;
  min-width: 0;
  min-height: 0;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
}
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #bbb;
}
.footer {
  border-top: 1px solid #eee;
  padding-top: 10px;
}
</style>
