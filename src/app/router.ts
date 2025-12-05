import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"
import Main from "../pages/Main.vue"
import Form from "../pages/Form.vue"
import FormFurniture from "../pages/FormFurniture.vue"

const routes: RouteRecordRaw[] = [
  { path: '/', component: Main },
  { path: '/form', component: Form },
  { path: '/formfurniture', component: FormFurniture },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})