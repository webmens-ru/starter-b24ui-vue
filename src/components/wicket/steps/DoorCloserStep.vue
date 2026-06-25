<script setup lang="ts">
import FurnitureAddon from '../FurnitureAddon.vue'
defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const config = {
  key: 'doorCloser' as const,
  title: 'Доводчик',
  page: 'page_door_closer',
  saveKeys: { isThere: 'isThereDoorCloser', id: 'doorCloserId', provided: 'doorCloserProvided', installed: 'doorCloserInstalled' },
}
</script>
<template>
  <FurnitureAddon :config="config" @next="$emit('next')" @back="$emit('back')" />
</template>
