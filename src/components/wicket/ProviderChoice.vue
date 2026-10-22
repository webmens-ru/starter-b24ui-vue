<script setup lang="ts">
defineProps<{ title: string; options: string[]; disabled?: boolean }>()
const model = defineModel<string>({ required: true })
const emit = defineEmits<{ change: [] }>()
</script>

<template>
  <fieldset :disabled="disabled" class="min-w-0">
    <legend class="w-full text-center text-xl font-semibold mb-3">{{ title }}</legend>
    <div class="option-grid">
      <label v-for="option in options" :key="option" class="provider-card">
        <input v-model="model" type="radio" :value="option" class="sr-only" @change="emit('change')" />
        <span class="block p-3 text-sm font-semibold text-center">{{ option }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.option-grid { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 4px; }
@media (min-width: 640px) {
  .option-grid { grid-template-columns: repeat(2, 1fr); max-width: 600px; margin-inline: auto; }
}
.provider-card { cursor: pointer; border: 2px solid #e5e7eb; border-radius: 12px; background: #fff; }
.provider-card:hover { border-color: #93c5fd; }
.provider-card:has(input:checked) { border-color: #3b82f6; box-shadow: 0 0 0 3px rgb(59 130 246 / 15%); background: #eff6ff; }
.provider-card:has(input:focus-visible) { outline: 2px solid #2563eb; outline-offset: 3px; }
fieldset:disabled .provider-card { cursor: wait; opacity: .6; }
</style>
