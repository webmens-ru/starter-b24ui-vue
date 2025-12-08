declare module '@bitrix24/b24ui-nuxt/dist/runtime/composables/useToast.js' {
  import type { Ref } from 'vue'

  export interface Toast {
    id: string | number
    title?: string
    description?: string
    color?: string
    onClick?: (toast: Toast) => void
  }

  export function useToast(): {
    toasts: Ref<Toast[]>
    add: (toast: Partial<Toast>) => Toast
    update: (id: string | number, toast: Omit<Partial<Toast>, 'id'>) => void
    remove: (id: string | number) => void
    clear: () => void
  }
}

declare module '@bitrix24/b24ui-nuxt/dist/runtime/types/form.js' {
  export type FormSubmitEvent<T> = SubmitEvent & {
    data: T
  }
}

declare function useToast(): {
  toasts: import('vue').Ref<Toast[]>
  add: (toast: Partial<Toast>) => Toast
  update: (id: string | number, toast: Omit<Partial<Toast>, 'id'>) => void
  remove: (id: string | number) => void
  clear: () => void
}

declare type FormSubmitEvent<T> = SubmitEvent & { data: T }

export {}

