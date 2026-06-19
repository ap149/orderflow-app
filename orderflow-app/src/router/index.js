import { createRouter, createWebHistory } from 'vue-router'
import OrderflowView from '../views/OrderflowView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/orderflow' },
    { path: '/orderflow', component: OrderflowView },
  ],
})

export default router
