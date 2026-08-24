import { createRouter, createWebHistory } from 'vue-router'
import { adminRoutes } from './routes'
import { isLoggedIn } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: adminRoutes,
})

const WHITE_LIST = ['/login']

router.beforeEach((to, _from, next) => {
  const logged = isLoggedIn()
  // 已登录访问登录页 → 回首页
  if (to.path === '/login' && logged) {
    next({ path: '/dashboard' })
    return
  }
  // 未登录且不在白名单 → 登录页（携带 redirect）
  if (!WHITE_LIST.includes(to.path) && !logged) {
    next({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} })
    return
  }
  next()
})

export default router
