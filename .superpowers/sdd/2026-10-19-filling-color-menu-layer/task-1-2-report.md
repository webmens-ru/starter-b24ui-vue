# Tasks 1–2: слой меню выбора цвета

## Изменённые файлы

- `src/components/wicket/shared/FillingAppearanceFields.spec.ts` — импорт raw-шаблона и проверка контракта цвета.
- `src/components/wicket/type1/ProfnastilFacade.spec.ts` — проверка контракта цвета.
- `src/components/wicket/type2/T2ProfnastilFacade.spec.ts` — проверка контракта формы Type 2.
- `src/components/wicket/shared/FillingAppearanceFields.vue` — `z-50` добавлен только меню цвета; меню производителя не изменено.
- `src/components/wicket/type1/ProfnastilFacade.vue` — `z-50` добавлен меню цвета.
- `src/components/wicket/type2/T2ProfnastilForm.vue` — `z-50` добавлен меню цвета.

## RED evidence

До реализации добавлены три проверки `:b24ui="{ content: 'z-50' }"` и запущено:

```text
pnpm exec vitest run src/components/wicket/shared/FillingAppearanceFields.spec.ts src/components/wicket/type1/ProfnastilFacade.spec.ts src/components/wicket/type2/T2ProfnastilFacade.spec.ts
```

Результат: exit code 1; 3 test files failed, 3 tests failed и 31 passed. Все три новые проверки упали на отсутствии строки настройки слоя в соответствующих raw-шаблонах. Ошибок загрузки тестов или синтаксиса не было.

## GREEN evidence

После добавления настройки в три меню цвета та же команда завершилась с exit code 0: 3 test files passed, 34 tests passed.

## Полные frontend-проверки

- `pnpm test:run` — exit code 0; 73 test files passed, 860 tests passed.
- `pnpm build` — exit code 0; Vite преобразовал 975 модулей и собрал production bundle.

## Self-review

- `git diff --check` завершился без замечаний.
- Изменения ограничены тремя заданными Vue-шаблонами и тремя заданными спеками. Меню производителя не затронуто.
- Полный набор тестов и сборка успешны.
- Вывод содержит существующие предупреждения Vue Router injection и ожидаемый `network unavailable` из сценария retry. Сборка также сообщает о JS-чанке больше 500 kB; ошибок сборки нет.
