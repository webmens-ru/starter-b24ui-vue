<script setup lang="ts">
import { ref } from 'vue'
import T3FenceEdge from './T3FenceEdge.vue'
const emit = defineEmits<{ next: []; back: [] }>()
const step = ref<InstanceType<typeof T3FenceEdge> | null>(null)
defineExpose({ validateBeforeLeave: () => step.value?.validateBeforeLeave() ?? false })
</script>
<template>
  <T3FenceEdge ref="step" side="facade" @next="emit('next')" @back="emit('back')" />
</template>
