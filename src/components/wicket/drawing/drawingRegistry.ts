import { defineComponent, h, type Component } from 'vue'
import BaseWicketDrawing from './BaseWicketDrawing.vue'

import Type2Drawing from './type2/Type2Drawing.vue'
import Type1Drawing from './type1/Type1Drawing.vue'
import Type3Drawing from './type3/Type3Drawing.vue'
import Type4Drawing from './type4/Type4Drawing.vue'

function baseDrawing(profileSize: 50 | 60): Component {
  return defineComponent({
    setup: () => () => h(BaseWicketDrawing, { profileSize }),
  })
}

const drawingComponents: Record<string, Component> = {
  '1': Type1Drawing,
  '2': Type2Drawing,
  '3': Type3Drawing,
  '4': Type4Drawing,
  '5': baseDrawing(50),
  '6': baseDrawing(60),
  '7': baseDrawing(60),
  '8': baseDrawing(60),
  '9': baseDrawing(50),
  '10': baseDrawing(60),
  '11': baseDrawing(60),
}

export function resolveDrawingComponent(modelId: string): Component | null {
  return drawingComponents[modelId] ?? null
}
