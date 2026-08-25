/**
 * 等级名称映射：以等级权益配置（后端 level_config）为权威来源，
 * 未配置时回退到 shared 的 MemberLevelLabels（0/1/2 三档）。
 * 页面加载等级配置后调用 setLevelMap/loadLevelMap 填充缓存，
 * SfLevelTag 等徽章组件即可显示「钻石代理商」而非 Lv.4。
 */
import { apiConfig } from '@/api'
import { MemberLevel, MemberLevelLabels } from '@shop-os/shared'

const map = new Map<number, string>()

export interface LevelNameItem {
  level: number
  levelName: string
}

export const setLevelMap = (list: LevelNameItem[]) => {
  list.forEach((l) => map.set(l.level, l.levelName))
}

export const loadLevelMap = async () => {
  try {
    const list = await apiConfig.getLevelConfigs()
    setLevelMap(list)
  } catch {
    /* 静默：失败时回退枚举标签 */
  }
}

export const getLevelName = (level: number): string =>
  map.get(level) || MemberLevelLabels[level as MemberLevel] || ''

export { MemberLevel }
