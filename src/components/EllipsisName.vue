<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  text: string
}>()

const el = ref<HTMLSpanElement | null>(null)
let canvas: HTMLCanvasElement | null = null
let ro: ResizeObserver | null = null

function textWidth(text: string): number {
  if (!canvas) canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx || !el.value) return 0
  ctx.font = getComputedStyle(el.value).font
  return ctx.measureText(text).width
}

function render() {
  const span = el.value
  if (!span) return
  const full = props.text
  const maxW = span.clientWidth
  if (maxW <= 0 || textWidth(full) <= maxW) {
    span.textContent = full
    return
  }
  const len = full.length
  const ell = '…'
  let lo = 1
  let hi = Math.floor(len / 2)
  let best = 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (textWidth(full.slice(0, mid) + ell + full.slice(len - mid)) <= maxW) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  span.textContent = full.slice(0, best) + ell + full.slice(len - best)
}

onMounted(() => {
  render()
  ro = new ResizeObserver(render)
  ro.observe(el.value!)
})

watch(() => props.text, render)

onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <span ref="el" class="name" :title="text"></span>
</template>

<style scoped>
.name {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
