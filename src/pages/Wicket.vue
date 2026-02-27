<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { fetchWicketPage } from '../app/api/wicket'
import { useCalculation } from '../composables/useCalculation'
import WicketMenu from '../components/WicketMenu.vue'

const { modelId, activePage, visitedPages, isPageAccessible } = useCalculation()

const dynamicContent = ref('')
const loading = ref(false)

const menuItems = [
  { url: 'manufacturing-option',               page: 'page1',  label: 'Вариант изготовления' },
  { url: 'fill-side',                           page: 'page2',  label: 'Заполнение' },
  { url: 'stolb-variant-otkritiya-peremichka-2', page: 'page5', label: 'Столбы / Вариант открытия / Перемычка' },
  { url: 'shield-type',                         page: 'page3',  label: 'Тип щита' },
  { url: 'raspolozheniye-polotna',               page: 'page6',  label: 'Расположение полотна' },
  { url: 'razmery-proyema',                     page: 'page7',  label: 'Проем' },
  { url: 'is-there-lock',                       page: 'page9',  label: 'Комплект замка' },
  { url: 'pen',                                 page: 'page10', label: 'Ручка' },
  { url: 'client',                              page: 'page11', label: 'Клиент' },
  { url: 'end',                                 page: 'page12', label: 'Рассчитать' },
]

async function loadContent(url: string) {
  loading.value = true
  try {
    dynamicContent.value = await fetchWicketPage(modelId.value, url)
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error)
  } finally {
    loading.value = false
  }
}

async function onMenuSelect(item: typeof menuItems[0]) {
  if (!isPageAccessible(item.page)) {
    alert('Сначала необходимо заполнить предыдущие шаги.')
    return
  }
  await loadContent(item.url)
}

onMounted(async () => {
  await loadContent('manufacturing-option')
  document.addEventListener('updatedActivePage', () => {})
})

onBeforeUnmount(() => {
  document.removeEventListener('updatedActivePage', () => {})
})
</script>

<template>
  <B24App>
    <B24SidebarLayout :use-light-content="true" :b24ui="{ container: 'mt-0' }">

      <template #sidebar>
        <B24SidebarHeader>
          <div class="h-full flex items-center ps-[25px] pe-4">
            <span class="text-sm font-semibold">Шаги расчёта</span>
          </div>
        </B24SidebarHeader>

        <B24SidebarBody>
          <B24SidebarSection>
            <WicketMenu
              :menu-items="menuItems"
              :active-page="activePage"
              :visited-pages="visitedPages"
              :is-page-accessible="isPageAccessible"
              @select="onMenuSelect"
            />
          </B24SidebarSection>
        </B24SidebarBody>
      </template>

      <template #navbar>
        <span class="text-sm font-semibold">Расчёт калитки</span>
      </template>

      <B24Alert
        v-if="loading"
        title="Загрузка..."
        color="air-primary"
        class="mb-4"
      />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="dynamicContent" />

    </B24SidebarLayout>
  </B24App>
</template>
