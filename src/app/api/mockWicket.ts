import type { SelectItem, RecalculateResponse, FilterOptions, SidingFilters, SidingRow } from './wicket.types'

// ─── Таблица сайдинга (реальные данные) ──────────────────────────────────────

const SIDING_ROWS: SidingRow[] = [
  { id: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 1014',            price_m2: 850, deliveryTime: '7',  inStock: 'да' },
  { id: 2,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 1015',            price_m2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 3,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 3005',            price_m2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 4,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 5005',            price_m2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 5,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 7004',            price_m2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 6,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 8004',            price_m2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 7,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 8017',            price_m2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 8,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9003',            price_m2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 9,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9006',            price_m2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 10,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Матовый',      color: 'RAL 6020',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 11,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Матовый',      color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 12,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Белая Береза',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 13,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Дерево Св. Текстур.', price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 14,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Oak Темный Дуб',      price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 15,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Золотое Мербау',      price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 16,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Марроканский Дуб',    price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 17,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Орех',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 18,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Сосна',               price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 19,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Снежный Дуб',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 20,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Темный Бриар',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 21,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Темное Венге',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 22,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech ЛМЗ', color: 'Античный Дуб',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 23,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech ЛМЗ', color: 'Дерево Св. Текстур.', price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 24,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 1014',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 25,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 1015',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 26,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 3003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 27,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 3005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 28,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 5005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 29,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 5021',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 30,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 6005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 31,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 7004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 32,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 7005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 33,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 34,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 35,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9002',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 36,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 37,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9006',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 38,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Матовый',      color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 39,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Матовый',      color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 40,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Белая Береза',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 41,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Дерево Св. Текстур.', price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 42,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Oak Темный Дуб',      price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 43,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Золотое Мербау',      price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 44,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Марроканский Дуб',    price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 45,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Орех',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 46,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Клен',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 47,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Сосна',               price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 48,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Снежный Дуб',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 49,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Темный Бриар',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 50,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Сандал',              price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 51,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Темное Венге',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 52,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech ЛМЗ', color: 'Античный Дуб',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 53,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech ЛМЗ', color: 'Дерево Св. Текстур.', price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 54,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 1014',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 55,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 1015',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 56,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 2004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 57,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 3003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 58,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 3005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 59,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 5005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 60,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 5021',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 61,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 6002',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 62,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 6005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 63,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 64,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 65,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 66,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7035',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 67,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 68,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9002',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 69,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 70,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9006',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 71,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 72,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 73,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 8019',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 74,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Белая Береза',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 75,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Дерево Св. Текстур.', price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 76,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Oak Темный Дуб',      price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 77,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Золотое Мербау',      price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 78,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Марроканский Дуб',    price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 79,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Орех',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 80,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Клен',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 81,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Сосна',               price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 82,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Снежный Дуб',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 83,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Темный Бриар',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 84,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Сандал',              price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 85,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Темное Венге',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 86,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Дуб Малибу',          price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 87,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Дер/ Тигровое (White)', price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 88,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech ЛМЗ', color: 'Античный Дуб',        price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 89,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech ЛМЗ', color: 'Дерево Св. Текстур.', price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 90,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 1014',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 91,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 1015',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 92,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 5005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 93,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 6005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 94,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 7004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 95,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 96,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 97,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 9002',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 98,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 9003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 99,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 9006',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 100, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'NL 807',              price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 101, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 1014',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 102, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 1015',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 103, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 3003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 104, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 3005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 105, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 5005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 106, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 6005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 107, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 108, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 109, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 110, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9002',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 111, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 112, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9006',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 113, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'NL 807',              price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 114, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 1014',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 115, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 1015',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 116, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 3003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 117, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 3005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 118, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 5005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 119, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 6005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 120, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 7004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 121, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 122, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 8004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 123, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 124, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 9002',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 125, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 9003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 126, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 9006',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 127, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 1014',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 128, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 1015',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 129, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 7004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 130, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 131, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 8004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 132, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 133, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 9002',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 134, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 9003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 135, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 9006',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 136, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 1014',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 137, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 1015',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 138, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 5005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 139, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 6005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 140, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 7004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 141, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 142, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 8004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 143, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 144, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 9003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 145, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 9006',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 146, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Матовый',      color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 147, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 148, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 149, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 8019',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 150, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 3005',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 151, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 152, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 8004',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 153, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 154, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 8019',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 155, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 156, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 157, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 9002',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 158, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 9003',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 159, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 9006',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 160, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Матовый',     color: 'RAL 7024',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 161, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Матовый',     color: 'RAL 8017',            price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 162, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Бел.Береза',          price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 163, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Золот. Мербау',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 164, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Oak Темн. Дуб',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 165, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Орех',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 166, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Клен',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 167, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Снежный Дуб',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 168, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Бел. Береза',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 169, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Золот. Мербау',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 170, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Сандал',              price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 171, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Дер. Св. Текстур.',   price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 172, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Oak Темн. Дуб',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 173, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Маррок. Дуб',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 174, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Орех',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 175, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Клен',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 176, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Сосна',               price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 177, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Снежн. Дуб',          price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 178, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Темн. Бриар',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 179, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Темн. Венге',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 180, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Бел. Береза',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 181, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Золот. Мербау',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 182, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Сандал',              price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 183, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Дер. Св. Текстур.',   price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 184, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Oak Темн. Дуб',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 185, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Маррок. Дуб',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 186, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Орех',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 187, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Клен',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 188, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Сосна',               price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 189, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Снежн. Дуб',          price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 190, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Темн. Бриар',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 191, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Темн. Венге',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 192, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Бел. Береза',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 193, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Золот. Мербау',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 194, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Сандал',              price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 195, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Дер. Св. Текстур.',   price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 196, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Oak Темн. Дуб',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 197, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Маррок. Дуб',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 198, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Орех',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 199, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Клен',                price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 200, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Сосна',               price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 201, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Снежн. Дуб',          price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 202, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Темн. Бриар',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 203, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Темн. Венге',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 204, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Бел. Береза',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 205, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Золот. Мербау',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 206, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Дер. Св. Текстур.',   price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 207, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Oak Темн. Дуб',       price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 208, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Маррок. Дуб',         price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 209, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Сосна',               price_m2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 210, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Снежн. Дуб',          price_m2: 850, deliveryTime: '12', inStock: 'да' },
]

// ─── Фильтры — генерируются из данных ────────────────────────────────────────

function unique(key: keyof SidingRow) {
  return [...new Set(SIDING_ROWS.map(r => String(r[key])))]
    .sort()
    .map(v => ({ id: v, name: v }))
}

const FILTER_COMPANY: FilterOptions = {
  company: unique('company'),
}

const FILTER_SIDING: FilterOptions = {
  material:      unique('material'),
  form:          unique('form'),
  typeOfCoating: unique('typeOfCoating'),
  color:         unique('color'),
}

export async function mockGetFilterOptions(url: string): Promise<FilterOptions> {
  await delay(150)
  if (url.includes('get-filter-data-siding')) return FILTER_SIDING
  return FILTER_COMPANY
}

export async function mockGetSidingTable(filters: SidingFilters): Promise<{ table: SidingRow[] }> {
  await delay(200)
  let rows = [...SIDING_ROWS]
  if (filters.companies.length)     rows = rows.filter(r => filters.companies.includes(String(r.company)))
  if (filters.materials.length)     rows = rows.filter(r => filters.materials.includes(String(r.material)))
  if (filters.form.length)          rows = rows.filter(r => filters.form.includes(String(r.form)))
  if (filters.typeOfCoating.length) rows = rows.filter(r => filters.typeOfCoating.includes(String(r.typeOfCoating)))
  if (filters.colors.length)        rows = rows.filter(r => filters.colors.includes(String(r.color)))
  return { table: rows }
}

// ─── Моки столбы / перемычка ─────────────────────────────────────────────────

const MOCK_ASSORTMENT_STOLB: SelectItem[] = [
  { id: 7,  name: '60/60/2' },
  { id: 8,  name: '60/40/2' },
  { id: 9,  name: '60/30/2' },
  { id: 13, name: '60/40/4' },
]

const MOCK_PEREMICHKA_POLOZHENIYE: SelectItem[] = [
  { id: '1', name: 'Без перемычки' },
  { id: '2', name: 'Перемычка над створкой' },
  { id: '3', name: 'Перемычка за створкой' },
]

const MOCK_ASSORTMENT_JUMPER: SelectItem[] = [
  { id: 8,  name: '20/20/2' },
  { id: 9,  name: '25/25/2' },
  { id: 10, name: '30/30/2' },
  { id: 11, name: '40/20/2' },
  { id: 12, name: '40/40/2' },
  { id: 13, name: '50/25/2' },
  { id: 14, name: '50/50/2' },
]

export async function mockGetAssortmentStolb(): Promise<{ arr_assortment_pipe: SelectItem[] }> {
  await delay(100)
  return { arr_assortment_pipe: MOCK_ASSORTMENT_STOLB }
}

export async function mockGetPolozhenieJumper(): Promise<{ arr_available_polozheniye_jumper: SelectItem[] }> {
  await delay(100)
  return { arr_available_polozheniye_jumper: MOCK_PEREMICHKA_POLOZHENIYE }
}

export async function mockGetAssortmentJumper(): Promise<{ arr_assortment_jumper: SelectItem[] }> {
  await delay(100)
  return { arr_assortment_jumper: MOCK_ASSORTMENT_JUMPER }
}

// ─── Моки цвет щита ──────────────────────────────────────────────────────────

const MOCK_COLOR_SHIELD: SelectItem[] = [
  { id: 1,  name: 'RAL 7024 (Графитовый серый)' },
  { id: 2,  name: 'RAL 8017 (Шоколадно-коричневый)' },
  { id: 3,  name: 'RAL 9003 (Сигнальный белый)' },
  { id: 4,  name: 'RAL 3005 (Винно-красный)' },
  { id: 5,  name: 'RAL 6020 (Хромовый зелёный)' },
  { id: 6,  name: 'RAL 1014 (Слоновая кость)' },
  { id: 7,  name: 'RAL 7004 (Сигнальный серый)' },
]

export async function mockGetColorShield(): Promise<{ arr_color_shield: SelectItem[] }> {
  await delay(100)
  return { arr_color_shield: MOCK_COLOR_SHIELD }
}

// ─── Мок подсказок адреса ────────────────────────────────────────────────────

export async function mockGetAddressSuggestions(
  query: string
): Promise<{ suggestions: { value: string }[] }> {
  await delay(150)
  const samples = [
    'Москва, ул. Ленина, 1',
    'Москва, ул. Пушкина, 10',
    'Санкт-Петербург, Невский пр-т, 50',
    'Екатеринбург, ул. Мира, 15',
    'Новосибирск, Красный пр-т, 25',
  ]
  const q = query.toLowerCase()
  return {
    suggestions: samples
      .filter(s => s.toLowerCase().includes(q))
      .map(value => ({ value })),
  }
}

// ─── Финальный расчёт ────────────────────────────────────────────────────────

export async function mockFinalCalculate(): Promise<{ price_dealer: string; price_retail: string }> {
  await delay(400)
  return { price_dealer: '15 000', price_retail: '22 500' }
}

export async function mockDeleteCalculation(): Promise<void> {
  await delay(200)
}

// ─── Прочие моки ─────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function mockFetchWicketPage(_modelId: number | string, _url: string): Promise<string> {
  return ''
}

export async function mockSaveWicketData(_payload: Record<string, unknown>): Promise<void> {
  // no-op
}

export async function mockRecalculate(
  _payload: {
    calculation_number: string | number
    product_type: string
    model: string
    model_id: string | number
  }
): Promise<RecalculateResponse> {
  return {
    price_dealer: 10000,
    price_retail: 13500,
  }
}
