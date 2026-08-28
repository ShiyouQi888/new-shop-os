/**
 * 设计令牌 (Design Tokens)
 * 全局标准化设计变量，供 admin 和 shop 共用
 */

/** 品牌色 */
export const colors = {
  // 主色 - 商城红（涨/促销/品牌）
  primary: '#e54d42',
  primaryHover: '#ed6f5a',
  primaryActive: '#c9362f',
  primaryLight: '#fef0ef',
  primaryDisabled: '#f5b5b0',

  // 辅助色
  secondary: '#f37b1d',       // 橙色 - 强调/活动
  secondaryLight: '#fdf6ec',

  // 等级色 - 代理商体系
  goldCard: '#d4a851',         // 金卡
  goldCardLight: '#fbf3e0',
  silverCard: '#9a9a9a',       // 银卡
  silverCardLight: '#f2f2f2',

  // 功能色
  success: '#39b54a',          // 绿色 - 完成/可提现/跌
  successLight: '#f0fff2',
  warning: '#fbbd08',          // 黄色 - 警告/待处理
  warningLight: '#fff9e6',
  danger: '#e54d42',            // 红色 - 危险/错误/涨
  dangerLight: '#fef0ef',
  info: '#909399',              // 灰色 - 信息
  infoLight: '#f4f4f5',

  // 中性色
  textPrimary: '#303133',
  textRegular: '#606266',
  textSecondary: '#909399',
  textPlaceholder: '#c0c4cc',
  textDisabled: '#c0c4cc',
  border: '#dcdfe6',
  borderLight: '#e4e7ed',
  borderLighter: '#ebeef5',
  borderExtraLight: '#f2f6fc',

  // 背景色
  bgPage: '#f5f5f5',
  bgCard: '#ffffff',
  bgOverlay: 'rgba(0, 0, 0, 0.5)',
  bgMask: 'rgba(0, 0, 0, 0.7)',

  // 特殊
  priceRed: '#e54d42',          // 价格红
  priceGreen: '#39b54a',         // 价格绿
  tagBlue: '#409eff',
} as const

/** 间距系统 - 4px 基准 */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '20px',
  xl: '24px',
  xxl: '32px',
  xxxl: '40px',
} as const

/** 圆角 */
export const radius = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  round: '999px',
  circle: '50%',
} as const

/** 字体 */
export const fontSize = {
  xs: '10px',
  sm: '12px',
  base: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
  xxl: '24px',
  xxxl: '30px',
} as const

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

/** 行高 */
export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const

/** 阴影 */
export const shadow = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.06)',
  base: '0 2px 8px rgba(0, 0, 0, 0.08)',
  md: '0 4px 12px rgba(0, 0, 0, 0.10)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  xl: '0 12px 32px rgba(0, 0, 0, 0.16)',
} as const

/** 过渡动画 */
export const transition = {
  fast: '0.15s ease',
  base: '0.25s ease',
  slow: '0.35s ease',
} as const

/**
 * 商城前台主题预设：内置配色方案，后台可切换，写入 system_config 的 site.theme 后
 * 前台在 utils/site.ts 里读取并通过 CSS 变量 + 响应式对象实时应用（无需重新构建/发版）。
 */
export interface ShopTheme {
  id: string
  name: string
  /** 主色 */
  primary: string
  /** 主色（深），用于渐变/强调价格等 */
  primaryDark: string
  /** 主色浅色底（徽标/标签背景等） */
  primaryLight: string
  /** 主色浅色边框 */
  primaryBorder: string
}

export const SHOP_THEMES: ShopTheme[] = [
  { id: 'orange', name: '橘意暖阳', primary: '#FF6B35', primaryDark: '#E85222', primaryLight: '#FFF1EB', primaryBorder: '#FFD5C5' },
  { id: 'blue', name: '海洋蓝', primary: '#1677FF', primaryDark: '#0E4FA8', primaryLight: '#EAF3FF', primaryBorder: '#BFDBFF' },
  { id: 'green', name: '森林绿', primary: '#18A66A', primaryDark: '#0E7A4D', primaryLight: '#EAFBF3', primaryBorder: '#BEEBD3' },
  { id: 'purple', name: '至尊紫', primary: '#7C3AED', primaryDark: '#5B21B6', primaryLight: '#F3EBFF', primaryBorder: '#DDC6FA' },
]

export const DEFAULT_SHOP_THEME = 'orange'

export function getShopTheme(id: string | undefined | null): ShopTheme {
  return SHOP_THEMES.find(t => t.id === id) || SHOP_THEMES.find(t => t.id === DEFAULT_SHOP_THEME)!
}

/** z-index 层级 */
export const zIndex = {
  base: 1,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  overlay: 500,
  modal: 700,
  toast: 800,
} as const

/** CSS 变量注入 - 供全局使用 */
export function generateCSSVariables(): string {
  const entries: string[] = []

  const flatten = (prefix: string, obj: Record<string, string>) => {
    for (const [key, value] of Object.entries(obj)) {
      entries.push(`  --sf-${prefix}-${key}: ${value};`)
    }
  }

  flatten('color', colors)
  flatten('space', spacing)
  flatten('radius', radius)
  flatten('font-size', fontSize)
  flatten('shadow', shadow)

  return `:root {\n${entries.join('\n')}\n}`
}
