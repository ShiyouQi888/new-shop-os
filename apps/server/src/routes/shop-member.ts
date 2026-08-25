// ===== 商城会员端 /api/v1/shop/member =====
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, badRequest, notFound, conflict } from '../utils/response.js'
import { now, int, genNo, monthOf } from '../utils/index.js'
import { requireMember, signMemberToken } from '../middlewares/auth.js'
import { config } from '../config.js'

const router = Router()

const MEMBER_SELECT = `
  SELECT m.id, m.phone, m.nickname, m.avatar, m.level, m.invite_code AS inviteCode,
         m.inviter_id AS inviterId, m.second_inviter_id AS secondInviterId, m.third_inviter_id AS thirdInviterId,
         m.status, m.real_name AS realName, m.register_time AS registerTime,
         m.become_agent_time AS becomeAgentTime, m.level_expire_time AS levelExpireTime,
         l.level_name AS levelName
  FROM member m LEFT JOIN level_config l ON l.level = m.level
`

/** 会员详情 + 钱包 + 等级权益 */
function memberDetail(id: number): Record<string, unknown> | null {
  const m = get(MEMBER_SELECT + ' WHERE m.id = ?', id)
  if (!m) return null
  const wallet = get('SELECT balance, frozen, total_income AS totalIncome, total_withdraw AS totalWithdraw FROM wallet WHERE member_id = ?', id)
    ?? { balance: 0, frozen: 0, totalIncome: 0, totalWithdraw: 0 }
  const lv = get('SELECT shop_discount AS shopDiscount, monthly_credit AS monthlyCredit, credit_months AS creditMonths FROM level_config WHERE level = ?', m.level)
    ?? { shopDiscount: 100, monthlyCredit: 0, creditMonths: 0 }
  return { ...m, wallet, shopDiscount: lv.shopDiscount, monthlyCredit: lv.monthlyCredit, creditMonths: lv.creditMonths }
}

/** 签发会员 token 并组装登录响应 */
function withToken(detail: Record<string, unknown> | null) {
  if (!detail) return detail
  const token = signMemberToken({ type: 'member', mid: Number(detail.id), phone: String(detail.phone) })
  return { token, ...detail }
}

/** POST /shop/member/login 手机号 + 密码登录 */
router.post('/login', (req, res, next) => {
  try {
    const body = z.object({
      phone: z.string().min(5).max(20),
      password: z.string().min(6).max(50),
    }).parse(req.body)
    const m = get<{ id: number; passwordHash: string }>(
      'SELECT id, password_hash AS passwordHash FROM member WHERE phone = ?',
      body.phone,
    )
    if (!m) throw badRequest('账号不存在，请先使用邀请码注册')
    if (!m.passwordHash || !bcrypt.compareSync(body.password, m.passwordHash)) throw badRequest('账号或密码错误')
    const detail = memberDetail(Number(m.id))
    if (!detail) throw notFound('会员不存在')
    if (Number(detail.status) === 2) throw badRequest('账号已被冻结')
    ok(res, withToken(detail))
  } catch (e) { next(e) }
})

/** POST /shop/member/register 注册（手机号 + 密码 + 邀请码绑定推荐链） */
router.post('/register', (req, res, next) => {
  try {
    const body = z.object({
      phone: z.string().min(5).max(20),
      password: z.string().min(6).max(50),
      nickname: z.string().max(20).optional(),
      inviteCode: z.string().min(1).max(20),
    }).parse(req.body)
    if (get('SELECT id FROM member WHERE phone = ?', body.phone)) throw conflict('该手机号已注册，请直接登录')
    // 分销总开关关闭时，不绑定任何邀请关系
    const distEnabled = get<{ v: string }>('SELECT config_value AS v FROM system_config WHERE config_key = ?', 'distribution.enabled')?.v !== '0'
    let inviterId: number | null = null
    let secondId: number | null = null
    let thirdId: number | null = null
    if (distEnabled) {
      const inviter = get<{ id: number; inviterId: number | null; secondInviterId: number | null }>(
        'SELECT id, inviter_id AS inviterId, second_inviter_id AS secondInviterId FROM member WHERE invite_code = ?', body.inviteCode,
      )
      if (!inviter) throw badRequest('邀请码无效，请确认后重新输入')
      const inv = get<{ inviterId: number | null; secondInviterId: number | null }>('SELECT inviter_id AS inviterId, second_inviter_id AS secondInviterId FROM member WHERE id = ?', inviter.id)
      inviterId = inviter.id
      secondId = inv?.inviterId ?? null
      thirdId = inv?.secondInviterId ?? null
    }

    const r = run(
      `INSERT INTO member (phone, password_hash, nickname, avatar, level, inviter_id, second_inviter_id, third_inviter_id, invite_code, status, register_time)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 1, ?)`,
      body.phone, bcrypt.hashSync(body.password, config.bcryptRounds), body.nickname || `会员${body.phone.slice(-4)}`,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${body.phone}`,
      inviterId, secondId, thirdId,
      `NOR${body.phone.slice(-3)}${Math.floor(Math.random() * 90 + 10)}`, now(),
    )
    const id = Number(r.lastInsertRowid)
    run('INSERT OR IGNORE INTO wallet (member_id, balance, frozen, total_income, total_withdraw) VALUES (?, 0, 0, 0, 0)', id)
    ok(res, withToken(memberDetail(id)), '注册成功', 201)
  } catch (e) { next(e) }
})

/** POST /shop/member/upgrade 开通代理商（购买礼包后升级等级，需登录） */
router.post('/upgrade', requireMember, (req, res, next) => {
  try {
    const mid = req.member!.mid
    const body = z.object({ level: z.number().int().min(1) }).parse(req.body)
    if (!get('SELECT id FROM member WHERE id = ?', mid)) throw notFound('会员不存在')
    const level = get<{ monthlyCredit: number }>('SELECT monthly_credit AS monthlyCredit FROM level_config WHERE level = ? AND status = 1', body.level)
    if (!level) throw badRequest('等级不存在或未启用')
    const paidGift = get(
      `SELECT o.id
       FROM "order" o JOIN order_item oi ON oi.order_id = o.id
       WHERE o.member_id = ? AND o.order_type = 2 AND o.status = 3 AND oi.member_level = ?
       ORDER BY o.id DESC LIMIT 1`,
      mid, body.level,
    )
    if (!paidGift) throw badRequest('未找到已支付的对应等级入会礼包订单')
    run('UPDATE member SET level = ?, become_agent_time = ? WHERE id = ?', body.level, now(), mid)
    const month = monthOf()
    const credit = Number(level.monthlyCredit ?? 0)
    if (credit > 0 && !get('SELECT id FROM credit_record WHERE member_id = ? AND month = ?', mid, month)) {
      const rec = run(
        'INSERT INTO credit_record (member_id, month, credit_amount, used_amount, remain_amount, status, remark, create_time) VALUES (?, ?, ?, 0, ?, 0, ?, ?)',
        mid, month, credit, credit, '入会礼包支付后自动发放', now(),
      )
      run(
        'INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, create_time) VALUES (?, ?, ?, ?, 1, ?, ?)',
        Number(rec.lastInsertRowid), mid, credit, credit, '入会礼包支付后自动发放', now(),
      )
    }
    ok(res, memberDetail(mid), '代理商权益已开通')
  } catch (e) { next(e) }
})

/** GET /shop/member/me 会员聚合信息（需登录） */
router.get('/me', requireMember, (req, res, next) => {
  try {
    const id = req.member!.mid
    const detail = memberDetail(id)
    if (!detail) throw notFound('会员不存在')
    const total = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE member_id = ?', id)!.v
    const available = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE member_id = ? AND status = 1', id)!.v
    const pending = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE member_id = ? AND status = 0', id)!.v
    const withdrawn = Number((detail.wallet as { totalWithdraw?: number } | undefined)?.totalWithdraw ?? 0)
    const l1 = get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE inviter_id = ?', id)!.c
    const l2 = get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE second_inviter_id = ?', id)!.c
    const l3 = get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE third_inviter_id = ?', id)!.c
    const resellActive = get<{ c: number }>('SELECT COUNT(*) AS c FROM resell_order WHERE member_id = ? AND status IN (0,1,2)', id)!.c
    const credit = get('SELECT id, member_id AS memberId, month, credit_amount AS creditAmount, used_amount AS usedAmount, remain_amount AS remainAmount, status FROM credit_record WHERE member_id = ? ORDER BY month DESC LIMIT 1', id)
    ok(res, {
      member: detail,
      commission: { total, available, pending, withdrawn },
      team: { level1: l1, level2: l2, level3: l3, total: l1 + l2 + l3 },
      resellActive,
      monthlyCredit: credit ?? null,
    })
  } catch (e) { next(e) }
})

/** GET /shop/member/promote-stats 推广数据统计（需登录：直属/团队/成交/佣金，真实数据） */
router.get('/promote-stats', requireMember, (req, res, next) => {
  try {
    const id = req.member!.mid
    const direct = get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE inviter_id = ?', id)!.c
    const level2 = get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE second_inviter_id = ?', id)!.c
    const level3 = get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE third_inviter_id = ?', id)!.c
    const teamTotal = direct + level2 + level3
    // 成交订单数：我推荐的下级（任一层级）中已支付的订单
    const orderCount = get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM "order" o
       WHERE o.member_id IN (SELECT m.id FROM member m WHERE m.inviter_id = ? OR m.second_inviter_id = ? OR m.third_inviter_id = ?)
         AND o.status IN (1,2,3)`,
      id, id, id,
    )!.c
    const commissionTotal = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE member_id = ?', id)!.v
    ok(res, {
      directCount: direct,
      teamCount: teamTotal,
      orderCount,
      commissionTotal,
    })
  } catch (e) { next(e) }
})

/** GET /shop/member/credits 领货额度（需登录） */
router.get('/credits', requireMember, (req, res, next) => {
  try {
    const id = req.member!.mid
    const list = all('SELECT id, month, credit_amount AS creditAmount, used_amount AS usedAmount, remain_amount AS remainAmount, status, remark FROM credit_record WHERE member_id = ? ORDER BY month DESC', id)
    ok(res, list)
  } catch (e) { next(e) }
})

/** GET /shop/member/resells 转卖单（需登录） */
router.get('/resells', requireMember, (req, res, next) => {
  try {
    const id = req.member!.mid
    const list = all(
      `SELECT r.id, r.resell_no AS resellNo, r.goods_value AS goodsValue, r.service_fee AS serviceFee,
              r.shipping_fee AS shippingFee, r.settle_amount AS settleAmount, r.status, r.create_time AS createTime,
              r.credit_id AS creditId, r.settle_time AS settleTime,
              COALESCE(r.sku_name, (SELECT oi.sku_name FROM order_item oi WHERE oi.order_id = r.order_id LIMIT 1)) AS skuName,
              (SELECT SUM(oi.quantity) FROM order_item oi WHERE oi.order_id = r.order_id) AS quantity
       FROM resell_order r WHERE r.member_id = ? ORDER BY r.id DESC`,
      id,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /shop/member/resells 发起转卖（需登录，落库供后台可见） */
router.post('/resells', requireMember, (req, res, next) => {
  try {
    const mid = req.member!.mid
    const body = z.object({
      goodsValue: z.number().min(1),
      creditId: z.number().int().optional(),
      serviceFee: z.number().min(0).optional(),
      shippingFee: z.number().min(0).optional(),
      settleAmount: z.number().min(0).optional(),
      skuName: z.string().max(40).optional(),
    }).parse(req.body)
    if (Number(body.settleAmount ?? 0) <= 0) throw badRequest('预计到账需大于 0')
    const member = get<{ nickname: string }>('SELECT nickname FROM member WHERE id = ?', mid)
    if (!member) throw notFound('会员不存在')
    const credit = body.creditId
      ? get<Record<string, unknown>>('SELECT * FROM credit_record WHERE id = ? AND member_id = ?', body.creditId, mid)
      : get<Record<string, unknown>>('SELECT * FROM credit_record WHERE member_id = ? AND remain_amount >= ? AND status IN (0,1) ORDER BY month DESC, id DESC LIMIT 1', mid, body.goodsValue)
    if (!credit) throw badRequest('可转卖月度领货额度不足')
    if (Number(credit.remainAmount) < body.goodsValue) throw badRequest('可转卖月度领货额度不足')
    const ts = now()
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const resellNo = `RS${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${String(Date.now()).slice(-6)}`
    const r = run(
      `INSERT INTO resell_order (resell_no, member_id, member_name, credit_id, order_id, order_no, goods_value, service_fee, shipping_fee, settle_amount, status, sku_name, create_time)
       VALUES (?, ?, ?, ?, NULL, '', ?, ?, ?, ?, 0, ?, ?)`,
      resellNo, mid, member.nickname, Number(credit.id), body.goodsValue, body.serviceFee ?? 0, body.shippingFee ?? 0,
      body.settleAmount ?? 0, body.skuName || '月度领货转卖商品', ts,
    )
    const remain = Number(credit.remainAmount) - body.goodsValue
    run('UPDATE credit_record SET used_amount = used_amount + ?, remain_amount = ?, status = ?, update_time = ? WHERE id = ?',
      body.goodsValue, remain, remain <= 0 ? 4 : 1, ts, Number(credit.id))
    run('INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, create_time) VALUES (?, ?, ?, ?, 2, ?, ?)',
      Number(credit.id), mid, -body.goodsValue, remain, '发起转卖扣减月度额度', ts)
    const id = Number(r.lastInsertRowid)
    ok(res, get(
      `SELECT id, resell_no AS resellNo, goods_value AS goodsValue, service_fee AS serviceFee,
              shipping_fee AS shippingFee, settle_amount AS settleAmount, status, credit_id AS creditId, sku_name AS skuName, create_time AS createTime
       FROM resell_order WHERE id = ?`, id,
    ), '转卖申请已提交，等待系统匹配', 201)
  } catch (e) { next(e) }
})

/** GET /shop/member/commissions?level= 佣金记录（需登录） */
router.get('/commissions', requireMember, (req, res, next) => {
  try {
    const id = req.member!.mid
    const level = req.query.level ? int(req.query.level) : null
    const list = level
      ? all('SELECT id, amount, rate, distribution_level AS distributionLevel, package_level AS packageLevel, status, create_time AS createTime FROM commission WHERE member_id = ? AND distribution_level = ? ORDER BY id DESC', id, level)
      : all('SELECT id, amount, rate, distribution_level AS distributionLevel, package_level AS packageLevel, status, create_time AS createTime FROM commission WHERE member_id = ? ORDER BY id DESC', id)
    ok(res, list)
  } catch (e) { next(e) }
})

/** GET /shop/member/team?level= 团队（1/2/3 级，需登录；含各成员为当前用户带来的佣金） */
router.get('/team', requireMember, (req, res, next) => {
  try {
    const id = req.member!.mid
    const level = int(req.query.level, 1)
    const col = level === 2 ? 'second_inviter_id' : level === 3 ? 'third_inviter_id' : 'inviter_id'
    const list = all(
      `SELECT m.id, m.nickname, m.avatar, m.phone, m.level, m.invite_code AS inviteCode, m.register_time AS registerTime,
              (SELECT COALESCE(SUM(c.amount),0) FROM commission c WHERE c.source_member_id = m.id AND c.member_id = ?) AS contributedAmount
       FROM member m WHERE m.${col} = ? ORDER BY m.id`,
      id, id,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** GET /shop/member/orders 我的订单（需登录） */
router.get('/orders', requireMember, (req, res, next) => {
  try {
    const id = req.member!.mid
    const list = all(
      `SELECT o.id, o.order_no AS orderNo, o.order_type AS orderType, o.pay_amount AS payAmount,
              o.total_amount AS totalAmount, o.status, o.create_time AS createTime, o.pay_time AS payTime,
              o.ship_time AS shipTime, o.finish_time AS finishTime,
              (SELECT oi.sku_name FROM order_item oi WHERE oi.order_id = o.id LIMIT 1) AS skuName,
              (SELECT SUM(oi.quantity) FROM order_item oi WHERE oi.order_id = o.id) AS quantity,
              (SELECT oi.image FROM order_item oi WHERE oi.order_id = o.id LIMIT 1) AS itemImage
       FROM "order" o WHERE o.member_id = ? ORDER BY o.id DESC`,
      id,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

// ===== 收货地址 =====
/** GET /shop/member/addresses 我的收货地址 */
router.get('/addresses', requireMember, (req, res, next) => {
  try {
    const list = all(
      `SELECT id, member_id AS memberId, name, phone, province, city, district, detail, is_default AS isDefault, create_time AS createTime
       FROM member_address WHERE member_id = ? ORDER BY is_default DESC, id DESC`,
      req.member!.mid,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /shop/member/addresses 新增地址 */
router.post('/addresses', requireMember, (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(20), phone: z.string().min(5).max(20),
      province: z.string().max(30), city: z.string().max(30), district: z.string().max(30),
      detail: z.string().min(1).max(120), isDefault: z.boolean().optional(),
    }).parse(req.body)
    const mid = req.member!.mid
    const isDefault = body.isDefault || !get('SELECT id FROM member_address WHERE member_id = ?', mid)
    if (isDefault) run('UPDATE member_address SET is_default = 0 WHERE member_id = ?', mid)
    const r = run(
      'INSERT INTO member_address (member_id, name, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      mid, body.name, body.phone, body.province, body.city, body.district, body.detail, isDefault ? 1 : 0,
    )
    ok(res, { id: Number(r.lastInsertRowid) }, '地址已添加', 201)
  } catch (e) { next(e) }
})

/** PUT /shop/member/addresses/:id 更新地址 */
router.put('/addresses/:id', requireMember, (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const mid = req.member!.mid
    const addr = get('SELECT * FROM member_address WHERE id = ? AND member_id = ?', id, mid)
    if (!addr) throw notFound('地址不存在')
    const body = z.object({
      name: z.string().min(1).max(20).optional(), phone: z.string().min(5).max(20).optional(),
      province: z.string().max(30).optional(), city: z.string().max(30).optional(), district: z.string().max(30).optional(),
      detail: z.string().min(1).max(120).optional(), isDefault: z.boolean().optional(),
    }).parse(req.body)
    if (body.isDefault) run('UPDATE member_address SET is_default = 0 WHERE member_id = ?', mid)
    run(
      'UPDATE member_address SET name = ?, phone = ?, province = ?, city = ?, district = ?, detail = ?, is_default = ?, update_time = ? WHERE id = ?',
      body.name ?? addr.name, body.phone ?? addr.phone, body.province ?? addr.province,
      body.city ?? addr.city, body.district ?? addr.district, body.detail ?? addr.detail,
      body.isDefault !== undefined ? (body.isDefault ? 1 : 0) : addr.isDefault, now(), id,
    )
    ok(res, null, '地址已更新')
  } catch (e) { next(e) }
})

/** PUT /shop/member/addresses/:id/default 设为默认 */
router.put('/addresses/:id/default', requireMember, (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const mid = req.member!.mid
    if (!get('SELECT id FROM member_address WHERE id = ? AND member_id = ?', id, mid)) throw notFound('地址不存在')
    run('UPDATE member_address SET is_default = 0, update_time = ? WHERE member_id = ?', now(), mid)
    run('UPDATE member_address SET is_default = 1, update_time = ? WHERE id = ?', now(), id)
    ok(res, null, '默认地址已更新')
  } catch (e) { next(e) }
})

/** DELETE /shop/member/addresses/:id 删除地址 */
router.delete('/addresses/:id', requireMember, (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const mid = req.member!.mid
    const addr = get<Record<string, unknown>>('SELECT * FROM member_address WHERE id = ? AND member_id = ?', id, mid)
    if (!addr) throw notFound('地址不存在')
    run('DELETE FROM member_address WHERE id = ?', id)
    if (Number(addr.isDefault) === 1) {
      const first = get<{ id: number }>('SELECT id FROM member_address WHERE member_id = ? ORDER BY id DESC LIMIT 1', mid)
      if (first) run('UPDATE member_address SET is_default = 1 WHERE id = ?', first.id)
    }
    ok(res, null, '地址已删除')
  } catch (e) { next(e) }
})

// ===== 购物车 =====
/** GET /shop/member/cart 购物车（联查 SKU 实时价格） */
router.get('/cart', requireMember, (req, res, next) => {
  try {
    const list = all(
      `SELECT c.id, c.sku_id AS skuId, c.quantity, c.selected,
              s.sku_name AS skuName, s.price, s.original_price AS originalPrice, s.image AS mainImage,
              p.id AS spuId, p.name AS spuName
       FROM member_cart c JOIN product_sku s ON s.id = c.sku_id JOIN product_spu p ON p.id = s.spu_id
       WHERE c.member_id = ? ORDER BY c.id DESC`,
      req.member!.mid,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /shop/member/cart 加入购物车（body: { skuId, quantity? }） */
router.post('/cart', requireMember, (req, res, next) => {
  try {
    const body = z.object({ skuId: z.number().int(), quantity: z.number().int().min(1).optional() }).parse(req.body)
    const mid = req.member!.mid
    if (!get('SELECT id FROM product_sku WHERE id = ? AND status = 1', body.skuId)) throw badRequest('商品不存在或已下架')
    const existing = get('SELECT * FROM member_cart WHERE member_id = ? AND sku_id = ?', mid, body.skuId)
    if (existing) {
      run('UPDATE member_cart SET quantity = quantity + ?, update_time = ? WHERE id = ?', body.quantity ?? 1, now(), existing.id)
    } else {
      run('INSERT INTO member_cart (member_id, sku_id, quantity, selected) VALUES (?, ?, ?, 1)', mid, body.skuId, body.quantity ?? 1)
    }
    ok(res, null, '已加入购物车')
  } catch (e) { next(e) }
})

/** PUT /shop/member/cart/:skuId 更新数量/选中（body: { quantity?, selected? }） */
router.put('/cart/:skuId', requireMember, (req, res, next) => {
  try {
    const skuId = Number(req.params.skuId)
    const mid = req.member!.mid
    const item = get('SELECT * FROM member_cart WHERE member_id = ? AND sku_id = ?', mid, skuId)
    if (!item) throw notFound('购物车无此商品')
    const body = z.object({ quantity: z.number().int().min(1).optional(), selected: z.boolean().optional() }).parse(req.body)
    run('UPDATE member_cart SET quantity = ?, selected = ?, update_time = ? WHERE id = ?',
      body.quantity ?? item.quantity, body.selected !== undefined ? (body.selected ? 1 : 0) : item.selected, now(), item.id)
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** PUT /shop/member/cart/select-all 全选/全不选（body: { selected }） */
router.put('/cart/select-all', requireMember, (req, res, next) => {
  try {
    const selected = z.object({ selected: z.boolean() }).parse(req.body).selected
    run('UPDATE member_cart SET selected = ?, update_time = ? WHERE member_id = ?', selected ? 1 : 0, now(), req.member!.mid)
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** DELETE /shop/member/cart/:skuId 移除 */
router.delete('/cart/:skuId', requireMember, (req, res, next) => {
  try {
    run('DELETE FROM member_cart WHERE member_id = ? AND sku_id = ?', req.member!.mid, Number(req.params.skuId))
    ok(res, null, '已移除')
  } catch (e) { next(e) }
})

// ===== 收藏 =====
/** GET /shop/member/favorites 我的收藏（联查商品） */
router.get('/favorites', requireMember, (req, res, next) => {
  try {
    const list = all(
      `SELECT f.id, f.spu_id AS spuId, f.create_time AS createTime,
              p.name, p.main_image AS mainImage, p.description,
              (SELECT MIN(price) FROM product_sku s WHERE s.spu_id = p.id AND s.status = 1) AS minPrice
       FROM member_favorite f JOIN product_spu p ON p.id = f.spu_id
       WHERE f.member_id = ? ORDER BY f.id DESC`,
      req.member!.mid,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /shop/member/favorites 收藏（body: { spuId }） */
router.post('/favorites', requireMember, (req, res, next) => {
  try {
    const spuId = z.object({ spuId: z.number().int() }).parse(req.body).spuId
    if (!get('SELECT id FROM product_spu WHERE id = ?', spuId)) throw notFound('商品不存在')
    run('INSERT OR IGNORE INTO member_favorite (member_id, spu_id) VALUES (?, ?)', req.member!.mid, spuId)
    ok(res, null, '已收藏')
  } catch (e) { next(e) }
})

/** DELETE /shop/member/favorites/:spuId 取消收藏 */
router.delete('/favorites/:spuId', requireMember, (req, res, next) => {
  try {
    run('DELETE FROM member_favorite WHERE member_id = ? AND spu_id = ?', req.member!.mid, Number(req.params.spuId))
    ok(res, null, '已取消收藏')
  } catch (e) { next(e) }
})

// ===== 浏览历史 =====
/** GET /shop/member/history 浏览历史（联查商品，最近 50 条） */
router.get('/history', requireMember, (req, res, next) => {
  try {
    const list = all(
      `SELECT b.id, b.spu_id AS spuId, b.create_time AS createTime,
              p.name, p.main_image AS mainImage, p.description
       FROM member_browse b JOIN product_spu p ON p.id = b.spu_id
       WHERE b.member_id = ? ORDER BY b.id DESC LIMIT 50`,
      req.member!.mid,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /shop/member/history 记录浏览（body: { spuId }） */
router.post('/history', requireMember, (req, res, next) => {
  try {
    const spuId = z.object({ spuId: z.number().int() }).parse(req.body).spuId
    run('INSERT INTO member_browse (member_id, spu_id) VALUES (?, ?)', req.member!.mid, spuId)
    run(`DELETE FROM member_browse WHERE member_id = ? AND spu_id = ? AND id NOT IN (
           SELECT id FROM member_browse WHERE member_id = ? AND spu_id = ? ORDER BY id DESC LIMIT 1)`,
      req.member!.mid, spuId, req.member!.mid, spuId)
    ok(res, null, '已记录')
  } catch (e) { next(e) }
})

// ===== 消息通知 =====
/** GET /shop/member/notifications 通知列表（未读在前） */
router.get('/notifications', requireMember, (req, res, next) => {
  try {
    const list = all(
      `SELECT id, type, title, content, is_read AS isRead, create_time AS createTime
       FROM member_notification WHERE member_id = ? ORDER BY is_read, id DESC LIMIT 50`,
      req.member!.mid,
    )
    const unread = get<{ c: number }>('SELECT COUNT(*) AS c FROM member_notification WHERE member_id = ? AND is_read = 0', req.member!.mid)!.c
    ok(res, { list, unread })
  } catch (e) { next(e) }
})

/** POST /shop/member/notifications/read-all 全部已读 */
router.post('/notifications/read-all', requireMember, (req, res, next) => {
  try {
    run('UPDATE member_notification SET is_read = 1 WHERE member_id = ?', req.member!.mid)
    ok(res, null, '已全部标记为已读')
  } catch (e) { next(e) }
})

// ===== 提现收款账号 =====
/** GET /shop/member/payout-account 提现账号 */
router.get('/payout-account', requireMember, (req, res, next) => {
  try {
    const acc = get(
      `SELECT member_id AS memberId, bank_name AS bankName, bank_card AS bankCard, bank_holder AS bankHolder,
              alipay_name AS alipayName, alipay_account AS alipayAccount, update_time AS updateTime
       FROM payout_account WHERE member_id = ?`,
      req.member!.mid,
    ) || { memberId: req.member!.mid, bankName: '', bankCard: '', bankHolder: '', alipayName: '', alipayAccount: '', updateTime: '' }
    ok(res, acc)
  } catch (e) { next(e) }
})

/** PUT /shop/member/payout-account 保存提现账号 */
router.put('/payout-account', requireMember, (req, res, next) => {
  try {
    const body = z.object({
      bankName: z.string().max(30).optional(), bankCard: z.string().max(30).optional(), bankHolder: z.string().max(20).optional(),
      alipayName: z.string().max(20).optional(), alipayAccount: z.string().max(50).optional(),
    }).parse(req.body)
    const mid = req.member!.mid
    const cur = get<Record<string, unknown>>('SELECT * FROM payout_account WHERE member_id = ?', mid)
    if (cur) {
      run('UPDATE payout_account SET bank_name = ?, bank_card = ?, bank_holder = ?, alipay_name = ?, alipay_account = ?, update_time = ? WHERE member_id = ?',
        body.bankName ?? cur.bankName, body.bankCard ?? cur.bankCard, body.bankHolder ?? cur.bankHolder,
        body.alipayName ?? cur.alipayName, body.alipayAccount ?? cur.alipayAccount, now(), mid)
    } else {
      run('INSERT INTO payout_account (member_id, bank_name, bank_card, bank_holder, alipay_name, alipay_account) VALUES (?, ?, ?, ?, ?, ?)',
        mid, body.bankName ?? '', body.bankCard ?? '', body.bankHolder ?? '', body.alipayName ?? '', body.alipayAccount ?? '')
    }
    ok(res, null, '提现账号已保存')
  } catch (e) { next(e) }
})

// ===== 提现申请 =====
/** GET /shop/member/withdraws 我的提现记录 */
router.get('/withdraws', requireMember, (req, res, next) => {
  try {
    const list = all(
      `SELECT id, withdraw_no AS withdrawNo, amount, fee, actual_amount AS actualAmount,
              pay_type AS payType, bank_name AS bankName, bank_card AS bankCard, bank_holder AS bankHolder,
              alipay_name AS alipayName, alipay_account AS alipayAccount,
              status, audit_remark AS auditRemark, create_time AS createTime, pay_time AS payTime
       FROM withdraw WHERE member_id = ? ORDER BY id DESC`,
      req.member!.mid,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /shop/member/withdraws 申请提现（body: { amount, payType?: 0银行卡 1支付宝 }） */
router.post('/withdraws', requireMember, (req, res, next) => {
  try {
    const body = z.object({ amount: z.number().min(10), payType: z.union([z.literal(0), z.literal(1)]).optional() }).parse(req.body)
    const mid = req.member!.mid
    const wallet = get('SELECT balance FROM wallet WHERE member_id = ?', mid)
    if (!wallet) throw notFound('钱包不存在')
    if (Number(wallet.balance) < body.amount) throw badRequest('余额不足')
    const acc = get<Record<string, unknown>>('SELECT * FROM payout_account WHERE member_id = ?', mid)
    // 选择收款方式：默认银行卡；选支付宝则用支付宝账号
    const payType = body.payType === 1 ? 1 : 0
    const bankName = payType === 0 ? String(acc?.bankName || '') : ''
    const bankCard = payType === 0 ? String(acc?.bankCard || '') : ''
    const bankHolder = payType === 0 ? String(acc?.bankHolder || '') : ''
    const alipayName = payType === 1 ? String(acc?.alipayName || '') : ''
    const alipayAccount = payType === 1 ? String(acc?.alipayAccount || '') : ''
    if (payType === 0 && !bankCard) throw badRequest('请先在「提现账号」绑定银行卡')
    if (payType === 1 && !alipayAccount) throw badRequest('请先在「提现账号」绑定支付宝')
    const member = get<{ nickname: string }>('SELECT nickname FROM member WHERE id = ?', mid)
    const r = run(
      `INSERT INTO withdraw (withdraw_no, member_id, member_name, amount, fee, actual_amount, pay_type, bank_name, bank_card, bank_holder, alipay_name, alipay_account, status, create_time)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      genNo('TX'), mid, member?.nickname || '', body.amount, body.amount, payType,
      bankName, bankCard, bankHolder, alipayName, alipayAccount, now(),
    )
    run('UPDATE wallet SET balance = balance - ?, frozen = frozen + ? WHERE member_id = ?',
      body.amount, body.amount, mid)
    ok(res, { id: Number(r.lastInsertRowid) }, '提现申请已提交，等待审核')
  } catch (e) { next(e) }
})

export default router
