/**
 * 登录态管理（localStorage 持久化）
 */
import type { AdminUser } from '@/api'

const TOKEN_KEY = 'shop_os_admin_token'
const USER_KEY = 'shop_os_admin_user'
const PERM_KEY = 'shop_os_admin_permissions'

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

/** 当前用户权限码数组；null 表示超管/全部权限 */
export const getPermissions = (): string[] | null => {
  const raw = localStorage.getItem(PERM_KEY)
  if (!raw) return null
  try {
    const arr = JSON.parse(raw) as string[]
    return Array.isArray(arr) ? arr : null
  } catch {
    return null
  }
}

export const setAuth = (token: string, user: AdminUser, permissions?: string[] | null) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  if (permissions === null) {
    localStorage.removeItem(PERM_KEY) // null = 超管，全部权限
  } else {
    localStorage.setItem(PERM_KEY, JSON.stringify(permissions || []))
  }
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(PERM_KEY)
}

export const isLoggedIn = (): boolean => !!getToken()
