// ===== 入会大礼包 /api/v1/gift-packages =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, notFound } from '../utils/response.js'
import { now } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'

const router = Router()
router.use(requireAuth)

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
    const r = run(
      'INSERT INTO gift_package (name, spu_id, price, level, status, create_time, update_time) VALUES (?, ?, ?, ?, 1, ?, ?)',
      body.name, body.spuId, body.price, body.level, now(), now(),
    )
    const pid = Number(r.lastInsertRowid)
    for (const it of body.items || []) {
      run('INSERT INTO gift_package_item (package_id, sku_id, sku_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        pid, it.skuId, it.skuName, it.quantity, it.unitPrice)
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
    run('UPDATE gift_package SET name = ?, price = ?, level = ?, status = ?, update_time = ? WHERE id = ?',
      body.name ?? cur.name, body.price ?? cur.price, body.level ?? cur.level, body.status ?? cur.status, now(), id)
    if (body.items) {
      run('DELETE FROM gift_package_item WHERE package_id = ?', id)
      for (const it of body.items) {
        run('INSERT INTO gift_package_item (package_id, sku_id, sku_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
          id, it.skuId, it.skuName, it.quantity, it.unitPrice)
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
    run('DELETE FROM gift_package_item WHERE package_id = ?', id)
    run('DELETE FROM gift_package WHERE id = ?', id)
    ok(res, null, '已删除')
  } catch (e) { next(e) }
})

export default router
