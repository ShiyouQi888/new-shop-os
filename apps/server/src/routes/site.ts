// ===== 站点品牌配置 /api/v1/site（公开：登录前/无鉴权场景读取 Logo、图标、站点名、主题） =====
import { Router } from 'express'
import { all } from '../db/index.js'
import { ok } from '../utils/response.js'

const router = Router()
// 需与 packages/shared/src/tokens/index.ts 的 DEFAULT_SHOP_THEME 保持一致
const DEFAULT_SHOP_THEME = 'orange'

/** GET /site/config */
router.get('/config', (_req, res, next) => {
  try {
    const rows = all<{ key: string; value: string }>(
      "SELECT config_key AS key, config_value AS value FROM system_config WHERE config_key IN ('site.name', 'site.logo', 'site.icon', 'site.theme')",
    )
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
    ok(res, {
      name: map['site.name'] || '',
      logo: map['site.logo'] || '',
      icon: map['site.icon'] || '',
      theme: map['site.theme'] || DEFAULT_SHOP_THEME,
    })
  } catch (e) { next(e) }
})

export default router
