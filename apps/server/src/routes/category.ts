// ===== 商品分类 /api/v1/categories =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, badRequest, notFound, conflict } from '../utils/response.js'
import { int, now } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'

const router = Router()
router.use(requireAuth)

/** GET /categories 分类树 */
router.get('/', (_req, res, next) => {
  try {
    const list = all(
      `SELECT c.id, c.name, c.parent_id AS parentId, c.icon, c.sort, c.is_gift_zone AS isGiftZone, c.status,
              (SELECT COUNT(*) FROM product_spu p WHERE p.category_id = c.id) AS productCount
       FROM category c ORDER BY c.sort, c.id`,
    )
    const roots = list.filter((c) => c.parentId === 0).map((root) => ({ ...root, children: list.filter((c) => c.parentId === root.id) }))
    ok(res, roots)
  } catch (e) { next(e) }
})

/** POST /categories 新增 */
router.post('/', requirePermission('category:edit'), (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(20),
      parentId: z.number().int().min(0).optional(),
      icon: z.string().max(30).optional(),
      sort: z.number().int().min(0).optional(),
      isGiftZone: z.boolean().optional(),
    }).parse(req.body)
    if (body.parentId) {
      const parent = get<{ parentId: number }>('SELECT parent_id AS parentId FROM category WHERE id = ?', body.parentId)
      if (!parent) throw notFound('上级分类不存在')
      // 当前分类树只有两层：根分类 + 直接子分类；挂在非根分类下会在所有树形视图里都不可见
      if (Number(parent.parentId) !== 0) throw badRequest('上级分类必须是根分类，不支持三级及以上嵌套')
    }
    const r = run(
      'INSERT INTO category (name, parent_id, icon, sort, is_gift_zone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      body.name, body.parentId || 0, body.icon || 'folder', body.sort ?? 0, body.isGiftZone ? 1 : 0, now(), now(),
    )
    ok(res, { id: Number(r.lastInsertRowid) }, '分类已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /categories/:id 编辑 */
router.put('/:id', requirePermission('category:edit'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const cat = get('SELECT * FROM category WHERE id = ?', id)
    if (!cat) throw notFound('分类不存在')
    const body = z.object({
      name: z.string().min(1).max(20).optional(),
      icon: z.string().max(30).optional(),
      sort: z.number().int().min(0).optional(),
      isGiftZone: z.boolean().optional(),
      status: z.number().int().min(0).max(1).optional(),
    }).parse(req.body)
    if (cat.isGiftZone === 1 && body.status === 0) throw badRequest('入会专区不可停用')
    run(
      'UPDATE category SET name = ?, icon = ?, sort = ?, is_gift_zone = ?, status = ?, updated_at = ? WHERE id = ?',
      body.name ?? cat.name, body.icon ?? cat.icon, body.sort ?? cat.sort,
      body.isGiftZone !== undefined ? (body.isGiftZone ? 1 : 0) : cat.isGiftZone,
      body.status ?? cat.status, now(), id,
    )
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** DELETE /categories/:id 删除（级联删除子分类，商品置空） */
router.delete('/:id', requirePermission('category:edit'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const cat = get('SELECT * FROM category WHERE id = ?', id)
    if (!cat) throw notFound('分类不存在')
    if (cat.isGiftZone === 1) throw badRequest('入会专区不可删除，如需调整请先在编辑中处理')
    const children = all('SELECT id FROM category WHERE parent_id = ?', id)
    const ids = [id, ...children.map((c) => c.id)]
    run(`UPDATE product_spu SET category_id = NULL WHERE category_id IN (${ids.map(() => '?').join(',')})`, ...ids)
    run(`DELETE FROM category WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
    ok(res, null, '已删除')
  } catch (e) { next(e) }
})

export default router
