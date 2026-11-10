<script setup lang="ts">
import { ref } from 'vue'
import T3FenceLaying from './T3FenceLaying.vue'
const emit = defineEmits<{ next: []; back: [] }>()
const step = ref<InstanceType<typeof T3FenceLaying> | null>(null)
defineExpose({ validateBeforeLeave: () => step.value?.validateBeforeLeave() ?? false })
</script>
<template>
  <T3FenceLaying ref="step" side="facade" @next="emit('next')" @back="emit('back')" />
</template>
