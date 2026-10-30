<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  images: string[]
  title?: string
  enlarge?: boolean
  imageHeight?: string
}>(), {
  title: '',
  enlarge: false,
  imageHeight: '100px',
})

const currentIndex = ref(0)
const expanded = ref(false)

const currentImage = computed(() => {
  if (!props.images.length) return null
  const i = Math.max(0, Math.min(currentIndex.value, props.images.length - 1))
  return props.images[i]
})

const hasMultiple = computed(() => props.images.length > 1)

function prev() {
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length
}

function next() {
  currentIndex.value = (currentIndex.value + 1) % props.images.length
}

watch(() => props.images, () => {
  currentIndex.value = 0
}, { immediate: true })
</script>

<template>
  <div class="image-viewer">
    <div v-if="currentImage" class="viewer-main" :style="{ minHeight: imageHeight }">
      <img
        :src="currentImage"
        :alt="title"
        class="viewer-img"
        :style="{ minHeight: imageHeight, maxHeight: imageHeight }"
      />
      <button v-if="enlarge" type="button" class="viewer-enlarge" @click.stop.prevent="expanded = true">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></svg>
        Увеличить
      </button>
      <template v-if="hasMultiple">
        <button
          type="button"
          class="viewer-nav viewer-nav-prev"
          aria-label="Предыдущее"
          @click.stop.prevent="prev"
        >
          ‹
        </button>
        <button
          type="button"
          class="viewer-nav viewer-nav-next"
          aria-label="Следующее"
          @click.stop.prevent="next"
        >
          ›
        </button>
        <div class="viewer-dots">
          <button
            v-for="(_, i) in images"
            :key="i"
            type="button"
            class="viewer-dot"
            :class="{ active: i === currentIndex }"
            :aria-label="`Изображение ${i + 1}`"
            @click.stop.prevent="currentIndex = i"
          />
        </div>
      </template>
    </div>
    <B24Modal v-if="enlarge" v-model:open="expanded" :title="title || 'Просмотр изображения'" :b24ui="{ overlay: 'z-[2000]', content: 'z-[2001] sm:max-w-5xl' }">
      <template #body>
        <div class="expanded-viewer" @click.stop @change.stop>
          <img :src="currentImage ?? undefined" :alt="title" class="expanded-image" />
          <div v-if="hasMultiple" class="expanded-controls">
            <button type="button" @click.stop.prevent="prev">Предыдущее</button>
            <span>{{ currentIndex + 1 }} / {{ images.length }}</span>
            <button type="button" @click.stop.prevent="next">Следующее</button>
          </div>
        </div>
      </template>
    </B24Modal>
  </div>
</template>

<style scoped>
.viewer-enlarge { position:absolute; top:6px; right:6px; display:flex; align-items:center; gap:4px; padding:6px 8px; border:1px solid #e5e7eb; border-radius:6px; background:white; color:#1d4ed8; font-size:12px; cursor:pointer; }
.viewer-enlarge:focus-visible { outline:2px solid #3b82f6; outline-offset:2px; }
.expanded-image { display:block; width:100%; max-height:75vh; object-fit:contain; }
.expanded-controls { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:12px; }
.expanded-controls button { padding:8px 12px; border-radius:8px; background:#e5f2ff; color:#1d4ed8; cursor:pointer; }

.image-viewer {
  position: relative;
  width: 100%;
}

.viewer-main {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
}

.viewer-img {
  width: 100%;
  object-fit: contain;
}

.viewer-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.viewer-nav:hover {
  opacity: 1;
}

.viewer-nav-prev {
  left: 6px;
}

.viewer-nav-next {
  right: 6px;
}

.viewer-dots {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
}

.viewer-dot {
  width: 6px;
  height: 6px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background 0.15s;
}

.viewer-dot:hover,
.viewer-dot.active {
  background: rgba(255, 255, 255, 0.95);
}
</style>
