<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  images: string[]
  title?: string
  imageHeight?: string
}>(), {
  title: '',
  imageHeight: '100px',
})

const currentIndex = ref(0)

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
      <template v-if="hasMultiple">
        <button
          type="button"
          class="viewer-nav viewer-nav-prev"
          aria-label="Предыдущее"
          @click.prevent="prev"
        >
          ‹
        </button>
        <button
          type="button"
          class="viewer-nav viewer-nav-next"
          aria-label="Следующее"
          @click.prevent="next"
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
            @click.prevent="currentIndex = i"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
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
