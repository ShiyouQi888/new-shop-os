/**
 * 站点品牌配置缓存（名称/Logo/图标/主题）：全局单例，避免多个组件重复请求
 * 未配置时使用内置默认资源（/logo.png、/icon.png）与默认主题
 */
import { reactive } from 'vue'
import { api } from '@/api'
import { getShopTheme, DEFAULT_SHOP_THEME } from '@shop-os/shared'

export const siteBranding = reactive({
  logo: '',
  icon: '',
  name: '',
  theme: DEFAULT_SHOP_THEME,
})

/** 当前主题色值：CSS 变量覆盖不了 Vant 组件的 color/indicator-color 等模板 Prop，
 *  这些地方直接引用这个响应式对象（如 :color="currentTheme.primary"）。 */
const defaultTheme = getShopTheme(DEFAULT_SHOP_THEME)
export const currentTheme = reactive({
  primary: defaultTheme.primary,
  primaryDark: defaultTheme.primaryDark,
  primaryLight: defaultTheme.primaryLight,
  primaryBorder: defaultTheme.primaryBorder,
  onPrimary: defaultTheme.onPrimary,
  dark: !!defaultTheme.dark,
})

const applySiteIdentity = () => {
  const name = siteBranding.name.trim() || '橙选商城'
  document.title = name

  let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!iconLink) {
    iconLink = document.createElement('link')
    iconLink.rel = 'icon'
    document.head.append(iconLink)
  }
  const iconUrl = new URL(siteBranding.icon || '/icon.png', window.location.href)
  if (siteBranding.icon) iconUrl.searchParams.set('_brand_revision', String(Date.now()))
  iconLink.href = iconUrl.toString()

  let applicationName = document.querySelector<HTMLMetaElement>('meta[name="application-name"]')
  if (!applicationName) {
    applicationName = document.createElement('meta')
    applicationName.name = 'application-name'
    document.head.append(applicationName)
  }
  applicationName.content = name
}

const hexToRgbTriple = (hex: string): string => {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) || 0
  const g = parseInt(m.slice(2, 4), 16) || 0
  const b = parseInt(m.slice(4, 6), 16) || 0
  return `${r}, ${g}, ${b}`
}

/** 应用主题：同步更新 currentTheme（供模板/JS 直接引用）与根级 CSS 变量（供样式表里的 var() 引用） */
export function applyTheme(themeId: string) {
  const theme = getShopTheme(themeId)
  currentTheme.primary = theme.primary
  currentTheme.primaryDark = theme.primaryDark
  currentTheme.primaryLight = theme.primaryLight
  currentTheme.primaryBorder = theme.primaryBorder
  currentTheme.onPrimary = theme.onPrimary
  currentTheme.dark = !!theme.dark

  const root = document.documentElement.style
  root.setProperty('--color-primary', theme.primary)
  root.setProperty('--color-primary-dark', theme.primaryDark)
  root.setProperty('--color-primary-rgb', hexToRgbTriple(theme.primary))
  root.setProperty('--color-primary-light', theme.primaryLight)
  root.setProperty('--color-primary-border', theme.primaryBorder)
  root.setProperty('--color-on-primary', theme.onPrimary)
  root.setProperty('--bg-page', theme.surfacePage)
  root.setProperty('--bg-card', theme.surfaceCard)
  root.setProperty('--bg-muted', theme.surfaceMuted)
  root.setProperty('--text-primary', theme.textPrimary)
  root.setProperty('--text-secondary', theme.textSecondary)
  root.setProperty('--text-regular', theme.textSecondary)
  root.setProperty('--text-placeholder', theme.textPlaceholder)
  root.setProperty('--border-color', theme.borderColor)

  document.documentElement.classList.toggle('van-theme-dark', !!theme.dark)
}

let pending: Promise<void> | null = null

/** 加载站点品牌配置；并发调用复用请求，后续调用会重新读取后台配置 */
export const ensureSiteBranding = (): Promise<void> => {
  if (!pending) {
    pending = api.getSiteConfig()
      .then((data) => {
        siteBranding.logo = data.logo || ''
        siteBranding.icon = data.icon || ''
        siteBranding.name = data.name || ''
        siteBranding.theme = data.theme || DEFAULT_SHOP_THEME
        applyTheme(siteBranding.theme)
        applySiteIdentity()
      })
      .catch(() => { /* 加载失败时保持默认资源与默认主题 */ })
      .finally(() => { pending = null })
  }
  return pending
}

export const refreshSiteBranding = ensureSiteBranding
