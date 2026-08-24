/**
 * 登录态管理（localStorage 持久化）
 */
import type { AdminUser } from '@/api'

const TOKEN_KEY = 'shop_os_admin_token'
const USER_KEY = 'shop_os_admin_user'

export const getToken = (): string => localStorage.getItem(TOKEN_KEY) || ''

export const getUser = (): AdminUser | null => {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    return null
  }
}

export const setAuth = (token: string, user: AdminUser) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const isLoggedIn = (): boolean => !!getToken()
