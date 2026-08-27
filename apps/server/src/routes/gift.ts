// ===== 入会大礼包 /api/v1/gift-packages =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { now, money } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'

const router = Router()
router.use(requireAuth)

type GiftItemInput = { skuId: number; skuName: string; quantity: number; unitPrice: number }

/**
 * 创建/编辑礼包时校验 spuId 与每个 skuId 都存在且未下架，避免配置错误的礼包在购买时才报错、且后台完全看不出问题。
 * 注意：spuId 只是礼包的封面/展示商品，礼包实际打包的 SKU（items[].skuId）允许来自任意商品，与 spuId 无归属关系
 * （与实际购买校验 apps/server/src/routes/shop.ts 的语义保持一致，不能额外要求 sku.spu_id === spuId）。
 */
function assertGiftReferencesValid(spuId: number, items: GiftItemInput[]) {
  if (!get('SELECT id FROM product_spu WHERE id = ? AND status = 1', spuId)) throw badRequest(`商品 spuId=${spuId} 不存在或已下架`)
  for (const it of items) {
    if (!get('SELECT id FROM product_sku WHERE id = ? AND status = 1', it.skuId)) {
      throw badRequest(`礼包内 SKU ${it.skuId}（${it.skuName}）不存在或已下架`)
    }
  }
}

/** GET /gift-packages */
router.get('/', (_req, res, next) => {
  try {
    const pkgs = all<{ id: number; name: string; spuId: number; price: number; level: number; status: number; createTime: string; levelName: string | null }>(`
      SELECT g.id, g.name, g.spu_id AS spuId, g.price, g.level, g.status, g.create_time AS createTime,
             l.level_name AS levelName
      FROM gift_package g LEFT JOIN level_config l ON l.level = g.level
      ORDER BY g.id
    `)
    const items = all<{ id: number; packageId: number; skuId: number; skuName: string; quantity: number; unitPrice: number }>(
      'SELECT id, package_id AS packageId, sku_id AS skuId, sku_name AS skuName, quantity, unit_price AS unitPrice FROM gift_package_item',
    )
    const itemMap = new Map<number, typeof items>()
    items.forEach((it) => {
      const list = itemMap.get(it.packageId) || []
      list.push(it)
      itemMap.set(it.packageId, list)
    })
    const result = pkgs.map((p) => ({ ...p, items: itemMap.get(p.id) || [] }))
    ok(res, result)
  } catch (e) { next(e) }
})

/** POST /gift-packages 新增 */
router.post('/', requirePermission('gift:edit'), (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(40),
      spuId: z.number().int(),
      price: z.number().min(0),
      level: z.number().int().min(1),
      items: z.array(z.object({
        skuId: z.number().int(), skuName: z.string(), quantity: z.number().int().min(1), unitPrice: z.number().min(0),
      })).optional(),
    }).parse(req.body)
    assertGiftReferencesValid(body.spuId, body.items || [])
    const r = run(
      'INSERT INTO gift_package (name, spu_id, price, level, status, create_time, update_time) VALUES (?, ?, ?, ?, 1, ?, ?)',
      body.name, body.spuId, money(body.price), body.level, now(), now(),
    )
    const pid = Number(r.lastInsertRowid)
    for (const it of body.items || []) {
      run('INSERT INTO gift_package_item (package_id, sku_id, sku_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        pid, it.skuId, it.skuName, it.quantity, money(it.unitPrice))
    }
    ok(res, { id: pid }, '礼包已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /gift-packages/:id 编辑（整体替换 items） */
router.put('/:id', requirePermission('gift:edit'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM gift_package WHERE id = ?', id)) throw notFound('礼包不存在')
    const body = z.object({
      name: z.string().min(1).max(40).optional(),
      price: z.number().min(0).optional(),
      level: z.number().int().min(1).optional(),
      status: z.number().int().min(0).max(1).optional(),
      items: z.array(z.object({
        skuId: z.number().int(), skuName: z.string(), quantity: z.number().int().min(1), unitPrice: z.number().min(0),
      })).optional(),
    }).parse(req.body)
    const cur = get<Record<string, unknown>>('SELECT * FROM gift_package WHERE id = ?', id)!
    if (body.items) assertGiftReferencesValid(Number(cur.spuId), body.items)
    run('UPDATE gift_package SET name = ?, price = ?, level = ?, status = ?, update_time = ? WHERE id = ?',
      body.name ?? cur.name, body.price !== undefined ? money(body.price) : cur.price, body.level ?? cur.level, body.status ?? cur.status, now(), id)
    if (body.items) {
      run('DELETE FROM gift_package_item WHERE package_id = ?', id)
      for (const it of body.items) {
        run('INSERT INTO gift_package_item (package_id, sku_id, sku_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
          id, it.skuId, it.skuName, it.quantity, money(it.unitPrice))
      }
    }
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** PATCH /gift-packages/:id/status 上架/停售 */
router.patch('/:id/status', requirePermission('gift:edit'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM gift_package WHERE id = ?', id)) throw notFound('礼包不存在')
    const status = z.object({ status: z.number().int().min(0).max(1) }).parse(req.body).status
    run('UPDATE gift_package SET status = ?, update_time = ? WHERE id = ?', status, now(), id)
    ok(res, null, status ? '已上架' : '已停售')
  } catch (e) { next(e) }
})

/** DELETE /gift-packages/:id */
router.delete('/:id', requirePermission('gift:edit'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM gift_package WHERE id = ?', id)) throw notFound('礼包不存在')
    run('DELETE FROM gift_package_item WHERE package_id = ?', id)
    run('DELETE FROM gift_package WHERE id = ?', id)
    ok(res, null, '已删除')
  } catch (e) { next(e) }
})

export default router
