<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  text: string
}>()

const OVERSCAN = 10

const scroller = ref<HTMLDivElement | null>(null)
const lines = ref<string[]>([])
const lineHeight = ref(0)
const startIndex = ref(0)
const visible = ref<string[]>([])

const totalLines = computed(() => lines.value.length)
const totalHeight = computed(() => totalLines.value * lineHeight.value)
const lhCss = computed(() => (lineHeight.value > 0 ? lineHeight.value.toFixed(2) : '0') + 'px')

let rafId = 0
let ro: ResizeObserver | null = null

function measureLineHeight() {
  const sc = scroller.value
  if (!sc) return
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit;line-height:inherit;'
  probe.textContent = 'M'
  sc.appendChild(probe)
  const h = probe.getBoundingClientRect().height
  sc.removeChild(probe)
  if (h > 0) {
    lineHeight.value = h
  } else {
    const cs = getComputedStyle(sc)
    const fs = parseFloat(cs.fontSize) || 13
    const rawLh = parseFloat(cs.lineHeight)
    lineHeight.value = rawLh > 0 ? (cs.lineHeight.endsWith('px') ? rawLh : fs * rawLh) : fs * 1.6
  }
}

function update() {
  const sc = scroller.value
  const lh = lineHeight.value
  if (!sc || lh <= 0) return
  const total = totalLines.value
  const from = Math.max(0, Math.floor(sc.scrollTop / lh) - OVERSCAN)
  const to = Math.min(total, Math.ceil((sc.scrollTop + sc.clientHeight) / lh) + OVERSCAN)
  startIndex.value = from
  visible.value = lines.value.slice(from, to)
}

function onScroll() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    update()
  })
}

watch(
  () => props.text,
  (t) => {
    lines.value = t.split('\n')
    if (scroller.value) scroller.value.scrollTop = 0
    void nextTick(() => {
      measureLineHeight()
      update()
    })
  }
)

onMounted(() => {
  lines.value = props.text.split('\n')
  measureLineHeight()
  update()
  ro = new ResizeObserver(() => update())
  ro.observe(scroller.value!)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  ro?.disconnect()
})
</script>

<template>
  <div ref="scroller" class="virtual-body" @scroll="onScroll">
    <div class="content" :style="{ height: totalHeight.toFixed(2) + 'px', '--lh': lhCss }">
      <div
        v-for="(line, i) in visible"
        :key="startIndex + i"
        class="vline"
        :style="{ top: ((startIndex + i) * lineHeight).toFixed(2) + 'px' }"
      >{{ line }}</div>
    </div>
    <div v-if="text === ''" class="vempty">转换结果将显示在这里</div>
  </div>
</template>

<style scoped>
.virtual-body {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: auto;
  overflow-anchor: none;
  padding: 12px;
  font-family: 'SF Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
  background: var(--panel-bg);
  box-sizing: border-box;
}
.content {
  position: relative;
  min-width: 100%;
}
.vline {
  position: absolute;
  left: 0;
  height: var(--lh);
  white-space: pre;
}
.vempty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  white-space: normal;
  pointer-events: none;
}
</style>
