# Section Validation Architecture

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc validation scattered across components with a centralized section-based validation system where each menu section defines its own validator, pages, and visibility rules.

**Architecture:** Create `SectionDefinition` objects that encapsulate menu item data, sub-pages, visibility conditions, and validation logic. The wizard page computes `incompletePages` and blocks calculation automatically from these definitions.

**Tech Stack:** Vue 3, TypeScript, Pinia

## Global Constraints

- Vue 3 + TypeScript
- camelCase for all new code
- No comments unless requested
- Follow existing patterns in `src/pages/wicket/` and `src/stores/wicket/`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/pages/wicket/wicketSections.ts` | Section definitions, types, `computeSectionValidation()` |
| `src/pages/wicket/WicketWizardPage.vue` | Consume sections for menu incomplete state + calculate blocking |
| `src/components/wicket/End.vue` | Remove manual `lockIncomplete` check, use sections |
| `src/components/wicket/IsTherelock.vue` | Remove manual `lockTypeMissing` check, use sections |

---

## Task 1: Create section types and definitions

**Files:**
- Create: `src/pages/wicket/wicketSections.ts`

**Interfaces:**
- Produces: `SectionDefinition`, `SectionValidation`, `WICKET_SECTIONS`, `computeSectionValidation()`

- [ ] **Step 1: Create `wicketSections.ts` with types and all section definitions**

```typescript
import type { WicketMenuItem } from './wicketMenuConfig'

export interface SectionValidation {
  valid: boolean
  errors: string[]
}

export interface SectionDefinition {
  menu: WicketMenuItem
  subPages: string[]
  visible: (state: Record<string, unknown>) => boolean
  validate: (state: Record<string, unknown>) => SectionValidation
}

function ok(): SectionValidation {
  return { valid: true, errors: [] }
}

function fail(...errors: string[]): SectionValidation {
  return { valid: false, errors }
}

export const WICKET_SECTIONS: SectionDefinition[] = [
  {
    menu: { page: 'page1', label: 'Вариант изготовления', url: 'manufacturing-option' },
    subPages: ['page1'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page2', label: 'Заполнение', url: 'fill-side' },
    subPages: ['page2', 'page2_facade_siding', 'page2_facade_profnastil', 'page2_facade_lamel',
      'page2_facade_fence', 'page2_facade_sp', 'page2_facade_zhalyuzi', 'page2_facade_sheet',
      'page2_yard_profnastil', 'page2_yard_lamel', 'page2_yard_fence', 'page2_yard_sp'],
    visible: () => true,
    validate: (s) => {
      const idFacade = s.idFacade as string | number | null
      const fillSide = s.fillSide as string
      const idYard = s.idYard as string | number | null
      const hasFacade = idFacade != null && String(idFacade).trim() !== ''
      const needYard = fillSide === 'Две стороны'
      const hasYard = idYard != null && String(idYard).trim() !== ''
      if (!hasFacade) return fail('Не выбран материал фасада')
      if (needYard && !hasYard) return fail('Не выбран материал двора')
      return ok()
    },
  },
  {
    menu: { page: 'page5', label: 'Столбы / Вариант открытия / Перемычка', url: 'stolb-variant-otkritiya-peremichka-2' },
    subPages: ['page5'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page3', label: 'Тип щита', url: 'shield-type' },
    subPages: ['page3'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page6', label: 'Расположение полотна', url: 'raspolozheniye-polotna' },
    subPages: ['page6'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page7', label: 'Проем', url: 'razmery-proyema' },
    subPages: ['page7'],
    visible: () => true,
    validate: (s) => {
      const w = s.widthProyema as string
      const h = s.heightProyema as string
      if (!w || !w.trim()) return fail('Не указана ширина проёма')
      if (!h || !h.trim()) return fail('Не указана высота проёма')
      return ok()
    },
  },
  {
    menu: { page: 'page9', label: 'Комплект замка', url: 'is-there-lock' },
    subPages: ['page9', 'page_lock_type', 'page_lock_components'],
    visible: () => true,
    validate: (s) => {
      const isThereLock = s.isThereLock as number
      const providesLock = s.providesLock as string
      const lockSetId = s.lockSetId as number | null
      if (isThereLock !== 1 || providesLock === 'Предоставляет заказчик') return ok()
      if (lockSetId == null) return fail('Не выбран тип замка')
      return ok()
    },
  },
  {
    menu: { page: 'page10', label: 'Дополнительная ручка', url: 'pen' },
    subPages: ['page10'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page_door_closer', label: 'Доводчик', url: 'door-closer' },
    subPages: ['page_door_closer'],
    visible: (s) => (s.availableSections as string[]).includes('page_door_closer'),
    validate: () => ok(),
  },
  {
    menu: { page: 'page_bumper', label: 'Отбойник', url: 'bumper' },
    subPages: ['page_bumper'],
    visible: (s) => (s.availableSections as string[]).includes('page_bumper'),
    validate: () => ok(),
  },
  {
    menu: { page: 'page_skud', label: 'СКУД', url: 'skud' },
    subPages: ['page_skud'],
    visible: (s) => (s.availableSections as string[]).includes('page_skud'),
    validate: () => ok(),
  },
  {
    menu: { page: 'page11', label: 'Клиент', url: 'client' },
    subPages: ['page11'],
    visible: () => true,
    validate: () => ok(),
  },
  {
    menu: { page: 'page12', label: 'Рассчитать', url: 'end' },
    subPages: ['page12'],
    visible: () => true,
    validate: () => ok(),
  },
]

export function computeSectionValidation(
  sections: SectionDefinition[],
  state: Record<string, unknown>,
): Map<string, SectionValidation> {
  const result = new Map<string, SectionValidation>()
  for (const section of sections) {
    if (section.visible(state)) {
      result.set(section.menu.page, section.validate(state))
    }
  }
  return result
}
```

- [ ] **Step 2: Run type check**

Run: `cd /Users/aleksandr/Sites/starter-b24ui-vue && npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: no errors related to `wicketSections.ts`

- [ ] **Step 3: Commit**

```bash
git add src/pages/wicket/wicketSections.ts
git commit -m "feat: add section definitions with validators"
```

---

## Task 2: Integrate sections into WicketWizardPage

**Files:**
- Modify: `src/pages/wicket/WicketWizardPage.vue:121-145` (menuItems + incompletePages)
- Modify: `src/pages/wicket/WicketWizardPage.vue:269-278` (desktop WicketMenu)
- Modify: `src/pages/wicket/WicketWizardPage.vue:299-311` (mobile WicketMenu)

**Interfaces:**
- Consumes: `WICKET_SECTIONS`, `computeSectionValidation` from `wicketSections.ts`

- [ ] **Step 1: Replace menuItems and incompletePages computed**

Replace in WicketWizardPage.vue:

```typescript
import { WICKET_SECTIONS, computeSectionValidation } from './wicketSections'
```

Then replace the existing `menuItems` and `incompletePages` computed properties:

```typescript
const sectionState = computed(() => ({
  modelId: String(calc.modelId.value ?? ''),
  materialFacadeGlob: calc.materialFacadeGlob.value,
  fillSide: calc.fillSide.value,
  materialYardGlob: calc.materialYardGlob.value,
  isThereLock: calc.isThereLock.value,
  providesLock: calc.providesLock.value,
  availableSections: calc.availableSections.value,
  idFacade: calc.idFacade.value,
  idYard: calc.idYard.value,
  lockSetId: calc.lockSetId.value,
  widthProyema: calc.widthProyema.value,
  heightProyema: calc.heightProyema.value,
}))

const sectionValidations = computed(() =>
  computeSectionValidation(WICKET_SECTIONS, sectionState.value),
)

const menuItems = computed(() =>
  WICKET_SECTIONS
    .filter(s => s.visible(sectionState.value))
    .map(s => s.menu),
)

const incompletePages = computed(() =>
  Array.from(sectionValidations.value.entries())
    .filter(([, v]) => !v.valid)
    .map(([page]) => page),
)
```

- [ ] **Step 2: Remove old `isFillSectionIncomplete` usage and `ADDON_PAGES`**

Delete the `ADDON_PAGES` constant and the old `menuItems`/`incompletePages` computeds that are now replaced.

- [ ] **Step 3: Build to verify**

Run: `cd /Users/aleksandr/Sites/starter-b24ui-vue && npm run build 2>&1 | tail -15`
Expected: successful build

- [ ] **Step 4: Commit**

```bash
git add src/pages/wicket/WicketWizardPage.vue
git commit -m "feat: use section definitions for menu and incomplete state"
```

---

## Task 3: Use sections in End.vue to block calculation

**Files:**
- Modify: `src/components/wicket/End.vue:91-110`

**Interfaces:**
- Consumes: `WICKET_SECTIONS`, `computeSectionValidation` from `wicketSections.ts`

- [ ] **Step 1: Replace manual `lockIncomplete` with section validation**

Replace in End.vue:

```typescript
import { WICKET_SECTIONS, computeSectionValidation } from '../../pages/wicket/wicketSections'
```

Replace the `lockIncomplete` computed and update `handleCalculate`:

```typescript
const sectionState = computed(() => ({
  isThereLock: calc.isThereLock.value,
  providesLock: calc.providesLock.value,
  lockSetId: calc.lockSetId.value,
  idFacade: calc.idFacade.value,
  idYard: calc.idYard.value,
  fillSide: calc.fillSide.value,
  widthProyema: calc.widthProyema.value,
  heightProyema: calc.heightProyema.value,
  availableSections: calc.availableSections.value,
}))

const allSectionsValid = computed(() => {
  const validations = computeSectionValidation(WICKET_SECTIONS, sectionState.value)
  return Array.from(validations.values()).every(v => v.valid)
})

const sectionErrors = computed(() => {
  const validations = computeSectionValidation(WICKET_SECTIONS, sectionState.value)
  const errors: string[] = []
  validations.forEach((v) => { if (!v.valid) errors.push(...v.errors) })
  return errors
})

async function handleCalculate() {
  if (!allSectionsValid.value) {
    openErrModal(sectionErrors.value.join('\n'))
    return
  }
  calculating.value = true
  // ... rest unchanged
```

- [ ] **Step 2: Build to verify**

Run: `cd /Users/aleksandr/Sites/starter-b24ui-vue && npm run build 2>&1 | tail -15`
Expected: successful build

- [ ] **Step 3: Commit**

```bash
git add src/components/wicket/End.vue
git commit -m "feat: block calculation when sections are invalid"
```

---

## Task 4: Clean up ad-hoc validation in IsTherelock.vue

**Files:**
- Modify: `src/components/wicket/IsTherelock.vue`

**Interfaces:**
- Consumes: `WICKET_SECTIONS`, `computeSectionValidation` from `wicketSections.ts`

- [ ] **Step 1: Replace manual `lockTypeMissing` with section validation**

Replace in IsTherelock.vue:

```typescript
import { WICKET_SECTIONS, computeSectionValidation } from '../../pages/wicket/wicketSections'
```

Replace `lockTypeMissing` computed:

```typescript
const sectionState = computed(() => ({
  isThereLock: calc.isThereLock.value === 1 && isThereLockName.value === 'Есть' ? 1 : calc.isThereLockName.value === 'Есть' ? 1 : 0,
  providesLock: calc.providesLock.value || providesLock.value,
  lockSetId: calc.lockSetId.value,
  idFacade: calc.idFacade.value,
  idYard: calc.idYard.value,
  fillSide: calc.fillSide.value,
  widthProyema: calc.widthProyema.value,
  heightProyema: calc.heightProyema.value,
  availableSections: calc.availableSections.value,
}))

const lockSection = computed(() => {
  const validations = computeSectionValidation(WICKET_SECTIONS, sectionState.value)
  return validations.get('page9')
})

const lockTypeMissing = computed(() => lockSection.value != null && !lockSection.value.valid)
```

- [ ] **Step 2: Build to verify**

Run: `cd /Users/aleksandr/Sites/starter-b24ui-vue && npm run build 2>&1 | tail -15`
Expected: successful build

- [ ] **Step 3: Commit**

```bash
git add src/components/wicket/IsTherelock.vue
git commit -m "refactor: use section validation in IsTherelock"
```

---

## Task 5: Remove stale ad-hoc code from WicketWizardPage

**Files:**
- Modify: `src/pages/wicket/WicketWizardPage.vue`

- [ ] **Step 1: Remove `isFillSectionIncomplete` usage**

The old `isFillSectionIncomplete` prop passed to WicketMenu is no longer needed since `incompletePages` is now computed from sections. Remove any remaining references.

- [ ] **Step 2: Remove old `ADDON_PAGES` constant**

Delete `const ADDON_PAGES = [...]` that was used for filtering menu items.

- [ ] **Step 3: Final build + verify**

Run: `cd /Users/aleksandr/Sites/starter-b24ui-vue && npm run build 2>&1 | tail -15`
Expected: successful build with no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/wicket/WicketWizardPage.vue
git commit -m "refactor: remove stale ad-hoc validation code"
```

---

## Verification

After all tasks:

1. Open the wicket calculator
2. Go to "Комплект замка", select "Есть", don't pick a type → menu item turns red
3. Click "Рассчитать" → blocked with error message
4. Go back, pick a lock type → red disappears
5. Check that "Заполнение" section also shows red if material not selected
6. Run `npm run build` — clean output
