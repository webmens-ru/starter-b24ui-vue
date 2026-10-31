import { defineComponent, h, type Component } from 'vue'
import BaseWicketDrawing from './BaseWicketDrawing.vue'

import Type2Drawing from './type2/Type2Drawing.vue'
import Type1Drawing from './type1/Type1Drawing.vue'
import Type3Drawing from './type3/Type3Drawing.vue'
import Type4Drawing from './type4/Type4Drawing.vue'
import Type5Drawing from './type5/Type5Drawing.vue'
import Type6Drawing from './type6/Type6Drawing.vue'
import Type7Drawing from './type7/Type7Drawing.vue'
import Type8Drawing from './type8/Type8Drawing.vue'
import Type9Drawing from './type9/Type9Drawing.vue'

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
  '5': Type5Drawing,
  '6': Type6Drawing,
  '7': Type7Drawing,
  '8': Type8Drawing,
  '9': Type9Drawing,
  '10': baseDrawing(60),
  '11': baseDrawing(60),
}

export function resolveDrawingComponent(modelId: string): Component | null {
  return drawingComponents[modelId] ?? null
}
