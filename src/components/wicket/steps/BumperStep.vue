<script setup lang="ts">
import FurnitureAddon from '../FurnitureAddon.vue'
defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const config = {
  key: 'bumper' as const,
  title: 'Отбойник',
  page: 'page_bumper',
  saveKeys: { isThere: 'isThereBumper', id: 'bumperId', provided: 'bumperProvided', installed: 'bumperInstalled' },
}
</script>
<template>
  <FurnitureAddon :config="config" @next="$emit('next')" @back="$emit('back')" />
</template>
