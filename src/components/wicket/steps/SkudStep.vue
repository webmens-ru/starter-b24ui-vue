<script setup lang="ts">
import FurnitureAddon from '../FurnitureAddon.vue'
defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const config = {
  key: 'skud' as const,
  title: 'СКУД',
  page: 'page_skud',
  saveKeys: { isThere: 'isThereSkud', id: 'skudId', provided: 'skudProvided', installed: 'skudInstalled', ids: 'skudIds' },
}
</script>
<template>
  <FurnitureAddon :config="config" @next="$emit('next')" @back="$emit('back')" />
</template>
