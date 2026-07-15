import type { Component } from 'vue'

import Type2Drawing from './type2/Type2Drawing.vue'

const drawingComponents: Record<string, Component> = {
  '2': Type2Drawing,
}

export function resolveDrawingComponent(modelId: string): Component | null {
  return drawingComponents[modelId] ?? null
}
