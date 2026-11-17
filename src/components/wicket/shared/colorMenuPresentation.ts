/** Presentation shared by single dictionary color selectors and texture comboboxes. */
export const colorMenuUi = {
  content: 'z-[1100] w-[max(var(--reka-combobox-trigger-width),32rem)] max-w-[calc(100vw-2rem)]',
  viewport: 'w-full',
  item: 'h-auto min-h-[36px] py-2 gap-2',
  itemLabel: 'whitespace-normal break-words text-clip',
}

export function validColorHex(value: unknown): string | undefined {
  return typeof value === 'string' && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? value : undefined
}
