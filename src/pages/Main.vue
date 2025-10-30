<script setup lang="ts">
import PlayCircleIcon from '@bitrix24/b24icons-vue/main/PlayCircleIcon'
</script>

<template>
  <B24App>
    <B24SidebarLayout
      :use-light-content="false"
      :b24ui="{ container: 'mt-0' }"
    >
      <div class="flex flex-col items-start sm:items-center justify-center gap-[10px] h-[calc(100vh-50px)]">
        <ProseH1 class="sm:text-8xl font-light">
          Bitrix24 UI - Vue Starter
        </ProseH1>

        <div class="flex flex-wrap items-start sm:items-center gap-2">
          <B24Button
            label="Documentation"
            color="air-primary-copilot"
            :icon="PlayCircleIcon"
            to="https://bitrix24.github.io/b24ui/docs/getting-started/installation/vue/"
            target="_blank"
          />

          <B24Button
            label="GitHub"
            color="air-secondary-accent"
            to="https://github.com/bitrix24/b24ui"
            target="_blank"
          />
        </div>
      </div>
    </B24SidebarLayout>
  </B24App>
</template>
