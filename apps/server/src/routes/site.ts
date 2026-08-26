// ===== 站点品牌配置 /api/v1/site（公开：登录前/无鉴权场景读取 Logo、图标、站点名） =====
import { Router } from 'express'
import { all } from '../db/index.js'
import { ok } from '../utils/response.js'

const router = Router()

/** GET /site/config */
router.get('/config', (_req, res, next) => {
  try {
    const rows = all<{ key: string; value: string }>(
      "SELECT config_key AS key, config_value AS value FROM system_config WHERE config_key IN ('site.name', 'site.logo', 'site.icon')",
    )
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
    ok(res, {
      name: map['site.name'] || '',
      logo: map['site.logo'] || '',
      icon: map['site.icon'] || '',
    })
  } catch (e) { next(e) }
})

export default router
