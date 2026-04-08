import { createRouter, createWebHistory, createMemoryHistory, type RouteRecordRaw } from "vue-router"
import Main from "../pages/Main.vue"
import Form from "../pages/Form.vue"
import AddProduct from "../pages/AddProduct.vue"
import WicketModel from "../pages/wicket/WicketModel.vue"
import WicketType1 from "../pages/wicket/Type1.vue"
import WicketType2 from "../pages/wicket/Type2.vue"
import SwingGatesType1 from "../pages/swing-gates/Type1.vue"

const routes: RouteRecordRaw[] = [
  { path: '/', component: Main },
  { path: '/form', component: Form },
  { path: '/add-product', component: AddProduct },
  { path: '/wicket/model', component: WicketModel },
  { path: '/wicket/type1', component: WicketType1 },
  { path: '/wicket/type2', component: WicketType2 },
  { path: '/wicket/type3', component: WicketType1 },
  { path: '/wicket/type4', component: WicketType1 },
  { path: '/wicket/type5', component: WicketType1 },
  { path: '/wicket/type7', component: WicketType1 },
  { path: '/wicket/type8', component: WicketType1 },
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
