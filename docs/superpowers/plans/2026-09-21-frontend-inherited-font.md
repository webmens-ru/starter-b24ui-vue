# Frontend Inherited Font Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the complete Vue frontend inherit the surrounding page font while keeping component-specific typography intact.

**Architecture:** Add one scoped global typography rule to the existing frontend stylesheet. `#app` inherits the host page's font family, while native form controls inside it inherit the complete font shorthand to avoid browser-default control fonts. A raw-CSS Vitest regression test locks down the scope and declarations.

**Tech Stack:** Vue 3, Tailwind CSS 4, B24UI, Vitest, TypeScript, Vite

## Global Constraints

- Apply the font behavior only inside `#app`; do not alter the host Yii page outside the Vue mount.
- Do not apply `font` or `font-family` to every descendant because that can break component typography or icon fonts.
- Preserve explicit component sizes, weights, and line heights.
- Keep files LF-only and without BOM.

---

### Task 1: Add scoped inherited typography

**Files:**
- Create: `src/assets/main.spec.ts`
- Modify: `src/assets/main.css`

**Interfaces:**
- Consumes: the host page's computed font inherited by the Vue mount point.
- Produces: global CSS where `#app` uses `font-family: inherit` and its native `button`, `input`, `select`, and `textarea` controls use `font: inherit`.

- [ ] **Step 1: Write the failing regression test**

```ts
import { describe, expect, it } from 'vitest'
import styles from './main.css?raw'

describe('global frontend typography', () => {
  it('inherits the host font without resetting every descendant', () => {
    expect(styles).toContain(`#app {
  font-family: inherit;
}`)
    expect(styles).toContain(`:where(
  #app button,
  #app input,
  #app select,
  #app textarea
) {
  font: inherit;
}`)
    expect(styles).not.toMatch(/#app\s+\*[^\{]*\{[^}]*font(?:-family)?\s*:/s)
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `./node_modules/.bin/vitest run src/assets/main.spec.ts`

Expected: FAIL because `main.css` does not yet contain the `#app` font rules.

- [ ] **Step 3: Add the minimal scoped CSS**

Append after the two global imports and before existing utility rules in `src/assets/main.css`:

```css
#app {
  font-family: inherit;
}

:where(
  #app button,
  #app input,
  #app select,
  #app textarea
) {
  font: inherit;
}
```

- [ ] **Step 4: Run focused and complete verification**

Run:

```bash
./node_modules/.bin/vitest run src/assets/main.spec.ts
npm run test:run
npm run typecheck
npm run build
```

Expected: the focused test passes, the complete test suite has zero failures, TypeScript exits successfully, and Vite produces production assets.

- [ ] **Step 5: Commit the source change**

```bash
git add src/assets/main.css src/assets/main.spec.ts
git commit -m "fix: inherit host font across frontend"
```

### Task 2: Publish and verify the production assets

**Files:**
- Modify in backend repository: `config/params.php`
- Modify in backend repository: `assets/VueAppAsset.php`
- Modify in backend repository: `assets/VueAppNoBootstrapAsset.php`
- Replace generated files in backend repository: `web/vue/index-*.js`, `web/vue/index-*.css`

**Interfaces:**
- Consumes: the successful frontend `dist/` output from Task 1.
- Produces: consistent backend asset pointers and a test-server deployment that loads the inherited-font build.

- [ ] **Step 1: Publish the built Vue assets through the project deployment script**

Run the repository's `scripts/deploy-vue.php` using the project PHP 8.3 container, with the frontend repository mounted read-only as `/frontend`.

Expected: `Vue-ассеты и указатели опубликованы.` and all three PHP pointer files reference the same new CSS and JavaScript hashes.

- [ ] **Step 2: Verify generated files before committing**

Run:

```bash
git diff --check
rg -n "index-[A-Za-z0-9_-]+\\.(js|css)" config/params.php assets/VueAppAsset.php assets/VueAppNoBootstrapAsset.php
```

Expected: no whitespace errors and consistent filenames in all three pointer files.

- [ ] **Step 3: Commit generated backend assets**

```bash
git add -u assets/VueAppAsset.php assets/VueAppNoBootstrapAsset.php config/params.php web/vue
git add web/vue/index-*.js web/vue/index-*.css
git commit -m "build: publish inherited frontend font assets"
```

- [ ] **Step 4: Deploy only to the test server with backup**

Back up the current three PHP pointer files under `/home/d/doorhankrd/test-lk.doorhan-krd.ru/.deploy-backups/20260921-inherited-font/`, upload the new pointer and hashed asset files to `/home/d/doorhankrd/test-lk.doorhan-krd.ru/public_html`, and do not remove old hashed assets.

- [ ] **Step 5: Verify the test deployment**

Run `/usr/local/bin/php8.3 -l` for all three pointer files on the test server, verify their filenames agree, reload the product-row page, and inspect the actions menu. Expected: the frontend loads normally and «Сформировать PDF» uses the same inherited font as neighboring menu commands.
