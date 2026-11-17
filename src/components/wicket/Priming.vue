<script setup lang="ts">
import { ref } from 'vue'
import Painting from './Painting.vue'

const emit = defineEmits<{ (event: 'next'): void; (event: 'back'): void }>()
const step = ref<{ validateBeforeLeave: () => Promise<boolean> } | null>(null)

async function validateBeforeLeave(): Promise<boolean> {
  return await step.value?.validateBeforeLeave() ?? false
}

defineExpose({ validateBeforeLeave })
</script>

<template>
  <Painting ref="step" mode="primer" @next="emit('next')" @back="emit('back')" />
</template>
