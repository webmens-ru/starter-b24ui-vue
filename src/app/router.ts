import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"
import Main from "../pages/Main.vue"
import Form from "../pages/Form.vue"
import Wicket from "../pages/wicket/Type1.vue"

const routes: RouteRecordRaw[] = [
  { path: '/', component: Main },
  { path: '/form', component: Form },
  { path: '/wicket/type1', component: Wicket },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})