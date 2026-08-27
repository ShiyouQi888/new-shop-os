// ===== 配置模块 /api/v1/config =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, notFound, conflict, badRequest } from '../utils/response.js'
import { now } from '../utils/index.js'
import { requireAnyPermission, requireAuth, requirePermission } from '../middlewares/auth.js'

const router = Router()
router.use(requireAuth)

// ===== 等级权益配置 =====
/** GET /config/levels */
router.get('/levels', (_req, res, next) => {
  try {
    const list = all(`
      SELECT id, level, level_name AS levelName, level_sort AS levelSort, entry_amount AS entryAmount,
             shop_discount AS shopDiscount, monthly_credit AS monthlyCredit, credit_months AS creditMonths,
             resell_fee_rate AS resellFeeRate, consumption_credit_rate AS consumptionCreditRate,
             consumption_credit_months AS consumptionCreditMonths, consumption_resellable AS consumptionResellable,
             status, update_time AS updateTime
      FROM level_config ORDER BY level_sort
    `)
    ok(res, list)
  } catch (e) { next(e) }
})

/** PUT /config/levels/:id 编辑等级 */
router.put('/levels/:id', requirePermission('benefit:config'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM level_config WHERE id = ?', id)) throw notFound('等级配置不存在')
    const body = z.object({
      levelName: z.string().min(1).max(20).optional(),
      levelSort: z.number().int().optional(),
      entryAmount: z.number().min(0).optional(),
      shopDiscount: z.number().min(1).max(100).optional(),
      monthlyCredit: z.number().min(0).optional(),
      creditMonths: z.number().int().min(1).optional(),
      resellFeeRate: z.number().min(0).max(100).optional(),
      consumptionCreditRate: z.number().min(0).max(100).optional(),
      consumptionCreditMonths: z.number().int().min(0).optional(),
      consumptionResellable: z.number().min(0).max(1).optional(),
      status: z.number().min(0).max(1).optional(),
    }).parse(req.body)
    const cur = get<Record<string, unknown>>('SELECT * FROM level_config WHERE id = ?', id)!
    run(
      `UPDATE level_config SET level_name = ?, level_sort = ?, entry_amount = ?, shop_discount = ?, monthly_credit = ?,
        credit_months = ?, resell_fee_rate = ?, consumption_credit_rate = ?, consumption_credit_months = ?,
        consumption_resellable = ?, status = ?, update_time = ? WHERE id = ?`,
      body.levelName ?? cur.levelName, body.levelSort ?? cur.levelSort, body.entryAmount ?? cur.entryAmount,
      body.shopDiscount ?? cur.shopDiscount, body.monthlyCredit ?? cur.monthlyCredit,
      body.creditMonths ?? cur.creditMonths, body.resellFeeRate ?? cur.resellFeeRate,
      body.consumptionCreditRate ?? cur.consumptionCreditRate, body.consumptionCreditMonths ?? cur.consumptionCreditMonths,
      body.consumptionResellable ?? cur.consumptionResellable, body.status ?? cur.status, now(), id,
    )
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** POST /config/levels 新增等级 */
router.post('/levels', requirePermission('benefit:config'), (req, res, next) => {
  try {
    const body = z.object({
      levelName: z.string().min(1).max(20),
      levelSort: z.number().int().min(1),
      entryAmount: z.number().min(0),
      shopDiscount: z.number().min(1).max(100),
      monthlyCredit: z.number().min(0),
      creditMonths: z.number().int().min(1),
      resellFeeRate: z.number().min(0).max(100),
      consumptionCreditRate: z.number().min(0).max(100).optional(),
      consumptionCreditMonths: z.number().int().min(0).optional(),
      consumptionResellable: z.number().min(0).max(1).optional(),
    }).parse(req.body)
    const nextLevel = get<{ m: number }>('SELECT COALESCE(MAX(level),0) + 1 AS m FROM level_config')!.m
    if (get('SELECT id FROM level_config WHERE level = ?', nextLevel)) throw conflict('等级档位冲突')
    const r = run(
      `INSERT INTO level_config (level, level_name, level_sort, entry_amount, shop_discount, monthly_credit, credit_months,
        resell_fee_rate, consumption_credit_rate, consumption_credit_months, consumption_resellable, status, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      nextLevel, body.levelName, body.levelSort, body.entryAmount, body.shopDiscount, body.monthlyCredit,
      body.creditMonths, body.resellFeeRate, body.consumptionCreditRate ?? 0, body.consumptionCreditMonths ?? 0,
      body.consumptionResellable ?? 0, now(),
    )
    ok(res, { id: Number(r.lastInsertRowid), level: nextLevel }, '等级已创建', 201)
  } catch (e) { next(e) }
})

/** DELETE /config/levels/:id 删除等级 */
router.delete('/levels/:id', requirePermission('benefit:config'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const lv = get<Record<string, unknown>>('SELECT * FROM level_config WHERE id = ?', id)
    if (!lv) throw notFound('等级配置不存在')
    const count = get<{ c: number }>('SELECT COUNT(*) AS c FROM level_config')!.c
    if (count <= 1) throw conflict('至少保留一个等级')
    run('DELETE FROM level_config WHERE id = ?', id)
    ok(res, null, '等级已删除')
  } catch (e) { next(e) }
})

// ===== 分销佣金规则 =====
/** GET /config/commission-rules */
router.get('/commission-rules', (_req, res, next) => {
  try {
    const list = all(`
      SELECT id, package_level AS packageLevel, distribution_level AS distributionLevel, rate, status, update_time AS updateTime
      FROM commission_rule ORDER BY package_level, distribution_level
    `)
    ok(res, list)
  } catch (e) { next(e) }
})

/** PUT /config/commission-rules/:id 编辑佣金规则 */
router.put('/commission-rules/:id', requirePermission('benefit:config'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM commission_rule WHERE id = ?', id)) throw notFound('规则不存在')
    const body = z.object({ rate: z.number().min(0).max(100), status: z.number().min(0).max(1).optional() }).parse(req.body)
    const cur = get<Record<string, unknown>>('SELECT * FROM commission_rule WHERE id = ?', id)!
    run('UPDATE commission_rule SET rate = ?, status = ?, update_time = ? WHERE id = ?', body.rate, body.status ?? cur.status, now(), id)
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

// ===== 系统配置 =====
/** GET /config/system?group= */
router.get('/system', (req, res, next) => {
  try {
    const group = typeof req.query.group === 'string' ? req.query.group : ''
    const list = group
      ? all('SELECT id, config_key AS configKey, config_value AS configValue, config_group AS configGroup, description, update_operator AS updateOperator, update_time AS updateTime FROM system_config WHERE config_group = ? ORDER BY id', group)
      : all('SELECT id, config_key AS configKey, config_value AS configValue, config_group AS configGroup, description, update_operator AS updateOperator, update_time AS updateTime FROM system_config ORDER BY config_group, id')
    ok(res, list)
  } catch (e) { next(e) }
})

/** PUT /config/system/:id */
router.put('/system/:id', requireAnyPermission('benefit:config', 'system:admin'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const existing = get<{ configKey: string }>('SELECT config_key AS configKey FROM system_config WHERE id = ?', id)
    if (!existing) throw notFound('配置项不存在')
    const body = z.object({
      configValue: z.string(),
      configGroup: z.string().optional(),
      description: z.string().optional(),
    }).parse(req.body)
    // 真实支付网关尚未接入回调/notify 实现，切换到 real 会导致所有订单永远无法完成支付，禁止直接开启
    if (existing.configKey === 'payment.mode' && body.configValue === 'real') {
      throw badRequest('真实支付网关尚未开发完成（缺少回调通知接口），暂不支持切换，请保持模拟支付模式')
    }
    run('UPDATE system_config SET config_value = ?, config_group = ?, description = ?, update_operator = ?, update_time = ? WHERE id = ?',
      body.configValue, body.configGroup ?? '', body.description ?? '', req.auth!.username, now(), id)
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

// ===== 月度领货商品池（按等级配置） =====
/** GET /config/credit-pool 全部等级的商品池（含商品名称/图片，供后台按等级分组展示） */
router.get('/credit-pool', (_req, res, next) => {
  try {
    const list = all(
      `SELECT c.level, c.spu_id AS spuId, p.name, p.main_image AS mainImage
       FROM credit_pool_item c JOIN product_spu p ON p.id = c.spu_id
       ORDER BY c.level, c.sort, c.id`,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** PUT /config/credit-pool/:level 整体替换某等级的商品池（body: { spuIds: number[] }） */
router.put('/credit-pool/:level', requirePermission('benefit:config'), (req, res, next) => {
  try {
    const level = Number(req.params.level)
    const body = z.object({ spuIds: z.array(z.number().int()) }).parse(req.body)
    run('DELETE FROM credit_pool_item WHERE level = ?', level)
    body.spuIds.forEach((spuId, idx) => {
      run('INSERT OR IGNORE INTO credit_pool_item (level, spu_id, sort, create_time) VALUES (?, ?, ?, ?)', level, spuId, idx, now())
    })
    ok(res, null, '商品池已更新')
  } catch (e) { next(e) }
})

export default router
