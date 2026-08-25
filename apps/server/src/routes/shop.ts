// ===== 商城端公开接口 /api/v1/shop =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, notFound, badRequest, forbidden } from '../utils/response.js'
import { int, str, now, genNo, parseJson, money } from '../utils/index.js'
import { requireMember } from '../middlewares/auth.js'
import { completeMockPayment, createPayment } from '../services/payment.js'

const router = Router()

/** GET /shop/home 首页聚合（分类/热销/新品/礼包） */
router.get('/home', (_req, res, next) => {
  try {
    const categories = all('SELECT id, name, icon, is_gift_zone AS isGiftZone FROM category WHERE status = 1 AND parent_id = 0 ORDER BY sort, id')
    const hotProducts = all('SELECT id, name, main_image AS mainImage, description, is_gift_package AS isGiftPackage FROM product_spu WHERE status = 1 ORDER BY sort, id DESC LIMIT 6')
    const newProducts = all('SELECT id, name, main_image AS mainImage, description FROM product_spu WHERE status = 1 AND is_gift_package = 0 ORDER BY id DESC LIMIT 4')
    const giftPackages = all(
      `SELECT g.id, g.name, g.price, g.level, l.level_name AS levelName,
              l.shop_discount AS shopDiscount, l.monthly_credit AS monthlyCredit, l.credit_months AS creditMonths
       FROM gift_package g LEFT JOIN level_config l ON l.level = g.level WHERE g.status = 1 ORDER BY g.id`,
    )
    const items = all<{ id: number; packageId: number; skuId: number; skuName: string; quantity: number }>(
      'SELECT id, package_id AS packageId, sku_id AS skuId, sku_name AS skuName, quantity FROM gift_package_item ORDER BY id',
    )
    const itemMap = new Map<number, typeof items>()
    items.forEach((it) => {
      const list = itemMap.get(it.packageId) || []
      list.push(it)
      itemMap.set(it.packageId, list)
    })
    giftPackages.forEach((p) => { (p as { items?: typeof items }).items = itemMap.get((p as { id: number }).id) || [] })
    ok(res, { categories, hotProducts, newProducts, giftPackages })
  } catch (e) { next(e) }
})

/** GET /shop/categories 分类树（公开） */
router.get('/categories', (_req, res, next) => {
  try {
    const list = all('SELECT id, name, icon, parent_id AS parentId, is_gift_zone AS isGiftZone FROM category WHERE status = 1 ORDER BY sort, id')
    const roots = list.filter((c) => c.parentId === 0).map((root) => ({ ...root, children: list.filter((c) => c.parentId === root.id) }))
    ok(res, roots)
  } catch (e) { next(e) }
})

/** GET /shop/products?categoryId=&keyword=&page=&pageSize=&isGiftPackage= */
router.get('/products', (req, res, next) => {
  try {
    const page = int(req.query.page, 1)
    const pageSize = Math.min(100, Math.max(1, int(req.query.pageSize, 10)))
    const categoryId = req.query.categoryId === undefined || req.query.categoryId === '' ? null : int(req.query.categoryId)
    const keyword = str(req.query.keyword)
    const isGift = req.query.isGiftPackage === undefined || req.query.isGiftPackage === '' ? null : (String(req.query.isGiftPackage) === 'true' || String(req.query.isGiftPackage) === '1')

    const conds = ['p.status = 1']
    const params: (string | number)[] = []
    if (categoryId !== null) {
      const subIds = all<{ id: number }>('SELECT id FROM category WHERE parent_id = ?', categoryId).map((c) => c.id)
      conds.push(`p.category_id IN (${[categoryId, ...subIds].map(() => '?').join(',')})`)
      params.push(categoryId, ...subIds)
    }
    if (keyword) { conds.push('p.name LIKE ?'); params.push(`%${keyword}%`) }
    if (isGift !== null) { conds.push('p.is_gift_package = ?'); params.push(isGift ? 1 : 0) }
    const where = `WHERE ${conds.join(' AND ')}`

    const total = (get(`SELECT COUNT(*) AS c FROM product_spu p ${where}`, ...params) as { c: number }).c
    const rows = all(
      `SELECT p.id, p.name, p.main_image AS mainImage, p.description, p.sort, p.is_gift_package AS isGiftPackage,
              (SELECT MIN(price) FROM product_sku s WHERE s.spu_id = p.id AND s.status = 1) AS minPrice
       FROM product_spu p ${where} ORDER BY p.sort, p.id DESC LIMIT ? OFFSET ?`,
      ...params, pageSize, (page - 1) * pageSize,
    )
    ok(res, { list: rows, total, page, pageSize })
  } catch (e) { next(e) }
})

/** GET /shop/products/:id 商品详情 */
router.get('/products/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const spu = get('SELECT * FROM product_spu WHERE id = ? AND status = 1', id)
    if (!spu) throw notFound('商品不存在')
    const skus = all('SELECT id, sku_name AS skuName, spec_info AS specInfo, price, original_price AS originalPrice, stock, image FROM product_sku WHERE spu_id = ? AND status = 1', id)
    ok(res, { ...spu, images: parseJson(spu.images, []), skus })
  } catch (e) { next(e) }
})

/** GET /shop/gift-packages 礼包列表 */
router.get('/gift-packages', (_req, res, next) => {
  try {
    const pkgs = all(
      `SELECT g.id, g.name, g.price, g.level, g.status, l.level_name AS levelName
       FROM gift_package g LEFT JOIN level_config l ON l.level = g.level WHERE g.status = 1 ORDER BY g.id`,
    )
    ok(res, pkgs)
  } catch (e) { next(e) }
})

/** POST /shop/orders 下单（需登录：会员身份取自 JWT；礼包：giftPackageId） */
router.post('/orders', requireMember, (req, res, next) => {
  try {
    const body = z.object({
      items: z.array(z.object({ skuId: z.number().int(), quantity: z.number().int().min(1) })).optional(),
      giftPackageId: z.number().int().optional(),
      receiverName: z.string().min(1).max(30),
      receiverPhone: z.string().min(5).max(20),
      receiverAddress: z.string().min(1).max(120),
      remark: z.string().max(200).optional(),
    }).parse(req.body)

    const member = get('SELECT id, nickname, level FROM member WHERE id = ?', req.member!.mid)
    if (!member) throw badRequest('会员不存在')

    let orderType = 1
    let total = 0
    const itemRows: { skuId: number; skuName: string; quantity: number; unitPrice: number; originalPrice: number; image: string }[] = []

    if (body.giftPackageId) {
      const pkg = get<Record<string, unknown>>('SELECT * FROM gift_package WHERE id = ? AND status = 1', body.giftPackageId)
      if (!pkg) throw notFound('礼包不存在')
      orderType = 2
      total = Number(pkg.price)
      const pkgItems = all<{ skuId: number; skuName: string; quantity: number; unitPrice: number }>(
        'SELECT sku_id AS skuId, sku_name AS skuName, quantity, unit_price AS unitPrice FROM gift_package_item WHERE package_id = ?', body.giftPackageId,
      )
      pkgItems.forEach((it) => itemRows.push({ ...it, originalPrice: it.unitPrice, image: '' }))
    } else {
      for (const it of body.items || []) {
        const sku = get<Record<string, unknown>>('SELECT * FROM product_sku WHERE id = ? AND status = 1', it.skuId)
        if (!sku) throw badRequest(`SKU ${it.skuId} 不存在或已下架`)
        total += Number(sku.price) * it.quantity
        itemRows.push({
          skuId: it.skuId, skuName: String(sku.skuName), quantity: it.quantity,
          unitPrice: Number(sku.price), originalPrice: Number(sku.originalPrice), image: String(sku.image || ''),
        })
      }
    }
    if (!itemRows.length) throw badRequest('订单内容为空')

    total = money(total)
    const r = run(
      `INSERT INTO "order" (order_no, member_id, member_name, order_type, total_amount, discount_amount, shipping_fee, pay_amount, status,
        receiver_name, receiver_phone, receiver_address, remark, create_time, pay_time)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?, 0, ?, ?, ?, ?, ?, NULL)`,
      genNo('SO'), member.id, member.nickname, orderType, total, total, body.receiverName, body.receiverPhone,
      body.receiverAddress, body.remark || '', now(),
    )
    const oid = Number(r.lastInsertRowid)
    for (const it of itemRows) {
      run(
        'INSERT INTO order_item (order_id, sku_id, sku_name, spec_info, image, quantity, original_price, unit_price, total_price, member_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        oid, it.skuId, it.skuName, '{}', it.image, it.quantity, it.originalPrice, it.unitPrice, money(it.unitPrice * it.quantity), member.level,
      )
      run('UPDATE product_sku SET stock = stock - ?, sales = sales + ? WHERE id = ?', it.quantity, it.quantity, it.skuId)
    }
    ok(res, { orderId: oid, payAmount: total }, '下单成功', 201)
  } catch (e) { next(e) }
})

/** GET /shop/levels 启用中的等级配置（公开，供商城展示权益） */
router.get('/levels', (_req, res, next) => {
  try {
    const list = all('SELECT level, level_name AS levelName, level_sort AS levelSort, entry_amount AS entryAmount, shop_discount AS shopDiscount, monthly_credit AS monthlyCredit, credit_months AS creditMonths FROM level_config WHERE status = 1 ORDER BY level_sort')
    ok(res, list)
  } catch (e) { next(e) }
})

/** GET /shop/commission-rules 启用中的佣金规则（公开，按等级×层级） */
router.get('/commission-rules', (_req, res, next) => {
  try {
    const list = all(
      `SELECT id, package_level AS packageLevel, distribution_level AS distributionLevel, rate, status, update_time AS updateTime
       FROM commission_rule WHERE status = 1 ORDER BY package_level, distribution_level`,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** GET /shop/distribution-config 分销开关配置（公开：总开关 + 分级开关） */
router.get('/distribution-config', (_req, res, next) => {
  try {
    const rows = all('SELECT config_key AS key, config_value AS value FROM system_config WHERE config_group = ?', 'distribution')
    const getVal = (k: string, def = 1) => {
      const row = rows.find(r => r.key === k)
      return row ? Number(row.value) : def
    }
    ok(res, {
      enabled: getVal('distribution.enabled') === 1,
      level1: getVal('distribution.level_1') === 1,
      level2: getVal('distribution.level_2') === 1,
      level3: getVal('distribution.level_3') === 1,
      /** 实际生效的层级（受总开关约束） */
      activeLevels: getVal('distribution.enabled') === 1
        ? [1, 2, 3].filter(l => getVal(`distribution.level_${l}`) === 1)
        : [],
    })
  } catch (e) { next(e) }
})

/** GET /shop/promote-config 推广配置（公开：站点域名，用于生成推广链接/海报二维码） */
router.get('/promote-config', (_req, res, next) => {
  try {
    const row = get<{ v: string }>('SELECT config_value AS v FROM system_config WHERE config_key = ?', 'site.domain')
    const domain = (row?.v || '').replace(/\/+$/, '')
    ok(res, { domain, registerPath: '/register' })
  } catch (e) { next(e) }
})

/** GET /shop/posters 启用的推广海报（公开；fixed 为固定海报，随机模式无 fixed） */
router.get('/posters', (_req, res, next) => {
  try {
    const list = all(
      `SELECT id, title, image, is_fixed AS isFixed, qr_x AS qrX, qr_y AS qrY, qr_size AS qrSize, sort
       FROM promote_poster WHERE status = 1 ORDER BY is_fixed DESC, sort ASC, id ASC`,
    )
    const fixed = list.find(p => Number(p.isFixed) === 1) || null
    ok(res, {
      list,
      /** 固定海报（固定模式：前台固定展示） */
      fixed: fixed ? { id: fixed.id, title: fixed.title, image: fixed.image, qrX: fixed.qrX, qrY: fixed.qrY, qrSize: fixed.qrSize } : null,
      /** 随机模式：启用海报全部参与随机（千人千面） */
      randomList: list
        .filter(p => Number(p.isFixed) !== 1)
        .map(p => ({ id: p.id, title: p.title, image: p.image, qrX: p.qrX, qrY: p.qrY, qrSize: p.qrSize })),
    })
  } catch (e) { next(e) }
})

/** POST /shop/payments 创建支付单（需登录且为本人订单，body: { orderId, payType: wechat|alipay }） */
router.post('/payments', requireMember, (req, res, next) => {
  try {
    const body = z.object({ orderId: z.number().int(), payType: z.enum(['wechat', 'alipay']) }).parse(req.body)
    const order = get<Record<string, unknown>>('SELECT * FROM "order" WHERE id = ?', body.orderId)
    if (!order) throw notFound('订单不存在')
    if (Number(order.memberId) !== req.member!.mid) throw forbidden('无权操作他人订单')
    if (Number(order.status) !== 0) throw badRequest('仅待支付订单可发起支付')
    const payment = createPayment({
      orderId: body.orderId,
      memberId: req.member!.mid,
      payType: body.payType,
      amount: Number(order.payAmount),
    })
    ok(res, payment, '支付单已创建', 201)
  } catch (e) { next(e) }
})

/** POST /shop/payments/:paymentNo/simulate 模拟第三方支付回调成功（仅 mock 模式开放；真实网关后续由 notify 接口替代） */
router.post('/payments/:paymentNo/simulate', requireMember, (req, res, next) => {
  try {
    ok(res, completeMockPayment(req.params.paymentNo, req.member!.mid), '支付成功')
  } catch (e) { next(e) }
})

/** POST /shop/orders/:id/pay 支付订单（兼容旧流程：直接支付成功；新流程请先创建支付单再模拟回调） */
router.post('/orders/:id/pay', requireMember, (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const order = get<Record<string, unknown>>('SELECT * FROM "order" WHERE id = ?', id)
    if (!order) throw notFound('订单不存在')
    if (Number(order.memberId) !== req.member!.mid) throw forbidden('无权操作他人订单')
    if (Number(order.status) !== 0) throw badRequest('仅待支付订单可支付')
    run('UPDATE "order" SET status = 1, pay_time = ? WHERE id = ?', now(), id)
    ok(res, null, '支付成功')
  } catch (e) { next(e) }
})

/** POST /shop/orders/:id/confirm 确认收货（需登录且为本人订单） */
router.post('/orders/:id/confirm', requireMember, (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const order = get<Record<string, unknown>>('SELECT * FROM "order" WHERE id = ?', id)
    if (!order) throw notFound('订单不存在')
    if (Number(order.memberId) !== req.member!.mid) throw forbidden('无权操作他人订单')
    if (Number(order.status) !== 2) throw badRequest('仅已发货订单可确认收货')
    run('UPDATE "order" SET status = 3, finish_time = ? WHERE id = ?', now(), id)
    ok(res, null, '已确认收货')
  } catch (e) { next(e) }
})

/** POST /shop/orders/:id/cancel 取消订单（需登录且为本人订单） */
router.post('/orders/:id/cancel', requireMember, (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const order = get<Record<string, unknown>>('SELECT * FROM "order" WHERE id = ?', id)
    if (!order) throw notFound('订单不存在')
    if (Number(order.memberId) !== req.member!.mid) throw forbidden('无权操作他人订单')
    if (Number(order.status) !== 0) throw badRequest('仅待支付订单可取消')
    run('UPDATE "order" SET status = 4, cancel_time = ? WHERE id = ?', now(), id)
    ok(res, null, '订单已取消')
  } catch (e) { next(e) }
})

export default router
