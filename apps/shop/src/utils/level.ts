/**
 * 商城端等级名称映射：以 /shop/levels（等级权益配置）为权威来源，
 * 未配置时回退 shared MemberLevelLabels（0/1/2）。
 * LevelBadge 挂载时自动 ensureLevelMap()，保证多等级（铂金/钻石）显示真实名称。
 */
import { api } from '@/api'
import { MemberLevel, MemberLevelLabels } from '@shop-os/shared'

const map = new Map<number, string>()
let loading: Promise<void> | null = null

export const getLevelName = (level: number): string =>
  map.get(level) || MemberLevelLabels[level as MemberLevel] || ''

/** 幂等加载等级映射（模块级单次请求） */
export const ensureLevelMap = (): Promise<void> => {
  if (!loading) {
    loading = api.getLevels()
      .then((list) => list.forEach((l) => map.set(Number(l.level), String(l.levelName))))
      .catch(() => { /* 静默：回退枚举 */ })
  }
  return loading
}

export { MemberLevel }
