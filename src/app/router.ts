import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"
import Main from "../pages/Main.vue"
import Form from "../pages/Form.vue"
import FormBaseProductRow from "../pages/FormBaseProductRow.vue"

const routes: RouteRecordRaw[] = [
  { path: '/', component: Main },
  { path: '/form', component: Form },
  { path: '/formBaseProductRow', component: FormBaseProductRow },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})