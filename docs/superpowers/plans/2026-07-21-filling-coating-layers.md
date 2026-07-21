# Filling Coating Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render coating HEX at 10% opacity or an opaque texture inside the shared filling-material layer.

**Architecture:** Keep coating behavior in the concrete shared filling renderers. Existing `color` and `image` props represent coating appearance; wicket-type drawings select the material and view but do not implement coating rules. Replace the remaining duplicated type-2 C8 markup with `FillingDrawing`.

**Tech Stack:** Vue 3, TypeScript, SVG, Vitest, Vue Test Utils

## Global Constraints

- Draw `#f6f6f6` base only when a HEX coating exists.
- Draw HEX coating with `opacity="0.1"`.
- Draw texture opaque, without the base, and prefer it when HEX and texture both exist.
- Draw neither base nor coating when both appearance values are empty.
- Draw profile relief after the appearance layer.
- Use `appearanceMode: 'coating' | 'solid'`: realistic materials use `coating`, schematic drawings use `solid`.
- Do not add normalizers or intermediate appearance models.

---

### Task 1: Shared renderer coating behavior

**Files:**
- Modify: `src/components/wicket/drawing/fillings/FillingDrawing.spec.ts`
- Modify: `src/components/wicket/drawing/fillings/fillingDrawingTypes.ts`
- Modify: `src/components/wicket/drawing/fillings/FillingDrawing.vue`
- Modify: `src/components/wicket/drawing/fillings/ProfiledSheetDrawing.vue`
- Modify: `src/components/wicket/drawing/fillings/LogSidingDrawing.vue`

**Interfaces:**
- Consumes: `FillingVisualProps.color`, `FillingVisualProps.image`, and `FillingVisualProps.appearanceMode`.
- Produces: optional `filling-surface`, `filling-color-coating`, or `filling-texture` nodes before relief geometry.

- [ ] **Step 1: Write failing tests**

Add tests asserting the exact behavior:

```ts
it('draws a neutral base and a 10% HEX coating before profile relief', () => {
  const wrapper = mountDrawing({ color: '#704214', image: '' })
  expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#f6f6f6')
  expect(wrapper.get('[data-testid="filling-color-coating"]').attributes()).toMatchObject({
    fill: '#704214', opacity: '0.1',
  })
  expect(wrapper.html().indexOf('data-testid="filling-color-coating"'))
    .toBeLessThan(wrapper.html().indexOf('data-testid="filling-profile-shadow"'))
})

it('draws an opaque texture without a base or HEX layer', () => {
  const wrapper = mountDrawing({ color: '#704214', image: '/wood.webp' })
  expect(wrapper.find('[data-testid="filling-surface"]').exists()).toBe(false)
  expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
  expect(wrapper.get('[data-testid="filling-texture"]').attributes('opacity')).toBeUndefined()
})

it('draws no appearance layers without HEX or texture', () => {
  const wrapper = mountDrawing({ color: '', image: '' })
  expect(wrapper.find('[data-testid="filling-surface"]').exists()).toBe(false)
  expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
  expect(wrapper.find('[data-testid="filling-texture"]').exists()).toBe(false)
})

it('draws schematic color directly in solid mode', () => {
  const wrapper = mountDrawing({ color: '#bfdbfe', image: '', appearanceMode: 'solid' })
  expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#bfdbfe')
  expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
})
```

Add the siding layer-order case explicitly:

```ts
it('draws siding coating before its relief', () => {
  const wrapper = mountDrawing({
    materialGroup: 'Сайдинг',
    materialName: 'Сайдинг «Бревно»',
    color: '#704214',
    image: '',
  })
  expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#f6f6f6')
  expect(wrapper.get('[data-testid="filling-color-coating"]').attributes('opacity')).toBe('0.1')
  expect(wrapper.html().indexOf('data-testid="filling-color-coating"'))
    .toBeLessThan(wrapper.html().indexOf('data-testid="filling-log-waves"'))
})
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/components/wicket/drawing/fillings/FillingDrawing.spec.ts`

Expected: FAIL because the current surface always uses `color` and no `filling-color-coating` exists.

- [ ] **Step 3: Implement the minimal SVG layers**

Add the prop to `FillingVisualProps`:

```ts
appearanceMode: 'coating' | 'solid'
```

Pass it unchanged from `FillingDrawing` to the concrete renderer. Use the following node order in both concrete renderers, before existing shadows or waves:

```vue
<rect v-if="!image && color" data-testid="filling-surface" v-bind="area" fill="#f6f6f6" />
<rect
  v-if="!image && color"
  data-testid="filling-color-coating"
  v-bind="area"
  :fill="color"
  opacity="0.1"
/>
<rect v-if="image" data-testid="filling-texture" v-bind="area" :fill="`url(#${textureId})`" />
<rect
  v-if="appearanceMode === 'solid'"
  data-testid="filling-surface"
  v-bind="area"
  :fill="color"
/>
```

Restrict the base, HEX, and texture conditions to `appearanceMode === 'coating'`. Existing callers pass `appearanceMode="coating"`; schematic drawing modes pass `appearanceMode="solid"`.

- [ ] **Step 4: Verify GREEN**

Run: `npx vitest run src/components/wicket/drawing/fillings/FillingDrawing.spec.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

Stage only the three Task 1 files and commit with message `feat: render filling coating as separate layer`.

---

### Task 2: Type-2 integration with the shared renderer

**Files:**
- Modify: `src/components/wicket/drawing/type2/Type2Drawing.spec.ts`
- Modify: `src/components/wicket/drawing/type2/Type2Drawing.vue`
- Modify: `src/components/wicket/drawing/type1/Type1Drawing.vue`

**Interfaces:**
- Consumes: `FillingDrawing` with existing material, direction, color, image, area, and ID-prefix props.
- Produces: shared C8 material rendering in the existing street/yard z-order positions.

- [ ] **Step 1: Write a failing integration test**

```ts
it('renders type 2 coating through the shared filling renderer', () => {
  calc.colorFacadeHex.value = '#704214'
  calc.colorFacadeImage.value = ''
  const wrapper = mount(Type2Drawing)
  expect(wrapper.get('[data-testid="filling-c8"]')).toBeTruthy()
  expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#f6f6f6')
  expect(wrapper.get('[data-testid="filling-color-coating"]').attributes('opacity')).toBe('0.1')
})
```

Extend the existing texture case to assert that texture suppresses both base and HEX layers.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/components/wicket/drawing/type2/Type2Drawing.spec.ts`

Expected: FAIL because type 2 still has duplicated fill SVG.

- [ ] **Step 3: Replace only duplicated fill internals**

Import `FillingDrawing` from `../fillings/FillingDrawing.vue`. In both existing `type2-drawing-fill` groups render:

```vue
<FillingDrawing
  :area="geometry.fillArea"
  :material-group="calc.materialFacadeGlob.value"
  :material-name="calc.materialFacade.value"
  :direction="geometry.fill.direction"
  :color="displayedFillColor"
  :image="displayedFillImage"
  :appearance-mode="realisticColors ? 'coating' : 'solid'"
  :id-prefix="`type2-${instanceId}-${viewedFromYard ? 'yard' : 'street'}`"
/>
```

Keep the outer groups in their current positions so yard fill stays behind the frame and street fill stays in front. Remove only local texture/fill-line code that becomes unused.

In `Type1Drawing.vue`, pass `:appearance-mode="real ? 'coating' : 'solid'"` to both existing `FillingDrawing` instances.

- [ ] **Step 4: Verify integration**

Run: `npx vitest run src/components/wicket/drawing/type2/Type2Drawing.spec.ts src/components/wicket/drawing/fillings/FillingDrawing.spec.ts`

Expected: both files PASS, including existing reverse-side and texture scenarios.

- [ ] **Step 5: Commit**

Stage only the two Task 2 files and commit with message `refactor: use shared filling renderer in type 2`.

---

### Task 3: Full verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: completed shared renderer and type-2 integration.
- Produces: test and build evidence.

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`

Expected: zero failed test files and zero failed tests.

- [ ] **Step 2: Build production frontend**

Run: `npm run build`

Expected: Vite exits with code 0. Existing dependency and chunk-size warnings are acceptable.

- [ ] **Step 3: Inspect scope**

Run `git status --short` and scoped diffs. Confirm that commits contain only the planned renderer files and do not include pre-existing user changes.
