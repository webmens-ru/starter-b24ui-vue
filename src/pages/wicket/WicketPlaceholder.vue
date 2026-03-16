<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const typeId = computed(() => {
  const m = route.path.match(/\/wicket\/type(\d+)$/)
  return m ? m[1] : '?'
})
</script>

<template>
  <B24App>
    <B24SidebarLayout :use-light-content="false" :b24ui="{ container: 'mt-0' }">
      <div class="flex flex-col h-[calc(100vh-50px)] overflow-hidden bg-gray-50">
        <div class="flex items-center justify-between flex-wrap gap-2 shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
          <B24Button
            label="Назад"
            color="air-secondary"
            @click="router.push('/wicket/model')"
          />
          <h1 class="text-2xl font-bold text-gray-800">
            Калитка тип {{ typeId }}
          </h1>
          <div class="w-[68px]" />
        </div>
        <div class="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p class="text-gray-500">
            Раздел в разработке
          </p>
          <B24Button
            label="Выбрать другую модель"
            color="air-primary"
            @click="router.push('/wicket/model')"
          />
        </div>
      </div>
    </B24SidebarLayout>
  </B24App>
</template>
