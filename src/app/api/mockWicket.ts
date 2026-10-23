import type { PipeOption } from './pipeProfiles'
import type {
  OpeningOptionsResponse,
  ColorShieldItem,
  PaintCategory,
  RecalculateResponse,
  FilterOptions,
  FillingAppearanceOptions,
  SidingFilters,
  SidingRow,
  ProfnastilFilters,
  ProfnastilRow,
  ProfnastilTableResponse,
  ProfnastilColorOption,
  WicketRootMutationResponse,
} from './wicket.types'

// ─── Таблица сайдинга (реальные данные) ──────────────────────────────────────

type LegacySidingFixture = SidingRow & { company: string; color: string }

const SIDING_ROWS: LegacySidingFixture[] = [
  { id: 1, sidingFormId: 1, typeOfCoatingId: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 1014',            priceM2: 850, deliveryTime: '7',  inStock: 'да' },
  { id: 2, sidingFormId: 1, typeOfCoatingId: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 1015',            priceM2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 3, sidingFormId: 1, typeOfCoatingId: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 3005',            priceM2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 4, sidingFormId: 1, typeOfCoatingId: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 5005',            priceM2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 5, sidingFormId: 1, typeOfCoatingId: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 7004',            priceM2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 6, sidingFormId: 1, typeOfCoatingId: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 8004',            priceM2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 7, sidingFormId: 1, typeOfCoatingId: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 8017',            priceM2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 8, sidingFormId: 1, typeOfCoatingId: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9003',            priceM2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 9, sidingFormId: 1, typeOfCoatingId: 1,   company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9006',            priceM2: 800, deliveryTime: '7',  inStock: 'да' },
  { id: 10, sidingFormId: 1, typeOfCoatingId: 2,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Матовый',      color: 'RAL 6020',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 11, sidingFormId: 1, typeOfCoatingId: 2,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Матовый',      color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 12, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Белая Береза',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 13, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Дерево Св. Текстур.', priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 14, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Oak Темный Дуб',      priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 15, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Золотое Мербау',      priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 16, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Марроканский Дуб',    priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 17, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Орех',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 18, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Сосна',               priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 19, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Снежный Дуб',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 20, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Темный Бриар',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 21, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Темное Венге',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 22, sidingFormId: 1, typeOfCoatingId: 4,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech ЛМЗ', color: 'Античный Дуб',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 23, sidingFormId: 1, typeOfCoatingId: 4,  company: 'Кровельный центр', material: 'Сайдинг «Бревно»',              form: 'Гладкая',   typeOfCoating: 'Printech ЛМЗ', color: 'Дерево Св. Текстур.', priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 24, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 1014',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 25, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 1015',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 26, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 3003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 27, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 3005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 28, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 5005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 29, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 5021',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 30, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 6005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 31, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 7004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 32, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 7005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 33, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 34, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 35, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9002',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 36, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 37, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Глянец',       color: 'RAL 9006',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 38, sidingFormId: 1, typeOfCoatingId: 2,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Матовый',      color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 39, sidingFormId: 1, typeOfCoatingId: 2,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Матовый',      color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 40, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Белая Береза',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 41, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Дерево Св. Текстур.', priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 42, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Oak Темный Дуб',      priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 43, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Золотое Мербау',      priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 44, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Марроканский Дуб',    priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 45, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Орех',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 46, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Клен',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 47, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Сосна',               priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 48, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Снежный Дуб',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 49, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Темный Бриар',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 50, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Сандал',              priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 51, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech',     color: 'Темное Венге',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 52, sidingFormId: 1, typeOfCoatingId: 4,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech ЛМЗ', color: 'Античный Дуб',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 53, sidingFormId: 1, typeOfCoatingId: 4,  company: 'Кровельный центр', material: 'Сайдинг «Корабельная доска»',   form: 'Гладкая',   typeOfCoating: 'Printech ЛМЗ', color: 'Дерево Св. Текстур.', priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 54, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 1014',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 55, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 1015',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 56, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 2004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 57, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 3003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 58, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 3005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 59, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 5005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 60, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 5021',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 61, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 6002',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 62, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 6005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 63, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 64, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 65, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 66, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7035',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 67, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 68, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9002',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 69, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 70, sidingFormId: 1, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9006',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 71, sidingFormId: 1, typeOfCoatingId: 2,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 72, sidingFormId: 1, typeOfCoatingId: 2,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 73, sidingFormId: 1, typeOfCoatingId: 2,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 8019',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 74, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Белая Береза',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 75, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Дерево Св. Текстур.', priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 76, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Oak Темный Дуб',      priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 77, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Золотое Мербау',      priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 78, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Марроканский Дуб',    priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 79, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Орех',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 80, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Клен',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 81, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Сосна',               priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 82, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Снежный Дуб',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 83, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Темный Бриар',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 84, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Сандал',              priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 85, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Темное Венге',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 86, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Дуб Малибу',          priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 87, sidingFormId: 1, typeOfCoatingId: 3,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Дер/ Тигровое (White)', priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 88, sidingFormId: 1, typeOfCoatingId: 4,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech ЛМЗ', color: 'Античный Дуб',        priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 89, sidingFormId: 1, typeOfCoatingId: 4,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 240мм»', form: 'Гладкая', typeOfCoating: 'Printech ЛМЗ', color: 'Дерево Св. Текстур.', priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 90, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 1014',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 91, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 1015',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 92, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 5005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 93, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 6005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 94, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 7004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 95, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 96, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 97, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 9002',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 98, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 9003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 99, sidingFormId: 2, typeOfCoatingId: 1,  company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Глянец',       color: 'RAL 9006',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 100, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'NL 807',              priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 101, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 1014',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 102, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 1015',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 103, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 3003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 104, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 3005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 105, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 5005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 106, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 6005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 107, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 108, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 109, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 110, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9002',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 111, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 112, sidingFormId: 1, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Глянец',       color: 'RAL 9006',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 113, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'NL 807',              priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 114, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 1014',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 115, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 1015',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 116, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 3003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 117, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 3005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 118, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 5005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 119, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 6005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 120, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 7004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 121, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 122, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 8004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 123, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 124, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 9002',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 125, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 9003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 126, sidingFormId: 3, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Глянец',       color: 'RAL 9006',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 127, sidingFormId: 4, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 1014',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 128, sidingFormId: 4, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 1015',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 129, sidingFormId: 4, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 7004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 130, sidingFormId: 4, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 131, sidingFormId: 4, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 8004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 132, sidingFormId: 4, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 133, sidingFormId: 4, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 9002',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 134, sidingFormId: 4, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 9003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 135, sidingFormId: 4, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Глянец',       color: 'RAL 9006',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 136, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 1014',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 137, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 1015',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 138, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 5005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 139, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 6005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 140, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 7004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 141, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 142, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 8004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 143, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 144, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 9003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 145, sidingFormId: 5, typeOfCoatingId: 1, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Глянец',      color: 'RAL 9006',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 146, sidingFormId: 2, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Матовый',      color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 147, sidingFormId: 1, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 148, sidingFormId: 1, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 149, sidingFormId: 1, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Матовый',      color: 'RAL 8019',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 150, sidingFormId: 3, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 3005',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 151, sidingFormId: 3, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 152, sidingFormId: 3, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 8004',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 153, sidingFormId: 3, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 154, sidingFormId: 3, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Матовый',      color: 'RAL 8019',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 155, sidingFormId: 4, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 156, sidingFormId: 4, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 157, sidingFormId: 4, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 9002',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 158, sidingFormId: 4, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 9003',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 159, sidingFormId: 4, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Матовый',      color: 'RAL 9006',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 160, sidingFormId: 5, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Матовый',     color: 'RAL 7024',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 161, sidingFormId: 5, typeOfCoatingId: 2, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Матовый',     color: 'RAL 8017',            priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 162, sidingFormId: 2, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Бел.Береза',          priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 163, sidingFormId: 2, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Золот. Мербау',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 164, sidingFormId: 2, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Oak Темн. Дуб',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 165, sidingFormId: 2, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Орех',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 166, sidingFormId: 2, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Клен',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 167, sidingFormId: 2, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Волна',   typeOfCoating: 'Printech',     color: 'Снежный Дуб',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 168, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Бел. Береза',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 169, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Золот. Мербау',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 170, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Сандал',              priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 171, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Дер. Св. Текстур.',   priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 172, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Oak Темн. Дуб',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 173, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Маррок. Дуб',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 174, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Орех',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 175, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Клен',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 176, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Сосна',               priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 177, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Снежн. Дуб',          priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 178, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Темн. Бриар',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 179, sidingFormId: 1, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Гладкая', typeOfCoating: 'Printech',     color: 'Темн. Венге',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 180, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Бел. Береза',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 181, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Золот. Мербау',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 182, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Сандал',              priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 183, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Дер. Св. Текстур.',   priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 184, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Oak Темн. Дуб',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 185, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Маррок. Дуб',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 186, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Орех',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 187, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Клен',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 188, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Сосна',               priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 189, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Снежн. Дуб',          priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 190, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Темн. Бриар',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 191, sidingFormId: 3, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Канавка', typeOfCoating: 'Printech',     color: 'Темн. Венге',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 192, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Бел. Береза',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 193, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Золот. Мербау',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 194, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Сандал',              priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 195, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Дер. Св. Текстур.',   priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 196, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Oak Темн. Дуб',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 197, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Маррок. Дуб',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 198, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Орех',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 199, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Клен',                priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 200, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Сосна',               priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 201, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Снежн. Дуб',          priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 202, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Темн. Бриар',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 203, sidingFormId: 4, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Накатка', typeOfCoating: 'Printech',     color: 'Темн. Венге',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 204, sidingFormId: 5, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Бел. Береза',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 205, sidingFormId: 5, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Золот. Мербау',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 206, sidingFormId: 5, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Дер. Св. Текстур.',   priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 207, sidingFormId: 5, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Oak Темн. Дуб',       priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 208, sidingFormId: 5, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Маррок. Дуб',         priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 209, sidingFormId: 5, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Сосна',               priceM2: 850, deliveryTime: '12', inStock: 'да' },
  { id: 210, sidingFormId: 5, typeOfCoatingId: 3, company: 'Кровельный центр', material: 'Сайдинг «Панель Евробрус 344мм»', form: 'Трапеция', typeOfCoating: 'Printech',    color: 'Снежн. Дуб',          priceM2: 850, deliveryTime: '12', inStock: 'да' },
]

// ─── Фильтры — генерируются из данных ────────────────────────────────────────

function unique(key: keyof SidingRow) {
  return [...new Set(SIDING_ROWS.map(r => String(r[key])))]
    .sort()
    .map(v => ({ id: v, name: v }))
}

const FILTER_SIDING: FilterOptions = {
  material:      unique('material'),
  form: [...new Map(SIDING_ROWS.map(row => [row.sidingFormId, { id: String(row.sidingFormId), name: row.form }])).values()],
  typeOfCoating: [...new Map(SIDING_ROWS.map(row => [row.typeOfCoatingId, { id: String(row.typeOfCoatingId), name: row.typeOfCoating }])).values()],
}

export async function mockGetFilterOptions(url: string, _type?: string): Promise<FilterOptions> {
  void _type
  await delay(150)
  if (url.includes('get-filter-data-siding')) return FILTER_SIDING
  if (url.includes('get-filter-data-profnastil')) return PROFNASTIL_FILTER
  return FILTER_MAIN
}

export async function mockGetSidingTable(filters: SidingFilters, page = 1): Promise<{ table: SidingRow[]; pagination: { page: number; pageSize: number; totalCount: number; pageCount: number } }> {
  await delay(200)
  let rows = [...SIDING_ROWS]
  if (filters.materials.length)     rows = rows.filter(r => filters.materials.includes(String(r.material)))
  if (filters.form.length)          rows = rows.filter(r => filters.form.includes(String(r.sidingFormId)))
  if (filters.typeOfCoating.length) rows = rows.filter(r => filters.typeOfCoating.includes(String(r.typeOfCoatingId)))
  const pageSize   = 100
  const totalCount = rows.length
  const pageCount  = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage   = Math.min(Math.max(1, page), pageCount)
  const table      = rows.slice((safePage - 1) * pageSize, safePage * pageSize).map(row => ({
    id: row.id,
    sidingFormId: row.sidingFormId,
    typeOfCoatingId: row.typeOfCoatingId,
    material: row.material,
    form: row.form,
    typeOfCoating: row.typeOfCoating,
    coatingHex: row.coatingHex,
    coatingImage: row.coatingImage,
    reliefImage: row.reliefImage,
    priceM2: row.priceM2,
    deliveryTime: row.deliveryTime,
    inStock: row.inStock,
  }))
  return { table, pagination: { page: safePage, pageSize, totalCount, pageCount } }
}

export async function mockGetFillingAppearanceOptions(
  materialGroup: string,
): Promise<FillingAppearanceOptions> {
  await delay(150)
  const isSiding = materialGroup === 'Сайдинг'
  return {
    manufacturers: isSiding
      ? [{ id: 1, name: 'Кровельный центр' }]
      : [{ id: 2, name: 'Металл Профиль' }],
    colors: isSiding
      ? [
          { id: 1, name: 'RAL 8017', hex: '#442F29', image: null },
          { id: 2, name: 'RAL 9003', hex: '#F4F4F4', image: null },
        ]
      : [{ id: 3, name: 'RAL 7016', hex: '#383E42', image: null }],
  }
}

// ─── Таблица профлиста (моковые данные) ──────────────────────────────────────

const PROFNASTIL_ROWS: ProfnastilRow[] = [
  { id: 1, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 2, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 3, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 4, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 5, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 6, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 7, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 8, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 9, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 10, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 11, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 12, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 13, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 14, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 15, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 16, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 17, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 18, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 19, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 20, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 21, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 22, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 23, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 24, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 25, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 26, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 27, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,45 мм, Глянец', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Глянец' },
  { id: 28, profileTypeId: 1, typeOfCoatingId: 5, name: 'Профлист С-20 0,45 мм, ДВС', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'ДВС' },
  { id: 29, profileTypeId: 1, typeOfCoatingId: 5, name: 'Профлист С-20 0,45 мм, ДВС', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'ДВС' },
  { id: 30, profileTypeId: 1, typeOfCoatingId: 5, name: 'Профлист С-20 0,45 мм, ДВС', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'ДВС' },
  { id: 31, profileTypeId: 1, typeOfCoatingId: 5, name: 'Профлист С-20 0,45 мм, ДВС', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'ДВС' },
  { id: 32, profileTypeId: 1, typeOfCoatingId: 2, name: 'Профлист С-20 0,45 мм, Матовый', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Матовый' },
  { id: 33, profileTypeId: 1, typeOfCoatingId: 2, name: 'Профлист С-20 0,45 мм, Матовый', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Матовый' },
  { id: 34, profileTypeId: 1, typeOfCoatingId: 2, name: 'Профлист С-20 0,45 мм, Матовый', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Матовый' },
  { id: 35, profileTypeId: 1, typeOfCoatingId: 2, name: 'Профлист С-20 0,45 мм, Матовый', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Матовый' },
  { id: 36, profileTypeId: 1, typeOfCoatingId: 2, name: 'Профлист С-20 0,45 мм, Матовый', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Матовый' },
  { id: 37, profileTypeId: 1, typeOfCoatingId: 2, name: 'Профлист С-20 0,45 мм, Матовый', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Матовый' },
  { id: 38, profileTypeId: 1, typeOfCoatingId: 2, name: 'Профлист С-20 0,45 мм, Матовый', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Матовый' },
  { id: 39, profileTypeId: 1, typeOfCoatingId: 2, name: 'Профлист С-20 0,45 мм, Матовый', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Матовый' },
  { id: 40, profileTypeId: 1, typeOfCoatingId: 2, name: 'Профлист С-20 0,45 мм, Матовый', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Матовый' },
  { id: 41, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 42, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 43, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 44, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 45, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 46, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 47, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 48, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 49, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 50, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 51, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 52, profileTypeId: 1, typeOfCoatingId: 3, name: 'Профлист С-20 0,45 мм, Printech', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech' },
  { id: 53, profileTypeId: 1, typeOfCoatingId: 4, name: 'Профлист С-20 0,45 мм, Printech ЛМЗ', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech ЛМЗ' },
  { id: 54, profileTypeId: 1, typeOfCoatingId: 6, name: 'Профлист С-20 0,45 мм, Printech ДВС', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'Printech ДВС' },
  { id: 55, profileTypeId: 1, typeOfCoatingId: 7, name: 'Профлист С-20 0,45 мм, ОЦ', material: 'Профлист С-20', thickness: '0.45', typeOfCoating: 'ОЦ' },
  { id: 56, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 57, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 58, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 59, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 60, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 61, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 62, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 63, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 64, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 65, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 66, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 67, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 68, profileTypeId: 1, typeOfCoatingId: 1, name: 'Профлист С-20 0,5 мм, Глянец', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Глянец' },
  { id: 69, profileTypeId: 1, typeOfCoatingId: 8, name: 'Профлист С-20 0,5 мм, Бархат матовый', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Бархат матовый' },
  { id: 70, profileTypeId: 1, typeOfCoatingId: 8, name: 'Профлист С-20 0,5 мм, Бархат матовый', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Бархат матовый' },
  { id: 71, profileTypeId: 1, typeOfCoatingId: 8, name: 'Профлист С-20 0,5 мм, Бархат матовый', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Бархат матовый' },
  { id: 72, profileTypeId: 1, typeOfCoatingId: 8, name: 'Профлист С-20 0,5 мм, Бархат матовый', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'Бархат матовый' },
  { id: 73, profileTypeId: 1, typeOfCoatingId: 7, name: 'Профлист С-20 0,5 мм, ОЦ', material: 'Профлист С-20', thickness: '0.5', typeOfCoating: 'ОЦ' },
]

const PROFNASTIL_FILTER: FilterOptions = {
  material: [...new Map(PROFNASTIL_ROWS.map(row => [row.profileTypeId, { id: String(row.profileTypeId), name: row.material }])).values()],
  thickness:     [...new Set(PROFNASTIL_ROWS.map(r => r.thickness))].sort().map(v => ({ id: String(v), name: String(v) })),
  typeOfCoating: [...new Map(PROFNASTIL_ROWS.map(row => [row.typeOfCoatingId, { id: String(row.typeOfCoatingId), name: row.typeOfCoating }])).values()],
}

// Объединённые данные для get-filter-data профнастила.
const FILTER_MAIN: FilterOptions = {
  ...PROFNASTIL_FILTER,
}

export async function mockGetProfnastilTable(filters: ProfnastilFilters, page = 1): Promise<Required<ProfnastilTableResponse>> {
  await delay(200)
  let rows = [...PROFNASTIL_ROWS]
  if (filters.materials.length) rows = rows.filter(r => filters.materials.includes(String(r.profileTypeId)))
  if (filters.typeOfCoating.length) rows = rows.filter(r => filters.typeOfCoating.includes(String(r.typeOfCoatingId)))
  const pageSize   = 100
  const totalCount = rows.length
  const pageCount  = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage   = Math.min(Math.max(1, page), pageCount)
  const slice      = rows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const table      = slice.map(r => ({
    ...r,
    priceM2:  r.priceM2 ?? 450,
    weightM2: r.weightM2 ?? 5.2,
  }))
  return { table, pagination: { page: safePage, pageSize, totalCount, pageCount } }
}

export async function mockGetProfnastilFilterOptions(): Promise<FilterOptions> {
  await delay(150)
  return PROFNASTIL_FILTER
}

export async function mockGetProfnastilColors(): Promise<{ colors: ProfnastilColorOption[] }> {
  await delay(150)
  return {
    colors: [
      { id: 1, name: 'RAL 1014', hex: '#D6C29C', image: null },
      { id: 2, name: 'RAL 8017', hex: '#44322D', image: null },
      { id: 3, name: 'Printech Дерево', hex: null, image: '/uploads/colors/printech-wood.webp' },
    ],
  }
}

// ─── Моки столбы / перемычка ─────────────────────────────────────────────────

const MOCK_ASSORTMENT_STOLB: Omit<PipeOption, 'disabled'>[] = [
  { id: 7,  name: '60/60/2', profile: { sizeA: 60, sizeB: 60 }, profileProblem: null },
  { id: 8,  name: '60/40/2', profile: { sizeA: 60, sizeB: 40 }, profileProblem: null },
  { id: 9,  name: '60/30/2', profile: { sizeA: 60, sizeB: 30 }, profileProblem: null },
  { id: 13, name: '60/40/4', profile: { sizeA: 60, sizeB: 40 }, profileProblem: null },
]

const MOCK_PEREMICHKA_POLOZHENIYE: import('./jumperProperties').JumperOption[] = [
  { id: 1733, name: 'Без перемычки', placement: 'none', hasJumper: false },
  { id: 2941, name: 'Перемычка над створкой', placement: 'above', hasJumper: true },
  { id: 4811, name: 'Перемычка за створкой', placement: 'behind', hasJumper: true },
]

const MOCK_ASSORTMENT_JUMPER: Omit<PipeOption, 'disabled'>[] = [
  { id: 8,  name: '20/20/2', profile: { sizeA: 20, sizeB: 20 }, profileProblem: null },
  { id: 9,  name: '25/25/2', profile: { sizeA: 25, sizeB: 25 }, profileProblem: null },
  { id: 10, name: '30/30/2', profile: { sizeA: 30, sizeB: 30 }, profileProblem: null },
  { id: 11, name: '40/20/2', profile: { sizeA: 40, sizeB: 20 }, profileProblem: null },
  { id: 12, name: '40/40/2', profile: { sizeA: 40, sizeB: 40 }, profileProblem: null },
  { id: 13, name: '50/25/2', profile: { sizeA: 50, sizeB: 25 }, profileProblem: null },
  { id: 14, name: '50/50/2', profile: { sizeA: 50, sizeB: 50 }, profileProblem: null },
]

export async function mockGetAssortmentStolb(): Promise<{ assortmentPipe: Omit<PipeOption, 'disabled'>[] }> {
  await delay(100)
  return { assortmentPipe: MOCK_ASSORTMENT_STOLB }
}

export async function mockGetOpeningOptions(): Promise<OpeningOptionsResponse> {
  return { options: [
    { id: 1, name: 'Наружу / Правая', pathPhoto: '/img/wicket_opening_diagram_02.jpg', opensOutward: true, hingeSide: 'right' },
    { id: 920, name: 'Наружу / Левая', pathPhoto: '/img/wicket_opening_diagram_01.jpg', opensOutward: true, hingeSide: 'left' },
    { id: 1220, name: 'Внутрь / Левая', pathPhoto: '/img/wicket_opening_diagram_03.jpg', opensOutward: false, hingeSide: 'right' },
    { id: 1430, name: 'Внутрь / Правая', pathPhoto: '/img/wicket_opening_diagram_04.jpg', opensOutward: false, hingeSide: 'left' },
  ], problems: [] }
}

export async function mockGetPolozhenieJumper(openingOptionId: number): Promise<import('./jumperProperties').JumperOptionsResponse> {
  await delay(100)
  const opening = (await mockGetOpeningOptions()).options.find(option => option.id === openingOptionId)
  if (!opening) throw new Error('Выбранный вариант открытия недоступен.')
  return { availablePolozheniyeJumper: MOCK_PEREMICHKA_POLOZHENIYE
    .filter(option => opening.opensOutward || option.placement !== 'behind')
    .map(option => ({ ...option })) }
}

export async function mockGetAssortmentJumper(): Promise<{ assortmentJumper: Omit<PipeOption, 'disabled'>[] }> {
  await delay(100)
  return { assortmentJumper: MOCK_ASSORTMENT_JUMPER }
}

// ─── Моки цвет щита ──────────────────────────────────────────────────────────

const MOCK_COLOR_SHIELD: ColorShieldItem[] = [
  { id: 1,  name: 'RAL 7024 (Графитовый серый)', isStandard: 1, paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 125.5, hex: '#474A51' },
  { id: 2,  name: 'RAL 8017 (Шоколадно-коричневый)', isStandard: 1, paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 125.5, hex: '#4E3629' },
  { id: 3,  name: 'RAL 9003 (Сигнальный белый)', isStandard: 1, paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 125.5, hex: '#F4F4F4' },
  { id: 4,  name: 'RAL 3005 (Винно-красный)', isStandard: 1, paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 125.5, hex: '#5B1F2A' },
  { id: 5,  name: 'RAL 6020 (Хромовый зелёный)', isStandard: 1, paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 125.5, hex: '#3E4F3D' },
  { id: 6,  name: 'RAL 1014 (Слоновая кость)', isStandard: 1, paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 125.5, hex: '#E8DBC4' },
  { id: 7,  name: 'RAL 7004 (Сигнальный серый)', isStandard: 1, paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 125.5, hex: '#9EA2A5' },
  { id: 101, name: 'RAL 9001 (Кремово-белый)', isStandard: 0, paintTypeId: 2, paintTypeName: 'Молотковая', consumptionRate: 150, hex: '#F3ECE0' },
  { id: 102, name: 'RAL 5010 (Горечавково-синий)', isStandard: 0, paintTypeId: 2, paintTypeName: 'Молотковая', consumptionRate: 150, hex: '#1B3F6E' },
]

export async function mockGetColorShield(): Promise<{ colorShield: ColorShieldItem[]; paintCategories: PaintCategory[] }> {
  await delay(100)
  return {
    colorShield: MOCK_COLOR_SHIELD.map(item => ({ ...item, paintCategoryId: item.isStandard === 0 ? 102 : 101 })),
    paintCategories: [
      { id: 101, name: 'Стандартная', isFixedColor: true, isCustomerSupplied: false, requiresPaintType: true, allowsAnyPrimer: false, quantityCalculationMode: 'consumption', costCoefficient: 1 },
      { id: 102, name: 'Не стандартная', isFixedColor: true, isCustomerSupplied: false, requiresPaintType: true, allowsAnyPrimer: false, quantityCalculationMode: 'ceilKg', costCoefficient: 1.1 },
    ],
  }
}

// ─── Мок ширины сетки ────────────────────────────────────────────────────────

const MOCK_NET_WIDTHS = [
  { id: '50', name: '50 мм' },
  { id: '75', name: '75 мм' },
  { id: '100', name: '100 мм' },
]

export async function mockGetNetWidths(): Promise<{ netWidths: { id: string; name: string }[] }> {
  await delay(100)
  return { netWidths: MOCK_NET_WIDTHS }
}

export async function mockGetNetsByWidth(_sizeA: number | string): Promise<{
  items: Array<{ id: number; model: string; imageUrl: string | null; sizeA: number; sizeB: number; thickness: number; price: number }>
}> {
  void _sizeA
  await delay(100)
  return {
    items: [
      { id: 1, model: 'Сетка 50x50 2мм', imageUrl: null, sizeA: 50, sizeB: 50, thickness: 2, price: 350 },
      { id: 2, model: 'Сетка 50x75 2мм', imageUrl: null, sizeA: 50, sizeB: 75, thickness: 2, price: 380 },
    ],
  }
}

// ─── Мок замков ─────────────────────────────────────────────────────────────────

export async function mockGetLocks(): Promise<{
  items: Array<{
    id: number
    marking: string
    imageUrls: string[]
    components: Array<{ id: number; name: string; imageUrls: string[] }>
  }>
}> {
  await delay(100)
  return {
    items: [
      {
        id: 1,
        marking: 'STUBLINA 1032',
        imageUrls: [],
        components: [],
      },
      {
        id: 2,
        marking: 'STUBLINA 1028',
        imageUrls: [],
        components: [],
      },
    ],
  }
}

export async function mockGetPensByLock(_lockSetId: number): Promise<{
  items: Array<{ id: number; marking: string; colors: { id: number; name: string }[]; imageUrls?: string[] }>
}> {
  void _lockSetId
  await delay(80)
  const colors = [
    { id: 1, name: 'Черная' },
    { id: 2, name: 'Коричневая' },
    { id: 3, name: 'Белая' },
  ]
  return {
    items: [
      { id: 1, marking: 'Ручка STUBLINA 1032', colors, imageUrls: [] },
      { id: 2, marking: 'Ручка STUBLINA 1028', colors, imageUrls: [] },
    ],
  }
}

export async function mockGetAdditionalPens(): Promise<{
  items: Array<{ id: number; marking: string; canUseFrameColor: boolean; colors: { id: number; name: string }[]; imageUrls?: string[] }>
}> {
  await delay(80)
  return {
    items: [
      {
        id: 1,
        marking: 'Скоба СК-101',
        canUseFrameColor: true,
        colors: [{ id: 1, name: 'Черная' }, { id: 2, name: 'Коричневая' }, { id: 3, name: 'Белая' }],
        imageUrls: [],
      },
      {
        id: 2,
        marking: 'Скоба СК-102',
        canUseFrameColor: false,
        colors: [{ id: 1, name: 'Черная' }, { id: 2, name: 'Коричневая' }],
        imageUrls: [],
      },
    ],
  }
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

export async function mockFinalCalculate(): Promise<{ priceDealer: string; priceRetail: string }> {
  await delay(400)
  return { priceDealer: '15 000', priceRetail: '22 500' }
}

export async function mockFetchSavedOrderPrice(): Promise<{
  hasSavedPrice: boolean
  isActual: boolean
  priceRetail?: string
  priceDealer?: string
  lastCalculatedAt?: number
}> {
  await delay(150)
  return {
    hasSavedPrice: true,
    isActual: true,
    priceRetail: '22500.00',
    priceDealer: '15000.00',
    lastCalculatedAt: Math.floor(Date.now() / 1000) - 3600,
  }
}

export async function mockDeleteCalculation(): Promise<void> {
  await delay(200)
}

// ─── Прочие моки ─────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function mockFetchWicketPage(_modelId: number | string, _url: string): Promise<string> {
  void _modelId
  void _url
  return ''
}

export async function mockSaveWicketData(_payload: Record<string, unknown>): Promise<WicketRootMutationResponse> {
  void _payload
  return { lockVersion: 1 }
}

export async function mockCreateOrder(): Promise<{
  orderId: number
  companyId: number | null
  managerId: number
}> {
  await delay(100)
  return {
    orderId: 42,
    companyId: 5,
    managerId: 12,
  }
}

export async function mockLoadWicketData(
  _orderId: number,
): Promise<Record<string, unknown>> {
  void _orderId
  await delay(200)
  return {
    orderId: 42,
    modelId: '1',
    providesMaterial: 'Предоставляет изготовитель',
    providesPaint: 'Предоставляет изготовитель',
    providesPrimer: 'Предоставляет изготовитель',
    doesPaintingFrame: 'Выполняет изготовитель',
    doesAssembly: 'Выполняет изготовитель',
    fillSide: 'Одна сторона',
    materialFacadeGlob: 'Сайдинг',
    materialYardGlob: null,
    nalichieStolbovName: 'Со столбами',
    hasStolby: 1,
    stolbId: 7,
    stolbName: '60/60/2',
    postProfile: { sizeA: 60, sizeB: 60 },
    postProfileProblem: null,
    jumperProfile: null,
    jumperProfileProblem: null,
    openingOptionId: 1,
    openingOptionName: 'Наружу / Правая',
    openingOrientation: { opensOutward: true, hingeSide: 'right' },
    openingOrientationProblem: null,
    peremichkaPolozheniyeId: 1733,
    peremichkaPolozheniyeName: 'Без перемычки',
    jumperPlacement: 'none',
    jumperPlacementProblem: null,
    postsPresenceProblem: null,
    assortmentJumperId: null,
    peremichkaSortamentName: null,
    isTherePen: 0,
    isTherePenName: 'Не будет',
    isThereLock: 1,
    isThereLockName: 'Есть',
    providesLock: 'Предоставляет изготовитель',
    lockInstaller: 'Выполняет изготовитель',
    typeLock: 'Тип_1',
    widthProyema: '1000',
    heightProyema: '2000',
    clearanceProyema: '20',
    sostoyaniyeProyema: 'Готов',
    raspolozheniyePolotna: 'Вертикально',
    shieldType: 'Тип_1',
    colorShieldId: 1,
    heightTopPart: '0',
    heightLowerPart: '0',
    widthSidePart: '0',
    netWidthProviderTop: 'executor',
    netWidthProviderLower: 'executor',
    netWidthProviderSide: 'executor',
    grilleLocation: 'Возле петель',
    idFacade: 5,
    materialSupplierFacade: 'Кровельный центр',
    materialFacade: 'Сайдинг «Бревно»',
    formFacade: 'Гладкая',
    thicknessFacade: '',
    typeOfCoatingFacade: 'Глянец',
    colorFacade: 'RAL 7004',
    colorFacadeHex: '#704214',
    colorFacadeImage: '',
    colorFacadeReverseHex: '',
    colorFacadeReverseImage: '',
    idYard: '',
    materialSupplierYard: '',
    materialYard: '',
    formYard: '',
    thicknessYard: '',
    typeOfCoatingYard: '',
    colorYard: '',
    colorYardHex: '',
    colorYardImage: '',
    priceRetail: '13500',
    priceDealer: '10000',
    reachedStep: 'page12',
    visitedPages: '["page1","page2","page3","page5","page6","page7","page9","page10","page11","page12"]',
    activePage: 'page12',
  }
}

export async function mockRecalculate(
  _payload: {
    orderId: number
    modelId: string | number
    productType?: string
    model?: string
  }
): Promise<RecalculateResponse> {
  void _payload
  return {
    priceDealer: 10000,
    priceRetail: 13500,
  }
}
