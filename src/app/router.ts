import { createRouter, createWebHistory, createMemoryHistory, type RouteRecordRaw } from "vue-router"
import Main from "../pages/Main.vue"
import Form from "../pages/Form.vue"
import AddProduct from "../pages/AddProduct.vue"
import WicketModel from "../pages/wicket/WicketModel.vue"
import WicketType1 from "../pages/wicket/Type1.vue"
import WicketType2 from "../pages/wicket/Type2.vue"
import WicketType3 from "../pages/wicket/Type3.vue"
import WicketType4 from "../pages/wicket/Type4.vue"
import WicketType5 from "../pages/wicket/Type5.vue"
import WicketType6 from "../pages/wicket/Type6.vue"
import WicketType7 from "../pages/wicket/Type7.vue"
import WicketType8 from "../pages/wicket/Type8.vue"
import WicketType9 from "../pages/wicket/Type9.vue"
import WicketType10 from "../pages/wicket/Type10.vue"
import WicketType11 from "../pages/wicket/Type11.vue"
import SwingGatesType1 from "../pages/swing-gates/Type1.vue"

const routes: RouteRecordRaw[] = [
  { path: '/', component: Main },
  { path: '/form', component: Form },
  { path: '/add-product', component: AddProduct },
  { path: '/wicket/model', component: WicketModel },
  { path: '/wicket/type1', component: WicketType1 },
  { path: '/wicket/type2', component: WicketType2 },
  { path: '/wicket/type3', component: WicketType3 },
  { path: '/wicket/type4', component: WicketType4 },
  { path: '/wicket/type5', component: WicketType5 },
  { path: '/wicket/type6', component: WicketType6 },
  { path: '/wicket/type7', component: WicketType7 },
  { path: '/wicket/type8', component: WicketType8 },
  { path: '/wicket/type9', component: WicketType9 },
  { path: '/wicket/type10', component: WicketType10 },
  { path: '/wicket/type11', component: WicketType11 },
  { path: '/swing-gates/type1', component: SwingGatesType1 },
]

export const router = createRouter({
  history: import.meta.env.DEV ? createWebHistory() : createMemoryHistory(),
  routes,
})

router.beforeEach((to, from) => {
  console.log(`[router] ${from.fullPath} → ${to.fullPath}`)
})

router.onError((error) => {
  console.error('[router] error:', error)
})
