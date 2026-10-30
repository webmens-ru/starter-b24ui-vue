<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'
import type { LockSetListItem } from '../../app/api/wicket'
import { useWicketLockCatalogStore } from '../../stores/wicket/wicketLockCatalogStore'
import ImageViewer from './ImageViewer.vue'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()
const lockCatalog = useWicketLockCatalogStore()

const lockItems = ref<LockSetListItem[]>([])
const loading = ref(true)
/** Выбранный комплект замка (id из get-list) */
const selectedLockId = ref<number | null>(null)
let isRestoringSelection = false
const descriptionDialog = ref<HTMLDialogElement | null>(null)
const descriptionLock = ref<LockSetListItem | null>(null)
function lockImages(lock: LockSetListItem): string[] {
  return [...new Set([...(lock.imageUrls ?? []), ...(lock.components ?? []).flatMap(component => component.imageUrls ?? [])])]
}
function openDescription(lock: LockSetListItem) {
  descriptionLock.value = lock
  descriptionDialog.value?.showModal()
}
function closeDescription() {
  descriptionDialog.value?.close()
  descriptionLock.value = null
}
onBeforeUnmount(() => descriptionDialog.value?.close())

const selectedLock = computed(() =>
  lockItems.value.find(lock => lock.id === selectedLockId.value) ?? null,
)

function syncSelectionToCalc() {
  calc.lockSetId.value = selectedLockId.value
  calc.typeLock.value = selectedLock.value?.marking ?? ''
  calc.lockPenId.value = null
  calc.lockPenColorId.value = null
  calc.lockPenColor.value = ''
}

function updateLockBlock() {
  calc.rebuildLockSummaryBlock()
}

async function loadLocks() {
  loading.value = true
  try {
    lockItems.value = await lockCatalog.load(Number(calc.modelId.value))
  } catch (e) {
    console.warn('getLocks:', e)
    lockItems.value = []
  } finally {
    loading.value = false
  }
}

watch(selectedLockId, async () => {
  if (isRestoringSelection) return
  await save()
})

function inferSavedLockSetId(): number | null {
  if (calc.lockSetId.value != null && lockItems.value.some(lock => lock.id === calc.lockSetId.value)) {
    return calc.lockSetId.value
  }
  return null
}

async function save() {
  const previous = {
    lockSetId: calc.lockSetId.value,
    typeLock: calc.typeLock.value,
  }
  syncSelectionToCalc()
  updateLockBlock()

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      lockSetId: calc.lockSetId.value,
      providesLock: calc.providesLock.value || null,
      lockInstaller: calc.lockInstaller.value || null,
      lockPenId: calc.lockPenId.value,
      lockPenColorId: calc.lockPenColorId.value,
    })
  } catch (e) {
    isRestoringSelection = true
    try {
      calc.lockSetId.value = previous.lockSetId
      calc.typeLock.value = previous.typeLock
      selectedLockId.value = previous.lockSetId
      await nextTick()
      updateLockBlock()
    } finally {
      isRestoringSelection = false
    }
    console.warn('saveWicketData:', e)
    return
  }

  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId:     Number(calc.number.value),
        productRowId: calc.getCurrentProductRowContext().productRowId,
        productType: calc.productType.value,
        model:        calc.model.value,
        modelId:     calc.modelId.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
}

onMounted(async () => {
  calc.setActivePage('page_lock_type')
  isRestoringSelection = true
  await loadLocks()
  const savedLockSetId = inferSavedLockSetId()
  const savedLock = lockItems.value.find(lock => lock.id === savedLockSetId)
  if (savedLock) {
    calc.lockSetId.value = savedLockSetId
    selectedLockId.value = savedLockSetId
    calc.typeLock.value = savedLock.marking
    calc.lockPenId.value = null
    calc.lockPenColorId.value = null
    calc.lockPenColor.value = ''
    updateLockBlock()
  }
  await nextTick()
  isRestoringSelection = false
})
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Комплект замка</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <!-- 1. Выбор комплекта замка -->
    <div>
      <h2 class="text-lg font-semibold mb-2 text-center">Тип замка</h2>
      <div v-if="loading" class="px-2 py-4 text-sm text-gray-400 text-center">Загрузка...</div>
      <div v-else class="locks-viewer-grid">
        <label
          v-for="lock in lockItems"
          :key="lock.id"
          class="lock-viewer-card"
        >
          <input
            v-model="selectedLockId"
            type="radio"
            :value="lock.id"
            class="sr-only"
          />
          <div class="card-content">
            <ImageViewer
              :title="lock.marking"
              :images="lockImages(lock)"
              enlarge
              image-height="160px"
            />
            <span class="block text-sm font-semibold text-center mt-2">{{ lock.marking }}</span>
            <button type="button" class="lock-description-button" :data-description-id="lock.id" @click.stop.prevent="openDescription(lock)">Описание</button>
          </div>
        </label>
      </div>
    </div>

    <Teleport to="body">
      <dialog ref="descriptionDialog" class="lock-description-dialog" aria-label="Описание комплекта" @close="descriptionLock = null" @click.stop="($event.target === descriptionDialog) && closeDescription()">
        <template v-if="descriptionLock">
          <header><h2>{{ descriptionLock.marking }}</h2><button type="button" aria-label="Закрыть описание" @click.stop.prevent="closeDescription">×</button></header>
          <h3>Состав комплекта</h3>
          <ul v-if="descriptionLock.components?.length"><li v-for="component in descriptionLock.components" :key="component.id">{{ component.name }}</li></ul>
          <p v-else>Состав комплекта не указан</p>
        </template>
      </dialog>
    </Teleport>

  </div>
</template>

<style scoped>
.lock-description-button { display:block; margin:12px auto 0; padding:8px 16px; border-radius:8px; background:#e5f2ff; color:#1d4ed8; cursor:pointer; }
.lock-description-dialog { position:fixed; inset:0; margin:auto; width:min(640px,calc(100vw - 32px)); max-width:none; max-height:calc(100dvh - 32px); overflow:auto; padding:24px; border:0; border-radius:12px; background:white; color:#1f2937; }
.lock-description-dialog::backdrop { background:rgba(0,30,60,.4); backdrop-filter:blur(2px); }
.lock-description-dialog header { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:20px; }
.lock-description-dialog h2 { font-size:20px; font-weight:600; }
.lock-description-dialog h3 { font-weight:600; margin-bottom:12px; }
.lock-description-dialog li { margin-bottom:8px; }
.lock-description-dialog header button { width:40px; height:40px; flex-shrink:0; font-size:28px; cursor:pointer; }

.locks-viewer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px 24px;
  padding: 4px;
  width: 100%;
  min-width: 0;
}

@media (min-width: 900px) {
  .locks-viewer-grid {
    grid-template-columns: repeat(2, minmax(345px, 1fr));
    max-width: 1424px; /* 2 × 700px + gap 24px */
    margin: 0 auto;
  }
}

.lock-viewer-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  width: 100%;
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  padding: 8px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}

.lock-viewer-card:hover {
  border-color: #93c5fd;
}

.lock-viewer-card:has(input[type="radio"]:checked) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #eff6ff;
}

.lock-card {
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lock-card:hover {
  border-color: #93c5fd;
}

.lock-card:has(input[type="radio"]:checked) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.card-content {
  padding: 12px;
  background: transparent;
  transition: background 0.15s ease;
}

.lock-card:has(input[type="radio"]:checked) .card-content {
  background: #eff6ff;
}
</style>
