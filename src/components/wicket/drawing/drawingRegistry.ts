import type { Component } from 'vue'

import Type2Drawing from './type2/Type2Drawing.vue'
import Type1Drawing from './type1/Type1Drawing.vue'
import Type3Drawing from './type3/Type3Drawing.vue'

const drawingComponents: Record<string, Component> = {
  '1': Type1Drawing,
  '2': Type2Drawing,
  '3': Type3Drawing,
}

export function resolveDrawingComponent(modelId: string): Component | null {
  return drawingComponents[modelId] ?? null
}
