# Соответствие API фронтенда и бэкенда

Сопоставление вызовов в `src/app/api/wicket.ts` с эндпоинтами бэкенда.

## Совместимость

| Что | Значение |
|-----|----------|
| Параметр | `order_id` (int) — ID заказа (order.id) во всех эндпоинтах |
| create response | `order_id` (int), `companyId`, `managerId` |
| get-data response | Содержит `orderId`, `order_id` и атрибуты модели |

> **Устарело:** `calculation_number` не поддерживается. Используйте только `order_id`.

## Номера расчётов / заказов

| Фронт | Метод | Эндпоинт |
|-------|-------|----------|
| `createOrder()` | POST | `/api/order/create` |
| `saveOrderData()` | POST | `/api/order/data` |

## Базовые операции (base-model)

| Фронт | Метод | Эндпоинт |
|-------|-------|----------|
| `createWicketMainMenu()` | POST | `/api/wicket/type{model_id}/main-menu` |
| `loadWicketData()` | GET | `/api/wicket/type{modelId}/get-data?order_id=…` (+ `model_id` для type2 и выше) |
| `saveWicketData()` | POST | `/api/wicket/type{model_id}/data` |
| `deleteCalculation()` | POST | `/api/wicket/type{model_id}/delete` |
| `getColorShield()` | GET | `/api/wicket/type{modelId}/get-color-shield` |
| `getPolozhenieJumper()` | POST | `/api/wicket/type{modelId}/get-available-polozheniye-jumper` |

## Справочники type1/type2

| Фронт | Метод | Эндпоинт |
|-------|-------|----------|
| `getAssortmentStolb()` | GET | `/api/wicket/type{modelId}/get-available-assortment-stolb` |
| `getAssortmentJumper()` | GET | `/api/wicket/type{modelId}/get-available-assortment-jumper` |
| `getSidingTable()` | POST | `/api/wicket/type{modelId}/get-filling-siding` |
| `getProfnastilTable()` | POST | `/api/wicket/type{modelId}/get-filling-profnastil` |

## Расчёт цены

| Фронт | Метод | Эндпоинт |
|-------|-------|----------|
| `finalCalculate()` | POST | `/api/wicket/calculation/index` |
| `recalculate()` | POST | `/api/wicket/calculation/index` |

## Формат ответа бэка

Успешный ответ: `{ "success": true, "data": { ... } }`  
Фронт берёт payload из `response.data.data`.

## Аутентификация

Сессионная cookie (Yii2 login). В `api` включено `withCredentials: true`.

## get-color-shield — структура элемента

```json
{ "id": 1, "name": "RAL 9003", "isStandard": 1 }
```

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | int | ID из dir_paints |
| `name` | string | Код RAL (ral_code) |
| `isStandard` | 0 \| 1 | 1 — стандартная краска, 0 — не стандартная |
