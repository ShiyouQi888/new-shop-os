// ===== 商品管理 /api/v1/products =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run, paginate, transaction } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, int, str, parseJson, now, uniqueNumbers, money } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'

const router = Router()
router.use(requireAuth)

/** GET /products?page=&pageSize=&keyword=&categoryId=&status= */
router.get('/', requirePermission('product:view'), async (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const keyword = str(req.query.keyword)
    const categoryId = req.query.categoryId === undefined || req.query.categoryId === '' ? null : int(req.query.categoryId)
    const status = req.query.status === undefined || req.query.status === '' ? null : int(req.query.status)

    const conds: string[] = []
    const params: (string | number)[] = []
    if (keyword) { conds.push('p.name LIKE ?'); params.push(`%${keyword}%`) }
    if (categoryId !== null) {
      // 含子分类
      const subIds = ((await all<{ id: number }>('SELECT id FROM category WHERE parent_id = ?', categoryId))).map((c) => c.id)
      conds.push(`p.category_id IN (${[categoryId, ...subIds].map(() => '?').join(',')})`)
      params.push(categoryId, ...subIds)
    }
    if (status !== null) { conds.push('p.status = ?'); params.push(status) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const data = (await paginate<Record<string, unknown> & { id: number }>(
      `SELECT p.*, c.name AS categoryName FROM product_spu p LEFT JOIN category c ON c.id = p.category_id ${where} ORDER BY p.sort, p.id DESC`,
      `SELECT COUNT(*) AS c FROM product_spu p ${where}`,
      params, page, pageSize,
    ))
    // 附带 SKU 数/总库存
    const skuStats = (await all('SELECT spu_id AS spuId, COUNT(*) AS skuCount, COALESCE(SUM(stock),0) AS totalStock FROM product_sku GROUP BY spu_id'))
    const statMap = new Map(skuStats.map((s) => [s.spuId, s]))
    data.list.forEach((p) => { const st = statMap.get(p.id); p.skuCount = st?.skuCount ?? 0; p.totalStock = st?.totalStock ?? 0; p.images = parseJson(p.images, []) })
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /products/:id 详情（含 SKU） */
router.get('/:id', requirePermission('product:view'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const spu = (await get('SELECT * FROM product_spu WHERE id = ?', id))
    if (!spu) throw notFound('商品不存在')
    spu.images = parseJson(spu.images, [])
    const skus = ((await all(
      'SELECT id, spu_id AS spuId, sku_name AS skuName, spec_info AS specInfo, price, market_price AS marketPrice, cost_price AS costPrice, stock, sales, image, status FROM product_sku WHERE spu_id = ? ORDER BY id',
      id,
    ))).map((s) => ({ ...s, specInfo: parseJson(s.specInfo, {}) }))
    ok(res, { ...spu, skus })
  } catch (e) { next(e) }
})

/** POST /products 新增 SPU */
router.post('/', requirePermission('product:edit'), async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(60),
      categoryId: z.number().optional().nullable(),
      mainImage: z.string().optional(),
      images: z.array(z.string()).optional(),
      description: z.string().optional(),
      isGiftPackage: z.boolean().optional(),
      isMonthlyProduct: z.boolean().optional(),
      excludeDiscount: z.boolean().optional(),
      sort: z.number().optional(),
    }).parse(req.body)
    const r = (await run(
      `INSERT INTO product_spu (name, category_id, main_image, images, description, is_gift_package, is_monthly_product, exclude_discount, status, sort, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      body.name, body.categoryId ?? null, body.mainImage || '', JSON.stringify(body.images || []),
      body.description || '', body.isGiftPackage ? 1 : 0, body.isMonthlyProduct ? 1 : 0,
      body.excludeDiscount ? 1 : 0, body.sort ?? 0, now(), now(),
    ))
    ok(res, { id: Number(r.lastInsertRowid) }, '商品已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /products/:id 编辑 */
router.put('/:id', requirePermission('product:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const spu = (await get('SELECT * FROM product_spu WHERE id = ?', id))
    if (!spu) throw notFound('商品不存在')
    const body = z.object({
      name: z.string().min(1).max(60).optional(),
      categoryId: z.number().optional().nullable(),
      mainImage: z.string().optional(),
      images: z.array(z.string()).optional(),
      description: z.string().optional(),
      isGiftPackage: z.boolean().optional(),
      isMonthlyProduct: z.boolean().optional(),
      excludeDiscount: z.boolean().optional(),
      status: z.number().min(0).max(1).optional(),
      sort: z.number().optional(),
    }).parse(req.body)
    await run(
      `UPDATE product_spu SET name = ?, category_id = ?, main_image = ?, images = ?, description = ?,
        is_gift_package = ?, is_monthly_product = ?, exclude_discount = ?, status = ?, sort = ?, update_time = ? WHERE id = ?`,
      body.name ?? spu.name, body.categoryId !== undefined ? body.categoryId : spu.categoryId,
      body.mainImage ?? spu.mainImage, body.images ? JSON.stringify(body.images) : spu.images,
      body.description ?? spu.description,
      body.isGiftPackage !== undefined ? (body.isGiftPackage ? 1 : 0) : spu.isGiftPackage,
      body.isMonthlyProduct !== undefined ? (body.isMonthlyProduct ? 1 : 0) : spu.isMonthlyProduct,
      body.excludeDiscount !== undefined ? (body.excludeDiscount ? 1 : 0) : spu.excludeDiscount,
      body.status ?? spu.status, body.sort ?? spu.sort, now(), id,
    )
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** PATCH /products/status 批量上下架（body: { ids, status }） */
router.patch('/status', requirePermission('product:edit'), async (req, res, next) => {
  try {
    const body = z.object({ ids: z.array(z.number().int()).min(1), status: z.number().int().min(0).max(1) }).parse(req.body)
    await run(`UPDATE product_spu SET status = ?, update_time = ? WHERE id IN (${body.ids.map(() => '?').join(',')})`, body.status, now(), ...body.ids)
    ok(res, null, body.status ? '已上架' : '已下架')
  } catch (e) { next(e) }
})

/** PATCH /products/:id/status 单个启停 */
router.patch('/:id/status', requirePermission('product:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!(await get('SELECT id FROM product_spu WHERE id = ?', id))) throw notFound('商品不存在')
    const status = z.object({ status: z.number().int().min(0).max(1) }).parse(req.body).status
    await run('UPDATE product_spu SET status = ?, update_time = ? WHERE id = ?', status, now(), id)
    ok(res, null, status ? '已上架' : '已下架')
  } catch (e) { next(e) }
})

/** 商品被礼包/月度商品池引用时禁止删除，避免外键约束在"先删 SKU 再删 SPU"的第二步才失败，导致 SKU 已被删但 SPU 变成空壳 */
async function assertProductsDeletable(ids: number[]) {
  const placeholders = ids.map(() => '?').join(',')
  const inGift = (await all<{ spuId: number }>(`SELECT DISTINCT spu_id AS spuId FROM gift_package WHERE spu_id IN (${placeholders})`, ...ids))
  if (inGift.length) throw badRequest(`商品 ${inGift.map(r => r.spuId).join('、')} 仍被礼包引用，无法删除，请先在礼包管理中移除`)
  const inPool = (await all<{ spuId: number }>(`SELECT DISTINCT spu_id AS spuId FROM credit_pool_item WHERE spu_id IN (${placeholders})`, ...ids))
  if (inPool.length) throw badRequest(`商品 ${inPool.map(r => r.spuId).join('、')} 仍在月度领货商品池中，无法删除，请先移出商品池`)
}

/** DELETE /products/:id */
router.delete('/:id', requirePermission('product:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!(await get('SELECT id FROM product_spu WHERE id = ?', id))) throw notFound('商品不存在')
    await assertProductsDeletable([id])
    await transaction(async () => {
      await run('DELETE FROM product_sku WHERE spu_id = ?', id)
      await run('DELETE FROM product_spu WHERE id = ?', id)
    })
    ok(res, null, '已删除')
  } catch (e) { next(e) }
})

/** DELETE /products 批量删除（body: { ids }） */
router.delete('/', requirePermission('product:edit'), async (req, res, next) => {
  try {
    const ids = uniqueNumbers((req.body as { ids?: unknown } | undefined)?.ids)
    if (!ids.length) { ok(res, null, '无删除项'); return }
    await assertProductsDeletable(ids)
    await transaction(async () => {
      await run(`DELETE FROM product_sku WHERE spu_id IN (${ids.map(() => '?').join(',')})`, ...ids)
      await run(`DELETE FROM product_spu WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
    })
    ok(res, null, `已删除 ${ids.length} 个商品`)
  } catch (e) { next(e) }
})

/** GET /products/:id/skus 商品 SKU 列表 */
router.get('/:id/skus', requirePermission('product:view'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const skus = ((await all('SELECT id, spu_id AS spuId, sku_name AS skuName, spec_info AS specInfo, price, market_price AS marketPrice, cost_price AS costPrice, stock, sales, image, status FROM product_sku WHERE spu_id = ?', id)))
      .map((s) => ({ ...s, specInfo: parseJson(s.specInfo, {}) }))
    ok(res, skus)
  } catch (e) { next(e) }
})

/** POST /products/:id/skus 新增 SKU */
router.post('/:id/skus', requirePermission('product:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!(await get('SELECT id FROM product_spu WHERE id = ?', id))) throw notFound('商品不存在')
    const body = z.object({
      skuName: z.string().min(1).max(40),
      specInfo: z.record(z.string()).optional(),
      price: z.number().min(0),
      marketPrice: z.number().min(0).optional(),
      costPrice: z.number().min(0).optional(),
      /** 老客户端兼容字段，后续移除；绝不用于订单结算。 */
      originalPrice: z.number().min(0).optional(),
      stock: z.number().int().min(0).optional(),
      image: z.string().optional(),
      status: z.number().min(0).max(1).optional(),
    }).parse(req.body)
    const marketPrice = money(body.marketPrice ?? body.originalPrice ?? body.price)
    if (marketPrice > 0 && marketPrice < body.price) throw badRequest('营销参考价不能低于销售价')
    const r = (await run(
      'INSERT INTO product_sku (spu_id, sku_name, spec_info, price, market_price, cost_price, original_price, stock, sales, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
      id, body.skuName, JSON.stringify(body.specInfo || {}), money(body.price), marketPrice, money(body.costPrice ?? 0), marketPrice,
      body.stock ?? 0, body.image || '', body.status ?? 1,
    ))
    await run('UPDATE product_spu SET update_time = ? WHERE id = ?', now(), id)
    ok(res, { id: Number(r.lastInsertRowid) }, 'SKU 已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /products/:id/skus/:skuId 编辑 SKU */
router.put('/:id/skus/:skuId', requirePermission('product:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const skuId = Number(req.params.skuId)
    const sku = (await get<{
      skuName: string; specInfo: string; price: number; marketPrice: number; originalPrice: number;
      costPrice: number; stock: number; image: string; status: number
    }>(
      'SELECT sku_name AS skuName, spec_info AS specInfo, price, market_price AS marketPrice, original_price AS originalPrice, cost_price AS costPrice, stock, image, status FROM product_sku WHERE id = ? AND spu_id = ?',
      skuId, id,
    ))
    if (!sku) throw notFound('SKU 不存在')
    const body = z.object({
      skuName: z.string().min(1).max(40).optional(),
      specInfo: z.record(z.string()).optional(),
      price: z.number().min(0).optional(),
      marketPrice: z.number().min(0).optional(),
      costPrice: z.number().min(0).optional(),
      originalPrice: z.number().min(0).optional(),
      stock: z.number().int().min(0).optional(),
      image: z.string().optional(),
      status: z.number().min(0).max(1).optional(),
    }).parse(req.body)
    const price = body.price !== undefined ? money(body.price) : Number(sku.price)
    const marketPrice = money(body.marketPrice ?? body.originalPrice ?? sku.marketPrice ?? sku.originalPrice ?? 0)
    if (marketPrice > 0 && marketPrice < price) throw badRequest('营销参考价不能低于销售价')
    await run(
      'UPDATE product_sku SET sku_name = ?, spec_info = ?, price = ?, market_price = ?, cost_price = ?, original_price = ?, stock = ?, image = ?, status = ? WHERE id = ?',
      body.skuName ?? sku.skuName, body.specInfo ? JSON.stringify(body.specInfo) : sku.specInfo,
      price, marketPrice, body.costPrice !== undefined ? money(body.costPrice) : Number(sku.costPrice ?? 0), marketPrice,
      body.stock ?? sku.stock, body.image ?? sku.image, body.status ?? sku.status, skuId,
    )
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** DELETE /products/:id/skus/:skuId */
router.delete('/:id/skus/:skuId', requirePermission('product:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const skuId = Number(req.params.skuId)
    if (!(await get('SELECT id FROM product_sku WHERE id = ? AND spu_id = ?', skuId, id))) throw notFound('SKU 不存在')
    await run('DELETE FROM product_sku WHERE id = ?', skuId)
    ok(res, null, '已删除')
  } catch (e) { next(e) }
})

export default router
