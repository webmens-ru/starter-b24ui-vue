<script setup lang="ts">
import type { SelectItem } from "@bitrix24/b24ui-nuxt";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import * as yup from "yup";
import { setLocale } from "yup";
import {
  currencyList,
  type Currency,
  type Good,
  type Contractor,
  fetchGoods,
  fetchContractors,
  fetchGoodById,
} from "../app/api/goods";
import { fetchDealCacheById, type DealCache } from "../app/api/deal";
import api from "../app/api";
import goodsStubJson from "../data/goodsStub.json";
import discountTypeDirectoryJson from "../data/discountTypeDirectory.json";
import markupTypeDirectoryJson from "../data/markupTypeDirectory.json";
import currencyDirectoryJson from "../data/currencyDirectory.json";
import areaDirectoryJson from "../data/areaDirectory.json";
import timeStartServiceDirectoryJson from "../data/ufCrm19TimeStartService.json";
import timeFinishServiceDirectoryJson from "../data/ufCrm19TimeFinishService.json";

const widgetParams = typeof window !== "undefined" ? (window as any)._PARAMS_ : undefined;
const placementParams = widgetParams?.placementOptions?.params ?? {};
const dealTypeBuildingId = placementParams.dealTypeBuildingId ?? 1;
const productTypeId = placementParams.productTypeId;
// id должен приходить явно, id слайдера использовать нельзя — иначе грузится чужая запись
const initialId = placementParams.id;
const dealId = placementParams.dealId;
let dealArea = Number(placementParams.dealArea ?? placementParams.area ?? 0) || 0;
const areasObj = placementParams.areas && !Array.isArray(placementParams.areas) ? placementParams.areas : {};
const dealAreasArray = Array.isArray(placementParams.areas) ? placementParams.areas : [];
const dealAreaById: Record<number, number> = {};
for (const a of dealAreasArray) {
  const id = Number((a as any)?.id);
  const value = Number((a as any)?.value);
  if (!Number.isNaN(id) && !Number.isNaN(value)) {
    dealAreaById[id] = value;
  }
}
// Поддержка альтернативного формата: значения площадей по ключам из справочника
for (const item of areaDirectoryJson as any[]) {
  const id = Number((item as any)?.id);
  const key = (item as any)?.key;
  if (!id || !key) continue;
  const raw = (placementParams as any)[key] ?? (areasObj as any)?.[key];
  const val = Number(raw);
  if (!Number.isNaN(val)) {
    dealAreaById[id] = val;
  }
}

type DirectoryItem = { id: number; title: string };
type AreaDirectoryItem = { id: number; title: string; key?: string; editable?: boolean };

const goodsStub = goodsStubJson as Good[];
const discountTypeDirectory = discountTypeDirectoryJson as DirectoryItem[];
const markupTypeDirectory = markupTypeDirectoryJson as DirectoryItem[];
const currencyDirectory = currencyDirectoryJson as DirectoryItem[];
const areaDirectory = areaDirectoryJson as AreaDirectoryItem[];
const areaKeyToId: Record<string, number> = Object.fromEntries(
  areaDirectory.map((item) => [item.key, item.id] as const).filter(([key]) => Boolean(key)),
);
const areaEditableById: Record<number, boolean> = Object.fromEntries(
  areaDirectory.map((item) => [item.id, Boolean(item.editable)] as const),
);
const timeStartServiceDirectory = timeStartServiceDirectoryJson as { ID: string; VALUE: string }[];
const timeFinishServiceDirectory = timeFinishServiceDirectoryJson as {
  ID: string;
  VALUE: string;
}[];
const currencyCodeToTitle: Record<string, string> = {
  руб: "Рубль",
  usd: "Доллар США",
  eur: "Евро",
  cny: "Юань",
  try: "Турецкая лира",
};
const currencyTitleToCode: Record<string, string> = Object.fromEntries(
  Object.entries(currencyCodeToTitle).map(([code, title]) => [title, code]),
);
const currencyCodeToId: Record<string, number> = Object.fromEntries(
  currencyDirectory
    .map((item) => {
      const code = currencyTitleToCode[item.title] ?? item.title;
      return [code, item.id] as const;
    })
    .filter(([code]) => Boolean(code)),
);
const currencyIdToCode: Record<number, string> = Object.fromEntries(
  currencyDirectory
    .map((item) => {
      const code = currencyTitleToCode[item.title] ?? item.title;
      return [item.id, code] as const;
    })
    .filter(([, code]) => Boolean(code)),
);
const timeStartIdByValue: Record<string, string> = Object.fromEntries(
  timeStartServiceDirectory.map((item) => [item.VALUE, item.ID]),
);
const timeFinishIdByValue: Record<string, string> = Object.fromEntries(
  timeFinishServiceDirectory.map((item) => [item.VALUE, item.ID]),
);
const timeStartValueById: Record<string, string> = Object.fromEntries(
  timeStartServiceDirectory.map((item) => [item.ID, item.VALUE]),
);
const timeFinishValueById: Record<string, string> = Object.fromEntries(
  timeFinishServiceDirectory.map((item) => [item.ID, item.VALUE]),
);

const dealCurrency: Currency | string = "руб"; // валюта сделки (пример)
const discountTypes = discountTypeDirectory.map((i) => i.title);
const markupTypes = markupTypeDirectory.map((i) => i.title);

// Получаем список товаров с бэка с резервной заглушкой
// goodsFromApi = null означает, что запрос ещё не завершился, поэтому не показываем заглушку
const goodsFromApi = ref<Good[] | null>(null);
const contractorsFromApi = ref<Contractor[] | null>(null);
const dealCacheFromApi = ref<DealCache | null>(null);
const detailLoading = ref(Boolean(initialId));
const detailHydrating = ref(false);
const hasDetailCost = ref(false);
const hasDetailTitle = ref(false);
const hasDetailUnitPrice = ref(false);
const customUnitPriceManuallyEdited = ref(false);
const submitLoading = ref(false);
const hasFitWindowCalled = ref(false);
const costUpdateGuard = ref(false);
const discountUpdateGuard = ref(false);
const productSearch = ref("");
const currentId = ref<number | string | undefined>(initialId);
const isEdit = computed(() => Boolean(currentId.value));
onMounted(async () => {
  goodsFromApi.value = await fetchGoods({
    dealTypeBuildingId,
    productTypeId,
  });
  contractorsFromApi.value = await fetchContractors();

  if (dealId) {
    const dealCache = await fetchDealCacheById(dealId);
    if (dealCache) {
      applyDealCache(dealCache);
    }
  }

  if (isEdit.value) {
    await loadDetail();
  }
});

function fitWindowOnce() {
  if (typeof window === "undefined" || !import.meta.env.PROD) return;
  if (hasFitWindowCalled.value) return;
  const bx24 = (window as any).BX24;
  if (bx24?.fitWindow) {
    hasFitWindowCalled.value = true;
    bx24.fitWindow();
  }
}

watch(detailLoading, async (loading, prevLoading) => {
  if (prevLoading && !loading) {
    await nextTick();
    fitWindowOnce();
  }
});

setLocale({
  mixed: {
    required: "Обязательное поле",
    default: "Неверное значение",
  },
  number: {
    min: "Минимум ${min}",
    max: "Максимум ${max}",
    integer: "Введите целое число",
    positive: "Введите положительное число",
  },
  string: {
    email: "Введите корректный email",
  },
});

const state = reactive({
  product: undefined as number | undefined, // id товара
  customProductTitle: "",
  customUnitPrice: 0,
  quantity: 1,
  unit: "", // единица измерения
  totalQuantity: 0,
  baseUnitPrice: "",
  finalUnitPrice: "",
  hoursCount: 0,
  daysCount: 1,
  discountValue: 0,
  discountValueOne: 0,
  discountType: "%",
  discountTypeAllOne: "all" as "all" | "one",
  markupValue: 0,
  markupType: "%",
  finalPrice: 0,
  currency: "руб" as Currency, // храним код валюты
  costPerUnit: "",
  totalCost: "",
  costCurrency: "Рубль",
  costSource: "unit" as "unit" | "total",
  invoiceIssued: false,
  contractor: undefined as number | undefined,
  comment: "",
  autoRecalc: true,
  areaTypeId: undefined as number | undefined,
  areaValue: "",
  serviceDates: [] as string[], // для посуточных
  serviceDate: "" as string, // для почасовых
  serviceTimeFrom: "" as string,
  serviceTimeTo: "" as string,
  approvedTo: false,
  approvedOm: false,
});

function toFiniteNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return value;
    }
  }
  return value;
}

function extractAreasMap(rawAreas: unknown): Record<number, number> {
  const result: Record<number, number> = {};
  const parsed = tryParseJson(rawAreas);

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const id = toFiniteNumber(
        (item as any)?.id ?? (item as any)?.ID ?? (item as any)?.areaId ?? (item as any)?.typeId,
      );
      const value = toFiniteNumber(
        (item as any)?.value ?? (item as any)?.VALUE ?? (item as any)?.area ?? (item as any)?.square,
      );
      if (id !== null && id > 0 && value !== null) {
        result[id] = value;
      }
    }
    return result;
  }

  if (parsed && typeof parsed === "object") {
    for (const [key, valueRaw] of Object.entries(parsed as Record<string, unknown>)) {
      const idFromKey = toFiniteNumber(key) ?? (key in areaKeyToId ? areaKeyToId[key] : null);
      const value = toFiniteNumber(valueRaw);
      if (idFromKey !== null && idFromKey > 0 && value !== null) {
        result[idFromKey] = value;
      }
    }
  }

  return result;
}

function extractDealAreaValue(payload: Record<string, unknown>): number | null {
  const value = toFiniteNumber(
    (payload as any)?.dealArea ??
      (payload as any)?.area ??
      (payload as any)?.totalArea ??
      (payload as any)?.areaTotal ??
      (payload as any)?.areaValue ??
      (payload as any)?.square ??
      (payload as any)?.squareTotal,
  );
  return value !== null ? value : null;
}

function applyDealCache(cache: DealCache) {
  dealCacheFromApi.value = cache;

  const payload = ((cache as any)?.result ?? cache) as Record<string, unknown>;
  const ufFieldToAreaKey: Record<string, string> = {
    UF_CRM_DEAL_SQUARE_ONE_FLOOR: "areaFirstFloor",
    UF_CRM_DEAL_FLOOR_COVERING: "areaCover",
    UF_CRM_1736772862: "areaOnMap",
    UF_CRM_1565948603: "areaSecondFloor",
    UF_CRM_1565948577: "areaContract",
  };
  const rawAreas =
    (payload as any)?.areas ??
    (payload as any)?.areaValues ??
    (payload as any)?.areasById ??
    (payload as any)?.areaById;
  const areasMap = extractAreasMap(rawAreas);

  for (const [field, areaKey] of Object.entries(ufFieldToAreaKey)) {
    const areaId = areaKeyToId[areaKey];
    if (!areaId) continue;
    const value = toFiniteNumber((payload as any)?.[field]);
    if (value !== null) {
      dealAreaById[areaId] = value;
    }
  }

  for (const [id, value] of Object.entries(areasMap)) {
    const idNumber = Number(id);
    if (Number.isFinite(idNumber) && idNumber > 0) {
      dealAreaById[idNumber] = value;
    }
  }

  const dealAreaValue = extractDealAreaValue(payload);
  if (dealAreaValue !== null) {
    dealArea = dealAreaValue;
  }

  if (!isEdit.value && state.areaTypeId) {
    const val = dealAreaById[Number(state.areaTypeId)];
    if (Number.isFinite(val)) {
      state.areaValue = String(val);
    }
  }
}

type ProductItem = {
  value: string;
  label: string;
  unit: string;
  contractor: string;
  price: number;
  currency: Currency;
};

const allGoods = computed<Good[]>(() => {
  if (goodsFromApi.value === null) return []; // ждём ответ
  return goodsFromApi.value.length ? goodsFromApi.value : goodsStub;
});
const contractorsFromProducts = computed<Contractor[]>(() => {
  const map = new Map<number, string>();
  for (const g of allGoods.value) {
    const id = Number(g.contractor?.id);
    const title = g.contractor?.title ?? "";
    if (id > 0 && title && !map.has(id)) {
      map.set(id, title);
    }
  }
  return Array.from(map, ([id, title]) => ({ id, title }));
});
const contractorOptions = computed<SelectItem[]>(() => {
  const list =
    contractorsFromApi.value && contractorsFromApi.value.length
      ? contractorsFromApi.value
      : contractorsFromProducts.value;
  return list.map((item) => ({ value: item.id, label: item.title }));
});

const filteredGoods = computed<Good[]>(() => {
  const list = allGoods.value;
  const query = productSearch.value.trim().toLowerCase();
  if (!query) return list;

  return list.filter((g) => {
    const haystack = [g.title, g.unit?.title, g.contractor?.title];
    return haystack.some((v) => (v ?? "").toString().toLowerCase().includes(query));
  });
});
const productItems = computed<SelectItem[]>(() => {
  const goods = [...filteredGoods.value];
  const current =
    state.product !== undefined ? allGoods.value.find((g) => Number(g.id) === Number(state.product)) : undefined;

  // обеспечиваем наличие выбранного товара в списке даже при активном поиске
  if (current && !goods.some((g) => Number(g.id) === Number(current.id))) {
    goods.unshift(current);
  }

  // храним id товара числом, чтобы выборка по v-model работала сразу после загрузки деталей
  return goods.map((g: Good) => ({
    value: g.id,
    label: g.title,
    unit: g.unit?.title ?? "",
    contractor: g.contractor?.title ?? "",
    price: state.currency === "руб" ? g.price_rub : state.currency === "usd" ? g.price_usd : g.price_eur,
    currency: state.currency,
  }));
});
const selectedProduct = computed<Good | undefined>(() =>
  allGoods.value.find((g: Good) => Number(g.id) === Number(state.product ?? NaN)),
);
const isCustomPriceEnabled = computed(() => Boolean(selectedProduct.value?.allowPriceEdit));
const isCustomTitleEnabled = computed(() => Boolean(selectedProduct.value?.allowTitleEdit));
const requiresToApproval = computed(() => Boolean(selectedProduct.value?.requiresToApproval));
const requiresOmApproval = computed(() => Boolean(selectedProduct.value?.requiresOmApproval));
const canEditApprovedTo = computed(() => resolveApprovalFlag(placementParams.isExtendedPrivilegesTo) ?? false);
const canEditApprovedOm = computed(() => resolveApprovalFlag(placementParams.isExtendedPrivilegesOm) ?? false);
const canEditApprovedOp = computed(() => resolveApprovalFlag(placementParams.isExtendedPrivilegesOp) ?? false);

const CATEGORY_TO = 149;
const CATEGORY_OP = 165;
const CATEGORY_OM = 167;

const showCostBlock = computed(() => {
  const product = selectedProduct.value;
  if (!product?.categoryId) return true;
  const cat = Number(product.categoryId);
  if (cat === CATEGORY_TO) return canEditApprovedTo.value;
  if (cat === CATEGORY_OP) return canEditApprovedOp.value;
  if (cat === CATEGORY_OM) return canEditApprovedOm.value;
  return true;
});
const schema = yup.object({
  product: yup.number().nullable().default(undefined).required("Выберите товар"),
  customProductTitle: yup
    .string()
    .default("")
    .test("stub-title", "Введите название", (val) => !isCustomTitleEnabled.value || Boolean(val?.trim())),
  customUnitPrice: yup
    .number()
    .default(0)
    .test("stub-price", "Укажите цену", (val) => !isCustomPriceEnabled.value || Number(val) > 0),
  quantity: yup
    .number()
    .required("Укажите количество")
    .min(1)
    .test(
      "quantity-integer-by-unit",
      "Для этой единицы измерения можно вводить только целое число",
      (val) => val === undefined || val === null || isFractionalQuantityAllowed.value || Number.isInteger(val),
    ),
  discountValue: yup.number().required().default(0),
  discountValueOne: yup.number().required().default(0),
  discountType: yup.string().oneOf(discountTypes).required(),
  markupValue: yup.number().required().default(0),
  markupType: yup.string().oneOf(markupTypes).required(),
  autoRecalc: yup.boolean().default(true),
  serviceDates: yup.array().of(yup.string()).default([]),
  // остальные поля — не редактируемые или вычисляются автоматически
});

type Schema = yup.InferType<typeof schema>;
type FormSubmitEvent<T> = SubmitEvent & { data: T };
const isCurrencyMismatch = computed(() => state.currency !== dealCurrency);
const isFinalOverCost = computed(() => {
  if (state.currency !== "руб") return false;
  const final = Number(state.finalPrice) || 0;
  const cost = Number(state.totalCost) || 0;
  return cost > 0 && final < cost;
});
const isDailyService = computed(() => {
  const period = selectedProduct.value?.servicePeriod;
  return period?.id === 3 || period?.title === "Посуточно";
});
const isHourlyService = computed(() => {
  const period = selectedProduct.value?.servicePeriod;
  return period?.id === 5 || period?.title === "Почасовая";
});
const isScheduledService = computed(() => {
  const period = selectedProduct.value?.servicePeriod;
  return period?.id === 7 || period?.title === "Согласно расписанию";
});
const isTimeService = computed(() => isHourlyService.value || isScheduledService.value);
const showTotalQuantity = computed(
  () => selectedProduct.value?.quantityFactorArea || isDailyService.value || isHourlyService.value,
);
const isFractionalQuantityAllowed = computed(() => {
  const unitId = Number(selectedProduct.value?.unit?.id);
  return unitId === 3 || unitId === 5;
});
const hasCustomDayCount = computed(() => selectedProduct.value?.id === 1);
const isDaysFieldReadOnly = computed(() => isDailyService.value);
const areaTypeOptions = computed<SelectItem[]>(() => areaDirectory.map((a) => ({ value: a.id, label: a.title })));
const filteredAreaTypeOptions = computed<SelectItem[]>(() => {
  return areaTypeOptions.value.filter((opt) => {
    const id = Number((opt as any).value);
    if (areaEditableById[id]) return true;
    const val = dealAreaById[id];
    return Number.isFinite(val) && Number(val) > 0;
  });
});
const enabledAreaTypeOptions = computed<SelectItem[]>(() => {
  const allowed = selectedProduct.value?.enableArea;
  if (!allowed || !allowed.length) return filteredAreaTypeOptions.value;
  const allowedSet = new Set(allowed.map(Number));
  return filteredAreaTypeOptions.value.filter((opt) => allowedSet.has(Number((opt as any).value)));
});
const selectedAreaType = computed(() => areaDirectory.find((a) => Number(a.id) === Number(state.areaTypeId)));
const selectedAreaEditable = computed(() => Boolean(selectedAreaType.value?.editable));
function getProductPriceByCurrency(product: Good | undefined, currency: Currency): number {
  if (!product) return 0;
  if (currency === "руб") return Number(product.price_rub) || 0;
  if (currency === "usd") return Number(product.price_usd) || 0;
  return Number(product.price_eur) || 0;
}

function syncCustomUnitPriceWithCurrency() {
  if (!isCustomPriceEnabled.value) return;
  if (customUnitPriceManuallyEdited.value) return;
  if (hasDetailUnitPrice.value) return;
  state.customUnitPrice = getProductPriceByCurrency(selectedProduct.value, state.currency);
}

function normalizeDateString(val: any): string {
  if (!val) return "";
  if (typeof val === "string") {
    // берём только YYYY-MM-DD, или парсим ISO с TZ
    if (val.length >= 10) return val.slice(0, 10);
    return val;
  }
  if (typeof val.toString === "function") {
    const asString = val.toString();
    if (asString.length >= 10) return asString.slice(0, 10);
  }
  try {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch (e) {
    // ignore
  }
  return "";
}

function normalizeTimeString(val: any): string {
  if (!val) return "";
  const raw = typeof val === "string" ? val.trim() : String(val);
  const [hRaw, mRaw] = raw.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  if (h < 0 || h > 24 || m < 0 || m > 59) return "";
  if (h === 24 && m !== 0) return "";
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function resolveApprovalFlag(val: unknown): boolean | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const normalized = val.trim().toLowerCase();
    if (["1", "true", "yes", "y", "да"].includes(normalized)) return true;
    if (["0", "false", "no", "n", "нет"].includes(normalized)) return false;
  }
  return Boolean(val);
}

function applyAutoApprovalForCreate() {
  if (isEdit.value) return;
  if (requiresToApproval.value && canEditApprovedTo.value) {
    state.approvedTo = true;
  }
  if (requiresOmApproval.value && canEditApprovedOm.value) {
    state.approvedOm = true;
  }
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const total = h * 60 + m + minutesToAdd;
  if (total < 0 || total > 24 * 60) return "";
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

const allowedServiceDates = computed<string[]>(() =>
  (selectedProduct.value?.enableDates ?? []).map((d) => normalizeDateString(d)).filter(Boolean),
);

const serviceDateOptions = computed<SelectItem[]>(() =>
  allowedServiceDates.value.map((d) => ({
    value: d,
    label: formatDateDisplay(d),
  })),
);

const costPerUnitLabel = computed(() => (state.costSource === "unit" ? "✔ Себестоимость ед." : "Себестоимость ед."));
const totalCostLabel = computed(() => (state.costSource === "total" ? "✔ Себестоимость" : "Себестоимость"));
const discountValueOneLabel = computed(
  () => (state.discountTypeAllOne === "one" ? "✔ Скидка ед." : "Скидка ед."),
);
const discountValueLabel = computed(
  () => (state.discountTypeAllOne === "all" ? "✔ Скидка" : "Скидка"),
);

const allowedServiceStartTimes = computed<string[]>(() =>
  (selectedProduct.value?.serviceStartTimes ?? []).map((t) => normalizeTimeString(t)).filter(Boolean),
);
const minServiceDurationMinutes = computed(() => {
  const val = Number(selectedProduct.value?.minServiceDurationMinutes);
  return Number.isFinite(val) && val > 0 ? val : 0;
});
const serviceDurationMinutes = computed(() => {
  const val = Number(selectedProduct.value?.serviceDurationMinutes);
  return Number.isFinite(val) && val > 0 ? val : 0;
});

const timeOptions = computed<SelectItem[]>(() => {
  const opts: SelectItem[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      const label = `${hh}:${mm}`;
      opts.push({ value: label, label });
    }
  }
  return opts;
});

const timeOptionsStart = computed<SelectItem[]>(() => {
  if (!isTimeService.value) return timeOptions.value;
  const list = allowedServiceStartTimes.value;
  if (!list.length) return timeOptions.value;
  return list.map((t) => ({ value: t, label: t }));
});

const timeOptionsEnd = computed<SelectItem[]>(() => {
  const base = [...timeOptions.value, { value: "24:00", label: "24:00" }];
  if (!state.serviceTimeFrom) return base;
  const [fh, fm] = state.serviceTimeFrom.split(":").map(Number);
  if (Number.isNaN(fh) || Number.isNaN(fm)) return base;
  if (serviceDurationMinutes.value > 0) {
    const end = addMinutesToTime(state.serviceTimeFrom, serviceDurationMinutes.value);
    return end ? base.filter((opt) => (opt as any).value === end) : [];
  }
  const minDuration = minServiceDurationMinutes.value || 1;
  const minMinutes = fh * 60 + fm + minDuration;
  return base.filter((opt) => {
    const val = (opt as any).value ?? opt;
    const [h, m] = String(val).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;
    const minutes = h * 60 + m;
    return minutes > minMinutes - 1;
  });
});

function formatDateDisplay(val: string): string {
  const norm = normalizeDateString(val);
  if (!norm || norm.length < 10) return val ?? "";
  const [y, m, d] = norm.split("-");
  return `${d}.${m}.${y}`;
}

const currencyOptions = computed<SelectItem[]>(() => {
  const baseCurrencies =
    currencyDirectory.length > 0
      ? currencyDirectory.map((c) => {
          const code = currencyTitleToCode[c.title] ?? c.title;
          return { value: code, label: c.title };
        })
      : currencyList.map((c) => ({ value: c, label: c }));

  const product = selectedProduct.value;
  if (!product) return baseCurrencies;

  const allowedCodes: string[] = [];
  if (product.price_rub > 0 && currencyCodeToTitle.руб) allowedCodes.push("руб");
  if (product.price_usd > 0 && currencyCodeToTitle.usd) allowedCodes.push("usd");
  if (product.price_eur > 0 && currencyCodeToTitle.eur) allowedCodes.push("eur");

  if (!allowedCodes.length) return baseCurrencies;

  const byCode = new Set(allowedCodes);
  return baseCurrencies.filter((c) => byCode.has((c as any).value as string));
});

watch(
  selectedProduct,
  () => {
    costUpdateGuard.value = true;
    // сбрасываем площадь и тип при смене товара, но не во время гидрации деталей
    if (!isEdit.value || !detailHydrating.value) {
      state.areaTypeId = undefined;
      state.areaValue = "";
    }
    // подтягиваем себестоимость из товара по умолчанию (если нет данных из деталей)
    if (!hasDetailCost.value) {
      state.costPerUnit = selectedProduct.value?.cost_per_unit?.toString() ?? "";
    }
    state.costCurrency = "Рубль";
    if (isCustomTitleEnabled.value) {
      if (!hasDetailTitle.value) {
        state.customProductTitle = selectedProduct.value?.title ?? "";
      }
    } else {
      state.customProductTitle = "";
    }
    if (isCustomPriceEnabled.value) {
      customUnitPriceManuallyEdited.value = false;
      if (!hasDetailUnitPrice.value) {
        syncCustomUnitPriceWithCurrency();
      }
    } else {
      customUnitPriceManuallyEdited.value = false;
      state.customUnitPrice = 0;
    }

    if (!isDailyService.value) {
      state.serviceDates = [];
    } else {
      // оставляем только разрешённые даты, если справочник задан
      const allowed = allowedServiceDates.value;
      if (allowed.length) {
        state.serviceDates = state.serviceDates.filter((d) => allowed.includes(d));
      }
    }
    if (!isTimeService.value) {
      state.serviceDate = "";
      state.serviceTimeFrom = "";
      state.serviceTimeTo = "";
    } else {
      const allowed = allowedServiceStartTimes.value;
      if (allowed.length && state.serviceTimeFrom && !allowed.includes(state.serviceTimeFrom)) {
        state.serviceTimeFrom = "";
        state.serviceTimeTo = "";
      }
      if (serviceDurationMinutes.value > 0 && state.serviceTimeFrom) {
        const end = addMinutesToTime(state.serviceTimeFrom, serviceDurationMinutes.value);
        state.serviceTimeTo = end || "";
      }
    }
    if (selectedProduct.value?.quantityFactorArea) {
      if (!isEdit.value || !detailHydrating.value) {
        const options = enabledAreaTypeOptions.value;
        const first = options[0];
        if (first) {
          state.areaTypeId = Number((first as any).value);
          const val = dealAreaById[state.areaTypeId];
          state.areaValue = Number.isFinite(val) ? String(val) : "";
        } else {
          state.areaTypeId = undefined;
          state.areaValue = "";
        }
      }
    }
    const options = currencyOptions.value ?? [];
    const first = options[0];
    if (options.length && first && !options.some((o: SelectItem) => (o as any).value === state.currency)) {
      state.currency = (first as any).value as Currency;
    }
    nextTick(() => {
      costUpdateGuard.value = false;
    });
  },
  { immediate: true },
);

watch(
  () => state.product,
  () => {
    productSearch.value = "";
    if (detailHydrating.value) {
      return;
    }
    if (!detailLoading.value) {
      hasDetailTitle.value = false;
      hasDetailUnitPrice.value = false;
    }
  },
);

watch(
  () => state.currency,
  () => {
    syncCustomUnitPriceWithCurrency();
  },
);

watch(
  () => state.quantity,
  (val) => {
    const value = val as unknown;
    // allow пустое значение пока пользователь печатает — нормализуем при blur
    if (typeof value === "string" && value.trim() === "") return;
    if (value === null || Number.isNaN(Number(value))) state.quantity = 1;
  },
);

watch(
  () => state.discountValue,
  (val) => {
    const value = val as unknown;
    if ((typeof value === "string" && value.trim() === "") || value === null || Number.isNaN(Number(value))) {
      state.discountValue = 0;
    }
  },
);

watch(
  () => state.discountValueOne,
  (val) => {
    const value = val as unknown;
    if ((typeof value === "string" && value.trim() === "") || value === null || Number.isNaN(Number(value))) {
      state.discountValueOne = 0;
    }
  },
);

watch(
  () => state.markupValue,
  (val) => {
    const value = val as unknown;
    if ((typeof value === "string" && value.trim() === "") || value === null || Number.isNaN(Number(value))) {
      state.markupValue = 0;
    }
  },
);

// Автопересчёт при изменении себестоимости
watch(
  () => state.costPerUnit,
  () => {
    if (costUpdateGuard.value) return;
    recalcPrices();
  },
);

watch(
  () => state.totalCost,
  () => {
    if (costUpdateGuard.value) return;
    recalcPrices();
  },
);

watch(
  [() => state.discountValue, () => state.discountValueOne, () => state.discountTypeAllOne],
  () => {
    if (discountUpdateGuard.value) return;
    recalcPrices();
  },
);

function onQuantityBlur() {
  const value = state.quantity as unknown;
  if (
    (typeof value === "string" && value.trim() === "") ||
    value === null ||
    Number.isNaN(Number(value)) ||
    Number(value) < 1
  ) {
    state.quantity = 1;
  }
}

function onCostPerUnitInput() {
  state.costSource = "unit";
  recalcPrices();
}

function getQuantityForDiscount(): number {
  const product = selectedProduct.value;
  if (!product) return Number(state.quantity) || 0;
  const quantityRaw = Number(state.quantity) || 0;
  const areaFactor = product.quantityFactorArea ? Number(state.areaValue || dealArea || 1) || 1 : 1;
  const daysFactor = hasCustomDayCount.value
    ? Number(state.daysCount) || 1
    : isDailyService.value
      ? state.daysCount || state.serviceDates.length || 0
      : 1;
  const hoursFactor = isHourlyService.value ? state.hoursCount || 0 : 1;
  return quantityRaw * areaFactor * daysFactor * hoursFactor;
}

function onDiscountValueOneInput() {
  state.discountTypeAllOne = "one";
  const qty = getQuantityForDiscount();
  discountUpdateGuard.value = true;
  if (state.discountType === "%") {
    state.discountValue = Number(state.discountValueOne) || 0;
  } else if (qty > 0) {
    const valOne = Number(state.discountValueOne) || 0;
    state.discountValue = Number((valOne * qty).toFixed(2));
  }
  discountUpdateGuard.value = false;
  recalcPrices();
}

function onDiscountValueInput() {
  state.discountTypeAllOne = "all";
  const qty = getQuantityForDiscount();
  discountUpdateGuard.value = true;
  if (state.discountType === "%") {
    state.discountValueOne = Number(state.discountValue) || 0;
  } else if (qty > 0 && Number.isFinite(Number(state.discountValue))) {
    const total = Number(state.discountValue) || 0;
    state.discountValueOne = Number((total / qty).toFixed(2));
  }
  discountUpdateGuard.value = false;
  recalcPrices();
}

function onCustomUnitPriceInput() {
  customUnitPriceManuallyEdited.value = true;
}

function onTotalCostInput() {
  state.costSource = "total";
  const total = Number(state.totalCost);
  const qty = showTotalQuantity.value
    ? state.totalQuantity || Number(state.quantity) || 0
    : Number(state.quantity) || 0;
  if (qty > 0 && Number.isFinite(total)) {
    costUpdateGuard.value = true;
    state.costPerUnit = Number((total / qty).toFixed(2)).toString();
    costUpdateGuard.value = false;
  }
  recalcPrices();
}

function recalcPrices() {
  costUpdateGuard.value = true;
  try {
    const product = selectedProduct.value;
    if (!product) {
      state.unit = "";
      state.finalPrice = 0;
      state.costPerUnit = "";
      state.totalCost = "";
      state.costSource = "unit";
      state.discountValue = 0;
      state.discountValueOne = 0;
      state.discountTypeAllOne = "all";
      state.contractor = undefined;
      return;
    }

    state.unit = product.unit?.title ?? "";
    const currency = state.currency;
    const basePrice = isCustomPriceEnabled.value
      ? Number(state.customUnitPrice) || 0
      : currency === "руб"
        ? product.price_rub
        : currency === "usd"
          ? product.price_usd
          : product.price_eur;
    state.baseUnitPrice = Number(basePrice || 0).toFixed(2);
    const costPerUnitRaw = Number(state.costPerUnit);

    const quantityRaw = Number(state.quantity) || 0;
    const areaFactor = product.quantityFactorArea ? Number(state.areaValue || dealArea || 1) || 1 : 1;
    const daysFactor = hasCustomDayCount.value
      ? Number(state.daysCount) || 1
      : isDailyService.value
        ? state.daysCount || state.serviceDates.length || 0
        : 1;
    const hoursFactor = isHourlyService.value ? state.hoursCount || 0 : 1;
    const quantity = quantityRaw * areaFactor * daysFactor * hoursFactor;
    const usePerUnit = state.discountTypeAllOne === "one";
    let discountVal = usePerUnit
      ? Number(state.discountValueOne) || 0
      : Number(state.discountValue) || 0;
    const markupVal = Number(state.markupValue) || 0;

    if (state.discountType === "%" && discountVal > 100) {
      discountVal = 100;
      discountUpdateGuard.value = true;
      if (usePerUnit) state.discountValueOne = 100;
      else state.discountValue = 100;
      discountUpdateGuard.value = false;
    }

    const baseTotal = basePrice * quantity;
    let discount: number;
    if (state.discountType === "%") {
      discount = (baseTotal * discountVal) / 100;
    } else {
      discount = usePerUnit ? discountVal * quantity : discountVal;
    }
    // Синхронизация полей скидки (как для себестоимости)
    if (quantity > 0 || state.discountType === "%") {
      discountUpdateGuard.value = true;
      if (state.discountTypeAllOne === "all") {
        if (state.discountType === "%") {
          state.discountValueOne = Number(state.discountValue) || 0;
        } else {
          const total = Number(state.discountValue) || 0;
          state.discountValueOne = Number((total / quantity).toFixed(2));
        }
      } else {
        if (state.discountType === "%") {
          state.discountValue = Number(state.discountValueOne) || 0;
        } else {
          const valOne = Number(state.discountValueOne) || 0;
          state.discountValue = Number((valOne * quantity).toFixed(2));
        }
      }
      discountUpdateGuard.value = false;
    }
    const markup = state.markupType === "%" ? (baseTotal * markupVal) / 100 : markupVal;
    const totalPrice = Math.max(baseTotal - discount + markup, 0);

    state.finalPrice = Number(totalPrice.toFixed(2));
    const quantityForCost = showTotalQuantity.value ? state.totalQuantity || quantity : quantity;

    if (state.costSource === "total") {
      const totalCostNum = Number(state.totalCost);
      if (quantityForCost > 0 && Number.isFinite(totalCostNum)) {
        const cpu = totalCostNum / quantityForCost;
        state.costPerUnit = Number(cpu.toFixed(2)).toString();
      }
    } else {
      if (Number.isFinite(costPerUnitRaw)) {
        state.totalCost = Number((costPerUnitRaw * quantityForCost).toFixed(2)).toString();
      } else {
        state.totalCost = "";
      }
    }

    if (showTotalQuantity.value) {
      state.totalQuantity = quantity;
    }

    const totalQty = quantity || quantityRaw || 0;
    state.finalUnitPrice = totalQty > 0 ? Number(totalPrice / totalQty).toFixed(2) : "";
  } finally {
    costUpdateGuard.value = false;
  }
}

function recalcHourlyQuantity() {
  if (!isHourlyService.value) return;
  const from = state.serviceTimeFrom;
  const to = state.serviceTimeTo;
  if (!from || !to) return;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  if (Number.isNaN(fh) || Number.isNaN(fm) || Number.isNaN(th) || Number.isNaN(tm)) return;
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  if (end <= start) {
    state.hoursCount = 0;
    return;
  }
  const diffMinutes = end - start;
  const hours = Math.ceil(diffMinutes / 60);
  state.hoursCount = hours;
}

watch(
  [
    selectedProduct,
    () => state.customUnitPrice,
    () => state.quantity,
    () => state.discountValue,
    () => state.discountType,
    () => state.markupValue,
    () => state.markupType,
    () => state.currency,
    () => state.serviceDates.length,
    () => state.serviceDate,
    () => state.serviceTimeFrom,
    () => state.serviceTimeTo,
  ],
  () => {
    if (!state.autoRecalc) return;
    if (isHourlyService.value) recalcHourlyQuantity();
    recalcPrices();
  },
  { immediate: true },
);

// Если автоперерасчёт включили — пересчитать сразу
watch(
  () => state.autoRecalc,
  (val) => {
    if (val) recalcPrices();
  },
);

watch(
  selectedProduct,
  (product) => {
    if (!product) {
      state.contractor = undefined;
      state.approvedTo = false;
      state.approvedOm = false;
      return;
    }
    if (state.contractor === undefined || state.contractor === null) {
      const contractorIdFromProduct = Number(product.contractor?.id);
      if (Number.isFinite(contractorIdFromProduct) && contractorIdFromProduct > 0) {
        state.contractor = contractorIdFromProduct;
      }
    }
    if (!requiresToApproval.value) state.approvedTo = false;
    if (!requiresOmApproval.value) state.approvedOm = false;
    applyAutoApprovalForCreate();
  },
  { immediate: true },
);

const toast = useToast();
watch(
  [isTimeService, () => state.serviceDate, () => state.serviceTimeFrom, () => state.serviceTimeTo],
  ([isTime]) => {
    if (!isTime) return;
    if (isHourlyService.value) {
      recalcHourlyQuantity();
    }
    // сбрасываем конец, если стал недопустим
    if (state.serviceTimeFrom && state.serviceTimeTo) {
      const [fh, fm] = state.serviceTimeFrom.split(":").map(Number);
      const [th, tm] = state.serviceTimeTo.split(":").map(Number);
      const start = fh * 60 + fm;
      const end = th * 60 + tm;
      const fixedDuration = serviceDurationMinutes.value;
      if (fixedDuration > 0) {
        if (Number.isNaN(start) || Number.isNaN(end) || end - start !== fixedDuration) {
          state.serviceTimeTo = "";
        }
        return;
      }
      const minDuration = minServiceDurationMinutes.value || 1;
      if (Number.isNaN(start) || Number.isNaN(end) || end - start < minDuration) {
        state.serviceTimeTo = "";
      }
    }
  },
  { immediate: true },
);

watch(
  [isTimeService, allowedServiceStartTimes, () => state.serviceTimeFrom],
  ([isTime, allowed]) => {
    if (!isTime) return;
    if (!allowed.length) return;
    if (state.serviceTimeFrom && !allowed.includes(state.serviceTimeFrom)) {
      state.serviceTimeFrom = "";
      state.serviceTimeTo = "";
    }
    if (serviceDurationMinutes.value > 0 && state.serviceTimeFrom) {
      const end = addMinutesToTime(state.serviceTimeFrom, serviceDurationMinutes.value);
      state.serviceTimeTo = end || "";
    }
  },
  { immediate: true },
);

watch(
  () => state.daysCount,
  () => {
    if (hasCustomDayCount.value) {
      recalcPrices();
    }
  },
);

watch(
  () => state.serviceDates.length,
  (len) => {
    if (isDailyService.value) {
      state.daysCount = len || 0;
      recalcPrices();
    }
  },
);

watch(
  () => state.areaTypeId,
  (id) => {
    if (!selectedProduct.value?.quantityFactorArea) return;
    if (!isEdit.value) {
      const val = id ? dealAreaById[Number(id)] : undefined;
      if (Number.isFinite(val)) {
        state.areaValue = String(val);
      }
    }
    recalcPrices();
  },
);

watch(
  () => state.areaValue,
  () => {
    if (!selectedProduct.value?.quantityFactorArea) return;
    if (!selectedAreaEditable.value) return;
    recalcPrices();
  },
);
async function loadDetail() {
  if (!currentId.value) return;

  detailLoading.value = true;
  try {
    costUpdateGuard.value = true;
    const response = await api.get(`/api/sp1040/view?id=${currentId.value}`);
    const detail = response.data ?? {};

    // Заполняем состояние, если поля пришли
    if (detail.product ?? detail.productId) {
      detailHydrating.value = true;
      state.product = Number(detail.product ?? detail.productId);
    }
    if (detail.quantity !== undefined) state.quantity = Number(detail.quantity) || 1;
    if (detail.discountValue !== undefined) state.discountValue = Number(detail.discountValue) || 0;
    if (detail.discountValueOne !== undefined) state.discountValueOne = Number(detail.discountValueOne) || 0;
    const detailDiscountTypeAllOne =
      detail.discountTypeAllOne ?? (detail as any).discontTypeAllOne;
    if (detailDiscountTypeAllOne === "all" || detailDiscountTypeAllOne === "one") {
      state.discountTypeAllOne = detailDiscountTypeAllOne;
    }
    if (detail.discountType) {
      const raw = String(detail.discountType);
      state.discountType = discountTypes.includes(raw) ? raw : raw === "Сумма в валюте" ? "Сумма" : raw;
    }
    if (detail.markupValue !== undefined) state.markupValue = Number(detail.markupValue) || 0;
    if (detail.markupType) state.markupType = detail.markupType;
    if (detail.currency) state.currency = detail.currency;
    else if (detail.currencyId) {
      const code = currencyIdToCode[Number(detail.currencyId)];
      if (code) state.currency = code as Currency;
    }
    if (detail.productTitle || detail.productName || detail.title) {
      const detailTitle = String(detail.productTitle ?? detail.productName ?? detail.title);
      state.customProductTitle = detailTitle;
      hasDetailTitle.value = true;
    }
    if (detail.unitPrice !== undefined || detail.price !== undefined) {
      const price = detail.unitPrice ?? detail.price;
      state.customUnitPrice = Number(price || 0);
      hasDetailUnitPrice.value = true;
    }
    if (detail.unit) state.unit = detail.unit;
    const detailContractorRaw = detail.contractorId ?? detail.contractor_id ?? detail.contractor;
    const detailContractorId = Number((detailContractorRaw as any)?.id ?? detailContractorRaw ?? NaN);
    if (Number.isFinite(detailContractorId) && detailContractorId > 0) {
      state.contractor = detailContractorId;
    }
    if (detail.comment) state.comment = detail.comment;
    if (detail.finalPrice !== undefined) state.finalPrice = Number(detail.finalPrice) || 0;
    const detailCostSourceRaw = detail.costSource;
    const detailCostSource =
      detailCostSourceRaw === "unit" || detailCostSourceRaw === "total" ? detailCostSourceRaw : undefined;
    const detailCostPerUnit = Number(detail.costPerUnit);
    const detailTotalCost = Number(detail.totalCost);
    const hasDetailCostPerUnit = Number.isFinite(detailCostPerUnit) && detailCostPerUnit > 0;
    const hasDetailTotalCost = Number.isFinite(detailTotalCost) && detailTotalCost > 0;
    if (hasDetailCostPerUnit) {
      state.costPerUnit = String(detailCostPerUnit);
      if (!detailCostSource) state.costSource = "unit";
    }
    if (hasDetailTotalCost) {
      state.totalCost = String(detailTotalCost);
      if (!hasDetailCostPerUnit && !detailCostSource) state.costSource = "total";
    }
    if (detailCostSource) {
      state.costSource = detailCostSource;
    }
    hasDetailCost.value = hasDetailCostPerUnit || hasDetailTotalCost;
    if (detail.invoiceIssued !== undefined) state.invoiceIssued = Boolean(detail.invoiceIssued);
    if (detail.autoRecalc !== undefined) state.autoRecalc = Boolean(detail.autoRecalc);
    if (Array.isArray(detail.serviceDates)) state.serviceDates = detail.serviceDates.filter(Boolean);
    if (detail.serviceDate) state.serviceDate = normalizeDateString(detail.serviceDate);
    if (detail.serviceTimeFromId) {
      const value = timeStartValueById[String(detail.serviceTimeFromId)];
      state.serviceTimeFrom = normalizeTimeString(value);
    } else if (detail.serviceTimeFrom) {
      state.serviceTimeFrom = normalizeTimeString(detail.serviceTimeFrom);
    }
    if (detail.serviceTimeToId) {
      const value = timeFinishValueById[String(detail.serviceTimeToId)];
      state.serviceTimeTo = normalizeTimeString(value);
    } else if (detail.serviceTimeTo) {
      state.serviceTimeTo = normalizeTimeString(detail.serviceTimeTo);
    }
    const detailAreaTypeId = Number(
      detail.areaTypeId ??
        detail.area_type_id ??
        detail.areaType ??
        detail.area_type ??
        detail.areaId ??
        detail.area_id ??
        NaN,
    );
    if (Number.isFinite(detailAreaTypeId) && detailAreaTypeId > 0) {
      state.areaTypeId = detailAreaTypeId;
    }
    const detailAreaValue = Number(detail.areaValue ?? detail.area_value ?? detail.area ?? detail.square ?? NaN);
    if (Number.isFinite(detailAreaValue)) {
      state.areaValue = String(detailAreaValue);
    }
    const approvedToRaw = detail.approvalTo;
    const approvedOmRaw = detail.approvalOm;
    const approvedTo = resolveApprovalFlag(approvedToRaw);
    const approvedOm = resolveApprovalFlag(approvedOmRaw);
    if (approvedTo !== undefined) state.approvedTo = approvedTo;
    if (approvedOm !== undefined) state.approvedOm = approvedOm;

    await ensureCurrentProductInGoodsList();
    recalcPrices();
  } catch (error) {
    console.warn("[load detail error]", error);
    toast.add({
      title: "Ошибка",
      description: "Не удалось загрузить данные",
      color: "air-primary-alert",
    });
  } finally {
    nextTick(() => {
      costUpdateGuard.value = false;
    });
    detailLoading.value = false;
    nextTick(() => {
      detailHydrating.value = false;
    });
  }
}

async function ensureCurrentProductInGoodsList() {
  const productId = Number(state.product ?? NaN);
  if (!Number.isFinite(productId) || productId <= 0) return;
  if (!Array.isArray(goodsFromApi.value)) return;

  const hasProduct = goodsFromApi.value.some((item) => Number(item.id) === productId);
  if (hasProduct) return;

  const archivedProduct = await fetchGoodById(productId);
  if (!archivedProduct) return;

  goodsFromApi.value = [archivedProduct, ...goodsFromApi.value];
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const product = selectedProduct.value;
  const currency = state.currency;
  const unitPrice = isCustomPriceEnabled.value
    ? Number(state.customUnitPrice) || 0
    : currency === "руб"
      ? (product?.price_rub ?? 0)
      : currency === "usd"
        ? (product?.price_usd ?? 0)
        : (product?.price_eur ?? 0);
  const costPerUnit = Number(state.costPerUnit) || 0;
  const requiresToApproval =
    (product as any)?.requiresToApproval ?? (product as any)?.needToApprove ?? (product as any)?.need_approval ?? false;
  const requiresOmApproval = Boolean((product as any)?.requiresOmApproval);
  const unitId = product?.unit?.id ?? null;
  const typeBuildingIds = (product as any)?.typeBuildingIds;
  const contractorId = state.contractor ?? null;
  const discountTitleToId = Object.fromEntries(discountTypeDirectory.map((i) => [i.title, i.id]));
  const markupTitleToId = Object.fromEntries(markupTypeDirectory.map((i) => [i.title, i.id]));
  const currencyIdFromCode = currencyCodeToId;
  const discountTypeId = discountTitleToId[state.discountType] ?? null;
  const markupTypeId = markupTitleToId[state.markupType] ?? null;
  const currencyId = currencyIdFromCode[state.currency] ?? null;
  const serviceDatesPayload = isDailyService.value ? state.serviceDates : null;
  const serviceDateSingle = isTimeService.value ? state.serviceDate : null;
  const serviceTimeFromPayload = isTimeService.value ? (timeStartIdByValue[state.serviceTimeFrom] ?? null) : null;
  const serviceTimeToPayload = isTimeService.value ? (timeFinishIdByValue[state.serviceTimeTo] ?? null) : null;
  const areaValueNumber = Number(state.areaValue || dealArea || 0) || 0;
  if (product?.quantityFactorArea) {
    if (!state.areaTypeId) {
      toast.add({
        title: "Укажите тип площади",
        description: "Выберите тип площади",
        color: "air-primary-alert",
      });
      return;
    }
    if (!areaValueNumber) {
      toast.add({
        title: "Не указана площадь",
        description: "Заполните площадь для расчёта",
        color: "air-primary-alert",
      });
      return;
    }
  }
  const quantityRaw = Number(state.quantity) || 0;
  const areaFactor = product?.quantityFactorArea ? areaValueNumber || 1 : 1;
  const daysFactor = hasCustomDayCount.value
    ? Number(state.daysCount) || 1
    : isDailyService.value
      ? state.daysCount || state.serviceDates.length || 0
      : 1;
  const hoursFactor = isHourlyService.value ? state.hoursCount || 0 : 1;
  const quantityWithArea = quantityRaw * areaFactor * daysFactor * hoursFactor;
  const baseTotalPrice = Number((unitPrice * quantityWithArea).toFixed(2));
  const markupValSubmit = Number(state.markupValue) || 0;
  const markupAmountSubmit =
    state.markupType === "%" ? (baseTotalPrice * markupValSubmit) / 100 : markupValSubmit;
  /** Сумма позиции без учёта скидок (база + наценка; скидка не вычитается). */
  const totalPriceWithoutDiscount = Number((baseTotalPrice + markupAmountSubmit).toFixed(2));
  if (isDailyService.value) {
    if (!serviceDatesPayload || serviceDatesPayload.length === 0) {
      toast.add({
        title: "Укажите даты",
        description: "Для посуточной услуги выберите даты",
        color: "air-primary-alert",
      });
      return;
    }
    if (allowedServiceDates.value.length) {
      const allAllowed = serviceDatesPayload?.every((d) => allowedServiceDates.value.includes(d));
      if (!allAllowed) {
        toast.add({
          title: "Нельзя выбрать эту дату",
          description: "Выберите дату из разрешённых",
          color: "air-primary-alert",
        });
        return;
      }
    }
  }
  if (isTimeService.value) {
    if (!serviceDateSingle) {
      toast.add({
        title: "Укажите дату",
        description: "Выберите дату предоставления услуги",
        color: "air-primary-alert",
      });
      return;
    }
    if (allowedServiceDates.value.length && !allowedServiceDates.value.includes(serviceDateSingle)) {
      toast.add({
        title: "Нельзя выбрать эту дату",
        description: "Выберите дату из разрешённых",
        color: "air-primary-alert",
      });
      return;
    }
    const from = state.serviceTimeFrom;
    const to = state.serviceTimeTo;
    if (!from || !to) {
      toast.add({
        title: "Укажите время",
        description: "Нужно выбрать начало и окончание",
        color: "air-primary-alert",
      });
      return;
    }
    const [fh, fm] = from.split(":").map(Number);
    const [th, tm] = to.split(":").map(Number);
    if (Number.isNaN(fh) || Number.isNaN(fm) || Number.isNaN(th) || Number.isNaN(tm)) {
      toast.add({
        title: "Неверный формат времени",
        description: "Проверьте время",
        color: "air-primary-alert",
      });
      return;
    }
    const start = fh * 60 + fm;
    const end = th * 60 + tm;
    if (end <= start) {
      toast.add({
        title: "Время некорректно",
        description: "Окончание должно быть позже начала",
        color: "air-primary-alert",
      });
      return;
    }
    const fixedDuration = serviceDurationMinutes.value || 0;
    if (fixedDuration > 0 && end - start !== fixedDuration) {
      toast.add({
        title: "Неверная длительность",
        description: `Продолжительность должна быть ${fixedDuration} мин`,
        color: "air-primary-alert",
      });
      return;
    }
    const minDuration = minServiceDurationMinutes.value || 0;
    if (minDuration > 0 && end - start < minDuration) {
      toast.add({
        title: "Слишком короткая услуга",
        description: `Минимальная продолжительность ${minDuration} мин`,
        color: "air-primary-alert",
      });
      return;
    }
    if (isHourlyService.value) {
      state.hoursCount = Math.ceil((end - start) / 60);
    }
  }

  const hasTimeFlag = isTimeService.value;
  const hasDaysFlag = isDailyService.value || hasCustomDayCount.value;
  const hasAreaFlag = !!product?.quantityFactorArea;

  const daysCountPayload = hasCustomDayCount.value
    ? Number(state.daysCount) || 1
    : isDailyService.value
      ? state.daysCount || state.serviceDates.length || 0
      : null;
  const hoursCountPayload = isHourlyService.value ? state.hoursCount : null;
  const areaTypeIdPayload = product?.quantityFactorArea ? (state.areaTypeId ?? null) : null;
  const areaValuePayload = product?.quantityFactorArea ? areaValueNumber : null;

  const payload = {
    ...event.data,
    productTypeId,
    dealTypeBuildingId,
    id: currentId.value ?? undefined,
    dealId: dealId ?? undefined,
    unitPrice,
    baseTotalPrice,
    totalPriceWithoutDiscount,
    categoryId: product?.categoryId ?? undefined,
    productTitle: isCustomTitleEnabled.value ? state.customProductTitle.trim() : undefined,
    costPerUnit,
    requiresToApproval,
    requiresOmApproval,
    approvedTo: state.approvedTo,
    approvedOm: state.approvedOm,
    // передаём id единицы измерения
    unitId: unitId ?? undefined,
    contractorId: contractorId ?? undefined,
    discountType: discountTypeId ?? undefined,
    discountTypeTitle: state.discountType,
    discountTypeAllOne: state.discountTypeAllOne,
    discountValueOne: state.discountValueOne,
    markupType: markupTypeId ?? undefined,
    markupTypeTitle: state.markupType,
    currencyId: currencyId ?? undefined,
    currency: state.currency,
    serviceDates: serviceDatesPayload,
    serviceDate: serviceDateSingle,
    serviceTimeFromId: serviceTimeFromPayload,
    serviceTimeToId: serviceTimeToPayload,
    quantityWithArea,
    areaTypeId: areaTypeIdPayload,
    areaValue: areaValuePayload,
    daysCount: daysCountPayload,
    hoursCount: hoursCountPayload,
    costSource: state.costSource, // 'unit' | 'total'
    hasTime: hasTimeFlag,
    hasDays: hasDaysFlag,
    hasArea: hasAreaFlag,
    typeBuildingIds,
  };

  try {
    submitLoading.value = true;

    if (isEdit.value && currentId.value) {
      await api.put(`/api/product-row-form/update?id=${currentId.value}`, payload);
      toast.add({
        title: "Готово",
        description: "Изменения сохранены",
        color: "air-primary-success",
      });
    } else {
      const response = await api.post("/api/product-row-form/create", payload);
      const newId = response?.data?.id ?? response?.data?.result?.id;
      if (newId) {
        currentId.value = newId;
      }
      toast.add({ title: "Готово", description: "Форма отправлена", color: "air-primary-success" });
    }
  } catch (error) {
    console.warn("[form send error]", error);
    toast.add({ title: "Ошибка", description: "Ошибка при отправке", color: "air-primary-alert" });
  } finally {
    submitLoading.value = false;
  }
}
</script>

<style scoped>
.form-loading {
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  color: #64748b;
}
.form-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(100, 116, 139, 0.3);
  border-top-color: #64748b;
  border-radius: 50%;
  animation: form-spin 0.8s linear infinite;
}
@keyframes form-spin {
  to {
    transform: rotate(360deg);
  }
}
.form-field-600px {
  width: 600px !important;
  min-width: 600px !important;
  max-width: 600px !important;
}
/* Ширина полей как у себестоимости — равные колонки в ряду */
.form-field-cost-like > * {
  flex: 1;
  min-width: 0;
}
.form-field-cost-like :deep(.form-field-300px),
.form-field-cost-like :deep(input),
.form-field-cost-like :deep([data-slot="trigger"]) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
}
.form-field-300px {
  width: 100%;
  min-width: 0;
}
.form-flex-row {
  display: flex;
  flex-direction: row;
  gap: 10px;
}
.flex-align-bottom {
  align-items: flex-end;
}
:deep(.input-danger input) {
  border-color: #e53935 !important;
  color: #e53935 !important;
}
:deep(.input-danger .b24-select__trigger),
:deep(.input-danger .b24-select__inner),
:deep(.input-danger .b24-select__value) {
  border-color: #e53935 !important;
  color: #e53935 !important;
}
:deep(.b24-select__menu),
:deep(.b24-select__option),
:deep(.b24-select__option-label) {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}
::deep(.b24-select__option-label) {
  display: block;
}
::deep([data-slot="item"]) {
  height: auto !important;
  align-items: flex-start;
}
::deep([data-slot="itemLabel"].truncate) {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  display: block;
}
</style>

<style>
/* Teleported select content needs global styles. */
[data-slot="item"] {
  height: auto !important;
  align-items: flex-start;
}
[data-slot="itemLabel"].truncate {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  display: block;
}
</style>

<template>
  <B24App>
    <div v-if="isEdit && detailLoading" class="form-loading">
      <span class="form-spinner" aria-hidden="true"></span>
      <span>Загрузка...</span>
    </div>
    <B24Form v-else :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <!-- Товар -->
      <B24FormField label="Товар" name="product" required>
        <B24Select
          class="w-full"
          :style="{ width: '600px' }"
          v-model="state.product"
          :disabled="isEdit"
          :items="productItems"
          value-key="value"
          label-key="label"
          placeholder="Выберите товар"
          :b24ui="{
            base: 'text-base-760 hover:ring-1 hover:ring-inset hover:ring-blue-500 dark:hover:ring-blue-600 data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-blue-500 dark:data-[state=open]:ring-blue-600',
            trailingIcon: 'text-base-760 size-lg',
            content: 'rounded-[18px] min-w-[590px] shadow-lg ring-0 border-0',
            viewport:
              'relative scroll-py-1 w-[590px] max-h-[40vh] overflow-x-hidden overflow-y-auto scrollbar-thin ring-0 border-0',
            group: 'p-0 my-[2px] -mx-1 w-full !max-w-none',
            item: 'ps-[16px] pe-[16px] py-2 whitespace-normal min-w-[590px] break-words overflow-visible min-h-[24px] items-start gap-1',
            itemTrailingIcon: 'hidden',
          }">
          <template #content-top>
            <div class="px-3 pt-3 pb-1">
              <B24Input
                v-model="productSearch"
                type="search"
                placeholder="Поиск товара..."
                size="sm"
                class="w-full"
                :disabled="isEdit"
                autofocus
                @keydown.stop
                @click.stop />
            </div>
          </template>
          <template #item-label="{ item }">
            <template v-if="item">
              <div class="flex flex-col gap-1">
                <span class="font-medium">{{ (item as ProductItem).label }}</span>
              </div>
            </template>
          </template>
          <template #content-bottom>
            <div v-if="!productItems.length" class="px-3 pb-2 text-sm text-slate-600">Ничего не найдено</div>
          </template>
        </B24Select>
      </B24FormField>
      <template v-if="isCustomTitleEnabled">
        <B24FormField label="Название" name="customProductTitle" required>
          <B24Input class="form-field-600px" v-model="state.customProductTitle" placeholder="Введите название" />
        </B24FormField>
      </template>
      <!-- Даты предоставления услуги (посуточно) -->
      <template v-if="isDailyService">
        <div class="form-field-600px form-flex-row flex-align-bottom" style="gap: 12px">
          <B24FormField label="Даты" name="serviceDates" required style="flex: 1">
            <B24Select
              v-model="state.serviceDates"
              :items="serviceDateOptions"
              value-key="value"
              label-key="label"
              multiple
              placeholder="Выберите даты"
              :style="{ width: '400px' }"
              :b24ui="{
                base: 'text-base-760 hover:ring-1 hover:ring-inset hover:ring-blue-500 dark:hover:ring-blue-600 data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-blue-500 dark:data-[state=open]:ring-blue-600',
                trailingIcon: 'text-base-760 size-lg',
                content: 'rounded-[18px] min-w-[390px] shadow-lg ring-0 border-0',
                viewport:
                  'relative scroll-py-1 w-[390px] max-h-[40vh] overflow-x-hidden overflow-y-auto scrollbar-thin ring-0 border-0',
                group: 'p-0 my-[2px] -mx-1 w-full !max-w-none',
                item: 'ps-[16px] pe-[16px] py-2 whitespace-normal min-w-[590px] break-all overflow-visible text-ellipsis line-clamp-3 hover:line-clamp-none min-h-[24px] items-start gap-1',
                itemTrailingIcon: 'hidden',
              }" />
            <div v-if="!serviceDateOptions.length" class="text-sm text-slate-600">Нет доступных дат</div>
          </B24FormField>
          <B24FormField label="Количество дней" name="daysCount" style="width: 190px">
            <B24Input type="number" min="1" v-model="state.daysCount" placeholder="1" :disabled="isDaysFieldReadOnly" />
          </B24FormField>
        </div>
      </template>
      <!-- Даты/время для почасовой услуги и расписания -->
      <template v-else-if="isTimeService">
        <div class="form-field-600px form-flex-row flex-align-bottom" style="gap: 10px">
          <B24FormField
            label="Дата"
            name="serviceDateSingle"
            :style="isScheduledService ? 'width: 200px;' : 'flex: 1;'">
            <B24Select
              v-model="state.serviceDate"
              :items="serviceDateOptions"
              value-key="value"
              label-key="label"
              placeholder="Выберите дату"
              :style="isScheduledService ? 'width: 200px;' : 'width: 150px;'"
              :b24ui="
                isScheduledService
                  ? {
                      content: 'max-w-[185px]',
                      viewport: 'max-w-[185px]',
                      item: 'max-w-[185px]',
                    }
                  : {
                      content: 'max-w-[145px]',
                      viewport: 'max-w-[145px]',
                      item: 'max-w-[145px]',
                    }
              " />
          </B24FormField>
          <B24FormField
            label="Время начала"
            name="serviceTimeFrom"
            :style="isScheduledService ? 'width: 190px;' : 'flex: 1;'">
            <B24Select
              v-model="state.serviceTimeFrom"
              :items="timeOptionsStart"
              value-key="value"
              label-key="label"
              placeholder="Выберите время"
              :style="isScheduledService ? 'width: 190px;' : 'width: 150px;'"
              :b24ui="
                isScheduledService
                  ? {
                      content: 'max-w-[185px]',
                      viewport: 'max-w-[185px]',
                      item: 'max-w-[185px]',
                    }
                  : {
                      content: 'max-w-[145px]',
                      viewport: 'max-w-[145px]',
                      item: 'max-w-[145px]',
                    }
              " />
          </B24FormField>
          <B24FormField
            label="Время окончания"
            name="serviceTimeTo"
            :style="isScheduledService ? 'width: 190px;' : 'flex: 1;'">
            <B24Select
              v-model="state.serviceTimeTo"
              :items="timeOptionsEnd"
              value-key="value"
              label-key="label"
              placeholder="Выберите время"
              :style="isScheduledService ? 'width: 190px;' : 'width: 150px;'"
              :disabled="serviceDurationMinutes > 0" />
          </B24FormField>
          <B24FormField v-if="isHourlyService" label="Количество часов" name="hoursCount" style="width: 150px">
            <B24Input :model-value="state.hoursCount" disabled placeholder="0" />
          </B24FormField>
        </div>
        <div v-if="!serviceDateOptions.length" class="text-sm text-slate-600">Нет доступных дат</div>
      </template>
      <template v-if="selectedProduct?.quantityFactorArea">
        <div class="form-field-600px form-flex-row flex-align-bottom" style="gap: 12px; margin-top: 10px">
          <B24FormField label="Тип площади" name="areaTypeHourly" style="width: 400px">
            <B24Select
              v-model="state.areaTypeId"
              :items="enabledAreaTypeOptions"
              value-key="value"
              label-key="label"
              placeholder="Выберите тип площади"
              class="w-full"
              :style="{ width: '400px' }"
              required
              :b24ui="{
                base: 'text-base-760 hover:ring-1 hover:ring-inset hover:ring-blue-500 dark:hover:ring-blue-600 data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-blue-500 dark:data-[state=open]:ring-blue-600',
                trailingIcon: 'text-base-760 size-lg',
                content: 'rounded-[18px] min-w-[390px] shadow-lg ring-0 border-0',
                viewport:
                  'relative scroll-py-1 w-[390px] max-h-[40vh] overflow-x-hidden overflow-y-auto scrollbar-thin ring-0 border-0',
                group: 'p-0 my-[2px] -mx-1 w-full !max-w-none',
                item: 'ps-[16px] pe-[16px] py-2 whitespace-normal min-w-[590px] break-all overflow-visible text-ellipsis line-clamp-3 hover:line-clamp-none min-h-[24px] items-start gap-1',
                itemTrailingIcon: 'hidden',
              }" />
          </B24FormField>
          <B24FormField label="Площадь" name="dealAreaHourly" style="width: 190px">
            <B24Input
              v-model="state.areaValue"
              :disabled="!selectedAreaEditable"
              type="number"
              min="0"
              step="0.01"
              placeholder="-" />
          </B24FormField>
        </div>
      </template>

      <div class="form-field-600px form-flex-row flex-align-bottom" v-if="showTotalQuantity">
        <B24FormField label="Количество" name="quantity" required style="flex: 1">
          <B24Input
            type="number"
            min="1"
            :step="isFractionalQuantityAllowed ? '0.25' : '1'"
            v-model="state.quantity"
            placeholder="1"
            @blur="onQuantityBlur" />
        </B24FormField>
        <B24FormField label="Количество итого" name="totalQuantity" style="flex: 1">
          <B24Input :model-value="state.totalQuantity" disabled placeholder="0" />
        </B24FormField>
        <B24FormField label="Ед. измерения" name="unit" style="flex: 1">
          <B24Input v-model="state.unit" disabled placeholder="Авто из товара" />
        </B24FormField>
      </div>
      <div class="form-field-600px form-flex-row flex-align-bottom" v-else>
        <B24FormField label="Количество" name="quantity" required style="flex: 1">
          <B24Input
            type="number"
            min="1"
            :step="isFractionalQuantityAllowed ? '0.25' : '1'"
            v-model="state.quantity"
            placeholder="1"
            style="width: 400px"
            @blur="onQuantityBlur" />
        </B24FormField>
        <B24FormField label="Ед. измерения" name="unit" style="flex: 1">
          <B24Input v-model="state.unit" disabled placeholder="Авто из товара" />
        </B24FormField>
      </div>
      <!-- Скидка за ед. / Скидка за всё и тип скидки (как себестоимость) -->
      <div class="form-field-600px form-flex-row flex-align-bottom form-field-cost-like">
        <B24FormField :label="discountValueOneLabel" name="discountValueOne">
          <B24Input
            type="number"
            min="0"
            step="0.01"
            :max="state.discountType === '%' ? 100 : undefined"
            v-model="state.discountValueOne"
            placeholder="0"
            class="form-field-300px"
            @input="onDiscountValueOneInput" />
        </B24FormField>
        <B24FormField :label="discountValueLabel" name="discountValue">
          <B24Input
            type="number"
            min="0"
            step="0.01"
            :max="state.discountType === '%' ? 100 : undefined"
            v-model="state.discountValue"
            placeholder="0"
            class="form-field-300px"
            @input="onDiscountValueInput" />
        </B24FormField>
        <B24FormField label="Тип скидки" name="discountType">
          <B24Select
            v-model="state.discountType"
            :items="discountTypes.map((t) => ({ value: t, label: t }))"
            :style="{ width: '190px' }"
            :b24ui="{
              content: 'max-w-[185px]',
              viewport: 'max-w-[185px]',
              item: 'max-w-[185px]',
            }" />
        </B24FormField>
      </div>
      <!-- Наценка и тип наценки: выравнивание по нижнему краю -->
      <div class="form-field-600px form-flex-row flex-align-bottom">
        <B24FormField label="Наценка" name="markupValue" required>
          <B24Input
            type="number"
            min="0"
            step="0.01"
            v-model="state.markupValue"
            placeholder="0"
            style="width: 400px" />
        </B24FormField>
        <div style="width: 190px">
          <B24Select
            v-model="state.markupType"
            :items="markupTypes.map((t) => ({ value: t, label: t }))"
            :style="{ width: '190px' }"
            :b24ui="{
              content: 'max-w-[185px]',
              viewport: 'max-w-[185px]',
              item: 'max-w-[185px]',
            }" />
        </div>
      </div>
      <div class="form-field-600px form-flex-row flex-align-bottom">
        <!-- Стоимость итоговая -->
        <B24FormField label="Стоимость ед. базовая" name="baseUnitPrice">
          <B24Input
            v-if="isCustomPriceEnabled"
            v-model="state.customUnitPrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            style="width: 140px"
            @input="onCustomUnitPriceInput" />
          <B24Input v-else :model-value="state.baseUnitPrice" disabled placeholder="0" style="width: 140px" />
        </B24FormField>
        <B24FormField label="Стоимость ед." name="finalUnitPrice">
          <B24Input :model-value="state.finalUnitPrice" disabled placeholder="0" style="width: 140px" />
        </B24FormField>
        <B24FormField label="Стоимость итог" name="finalPrice">
          <B24Input
            :class="isFinalOverCost ? 'input-danger' : ''"
            v-model="state.finalPrice"
            disabled
            placeholder="0"
            style="width: 140px" />
        </B24FormField>
        <B24FormField label="Валюта" name="currency" required>
          <B24Select
            v-model="state.currency"
            :items="currencyOptions"
            :class="isCurrencyMismatch ? 'input-danger' : ''"
            :style="{ width: '150px' }"
            :b24ui="{
              content: 'max-w-[145px]',
              viewport: 'max-w-[145px]',
              item: 'max-w-[145px]',
            }" />
        </B24FormField>
      </div>
      <div v-if="showCostBlock" class="form-field-600px form-flex-row flex-align-bottom form-field-cost-like">
        <!-- Себестоимость ед. -->
        <B24FormField :label="costPerUnitLabel" name="costPerUnit">
          <B24Input
            class="form-field-300px"
            v-model="state.costPerUnit"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            @input="onCostPerUnitInput" />
        </B24FormField>
        <!-- Себестоимость -->
        <B24FormField :label="totalCostLabel" name="totalCost">
          <B24Input
            class="form-field-300px"
            v-model="state.totalCost"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            @input="onTotalCostInput" />
        </B24FormField>
        <B24FormField label="Валюта" name="costCurrency">
          <B24Input class="form-field-300px" v-model="state.costCurrency" disabled placeholder="-" />
        </B24FormField>
      </div>

      <div class="form-field-600px form-flex-row flex-align-bottom">
        <!-- Автоперерасчёт -->
        <B24FormField label="Автоматический перерасчёт" name="autoRecalc" style="flex: 1">
          <B24Checkbox v-model="state.autoRecalc" />
        </B24FormField>
        <!-- Был выставлен счет -->
        <B24FormField label="Был выставлен счет" name="invoiceIssued" style="flex: 1">
          <B24Checkbox v-model="state.invoiceIssued" />
        </B24FormField>
      </div>
      <!-- Подрядчик -->
      <B24FormField label="Подрядчик" name="contractor">
        <B24Select
          class="w-full"
          :style="{ width: '600px' }"
          v-model="state.contractor"
          :items="contractorOptions"
          value-key="value"
          label-key="label"
          placeholder="Выберите подрядчика"
          :disabled="!contractorOptions.length"
          :b24ui="{
            base: 'text-base-760 hover:ring-1 hover:ring-inset hover:ring-blue-500 dark:hover:ring-blue-600 data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-blue-500 dark:data-[state=open]:ring-blue-600',
            trailingIcon: 'text-base-760 size-lg',
            content: 'rounded-[18px] min-w-[590px] shadow-lg ring-0 border-0',
            viewport:
              'relative scroll-py-1 w-[590px] max-h-[40vh] overflow-x-hidden overflow-y-auto scrollbar-thin ring-0 border-0',
            group: 'p-0 my-[2px] -mx-1 w-full !max-w-none',
            item: 'ps-[16px] pe-[16px] py-2 whitespace-normal min-w-[590px] break-all overflow-visible text-ellipsis line-clamp-3 hover:line-clamp-none min-h-[24px] items-start gap-1',
            itemTrailingIcon: 'hidden',
          }" />
      </B24FormField>
      <template v-if="requiresToApproval || requiresOmApproval">
        <div v-if="requiresToApproval" class="form-field-600px form-flex-row flex-align-bottom">
          <B24FormField label="Требуется согласование ТО" style="flex: 1">
            <B24Checkbox :model-value="true" disabled />
          </B24FormField>
          <B24FormField label="Согласовано ТО" style="flex: 1">
            <B24Checkbox v-model="state.approvedTo" :disabled="!canEditApprovedTo" />
          </B24FormField>
        </div>
        <div v-if="requiresOmApproval" class="form-field-600px form-flex-row flex-align-bottom">
          <B24FormField label="Требуется согласование ОМ" style="flex: 1">
            <B24Checkbox :model-value="true" disabled />
          </B24FormField>
          <B24FormField label="Согласовано ОМ" style="flex: 1">
            <B24Checkbox v-model="state.approvedOm" :disabled="!canEditApprovedOm" />
          </B24FormField>
        </div>
      </template>
      <!-- Комментарий -->
      <B24FormField label="Комментарий" name="comment">
        <B24Textarea class="form-field-600px" v-model="state.comment" placeholder="Комментарий по заказу..." />
      </B24FormField>
      <B24Button class="form-field-600px" color="air-primary" type="submit" :loading="submitLoading">
        {{ isEdit ? "Сохранить изменения" : "Создать" }}
      </B24Button>
    </B24Form>
  </B24App>
</template>
