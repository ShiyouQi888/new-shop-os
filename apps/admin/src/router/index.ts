import { createRouter, createWebHistory } from 'vue-router'
import { adminRoutes } from './routes'
import { isLoggedIn, getPermissions } from '@/utils/auth'

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
  // 权限校验：超管（permissions=null）或拥有对应权限码才放行
  if (logged && to.meta?.permission) {
    const perms = getPermissions()
    if (perms !== null && !perms.includes(to.meta.permission as string)) {
      next({ path: '/dashboard' })
      return
    }
  }
  next()
})

export default router
