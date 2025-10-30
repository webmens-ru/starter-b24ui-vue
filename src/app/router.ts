import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"
import Main from "../pages/Main.vue"
import Form from "../pages/Form.vue"

const routes: RouteRecordRaw[] = [
  { path: '/', component: Main },
  { path: '/form', component: Form },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})