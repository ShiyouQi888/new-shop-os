/**
 * 站点品牌配置缓存（Logo/图标）：全局单例，避免多个组件重复请求
 * 未配置时使用内置默认资源（/logo.png、/icon.png）
 */
import { reactive } from 'vue'
import { apiConfig } from '@/api'

export const siteBranding = reactive({
  logo: '',
  icon: '',
  name: '',
})

let pending: Promise<void> | null = null

/** 加载站点品牌配置（幂等，重复调用复用同一次请求） */
export const ensureSiteBranding = (): Promise<void> => {
  if (!pending) {
    pending = apiConfig.getSiteConfig()
      .then((data) => {
        siteBranding.logo = data.logo || ''
        siteBranding.icon = data.icon || ''
        siteBranding.name = data.name || ''
      })
      .catch(() => { /* 加载失败时保持默认资源 */ })
  }
  return pending
}
