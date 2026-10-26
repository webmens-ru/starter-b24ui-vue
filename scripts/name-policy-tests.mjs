import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { inspectSource, scanRepository } from './check-name-policy.mjs'

test('rejects caption-driven predicates including callbacks and Vue bindings', () => {
  for (const source of [
    'if (item.name === "Paint") {}',
    'const x = rows.find(row => row.title === selected.title)',
    'const active = selection === "Две стороны"',
    'if (caption.includes("замк")) {}',
    'switch (selection) { case "Краска": break }',
    'if (model.peremichkaPolozheniyeId === 2) {}',
    'if (peremichkaPolozheniyeId === 2) {}',
    'switch (model.openingOptionId) { case 1: break }',
    'if ([1, 4].includes(model.openingOptionId)) {}',
    'if (Number(model.openingOptionId ?? 0) === 1) {}',
    'if (openingOptionId.value === 1) {}',
    'switch (calc.peremichkaPolozheniyeId.value) { case 2: break }',
    'if ([1, 4].includes(calc.openingOptionId.value)) {}',
    'if (["Краска"].includes(item.name)) {}',
    'if (["Краска", "Грунт"].includes(selection)) {}',
    'if (["Paint"].includes(item.name)) {}',
    '<script setup>const x = 1</script><template><div v-if="item.name === \'Paint\'"/></template>',
    'if (\n item["name"]\n === "Paint"\n) {}',
  ]) assert.notEqual(inspectSource(source, source.startsWith('<') ? 'src/Example.vue' : 'src/example.ts').length, 0, source)
})

test('permits validation, search/display and stable technical codes', () => {
  for (const source of [
    'if (item.name !== "") {}',
    'if (item.name == null) {}',
    'const visible = item.name.includes(query)',
    'const text = item.name',
    'if (role === "manufacturer") {}',
    'if (model.modelId === 2) {}',
    'if (render(item.title) !== undefined) {}',
    'const choices = { manufacturer: "Изготовитель" }',
    '// if (item.name === "Краска") {}',
    '<script setup>const x = 1</script><template><div title="Краска">Краска</div></template>',
  ]) assert.deepEqual(inspectSource(source, source.startsWith('<') ? 'src/Example.vue' : 'src/example.ts'), [], source)
})

test('only explicitly reviewed legacy paths are exempt', () => {
  const source = 'if (item.name === "Краска") {}'
  assert.deepEqual(inspectSource(source, 'src/app/api/legacySummaryCodes.ts'), [])
  assert.notEqual(inspectSource(source, 'src/app/api/legacyNewBusiness.ts').length, 0)
})

test('only the reviewed FK display-refresh methods may compare their saved captions', () => {
  const path = 'src/components/wicket/shared/FillingAppearanceFields.vue'
  const display = '<script>function setManufacturer(selected) { return savedCaption !== (selected?.name ?? "") }</script>'
  assert.deepEqual(inspectSource(display, path), [])
  const business = '<script>function calculatePrice(selected) { return selected.name === "Paint" }</script>'
  assert.notEqual(inspectSource(business, path).length, 0)
})

test('current live repository passes the guard', () => {
  assert.deepEqual(scanRepository(new URL('../', import.meta.url)), [])
})

test('CLI rejects forbidden fixture and accepts property-based fixture', () => {
  const root = mkdtempSync(join(tmpdir(), 'name-policy-'))
  mkdirSync(join(root, 'src'))
  const path = join(root, 'src/Example.ts')
  const script = fileURLToPath(new URL('./check-name-policy.mjs', import.meta.url))
  try {
    writeFileSync(path, 'if (item.name === "Paint") {}')
    const rejected = spawnSync(process.execPath, [script, root], { encoding: 'utf8' })
    assert.equal(rejected.status, 1)
    assert.match(rejected.stderr, /src\/Example\.ts/)
    writeFileSync(path, 'if (item.code === "paint") {}')
    assert.equal(spawnSync(process.execPath, [script, root]).status, 0)
  } finally {
    unlinkSync(path)
    rmdirSync(join(root, 'src'))
    rmdirSync(root)
  }
})
