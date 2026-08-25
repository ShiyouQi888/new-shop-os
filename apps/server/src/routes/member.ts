// ===== 会员管理 /api/v1/members =====
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { get, paginate, all, run } from '../db/index.js'
import { ok, notFound, conflict, badRequest } from '../utils/response.js'
import { parsePagination, int, str, monthOf, now } from '../utils/index.js'
import { requireAuth } from '../middlewares/auth.js'
import { config } from '../config.js'

const router = Router()
router.use(requireAuth)

const MEMBER_SELECT = `
  SELECT m.id, m.username, m.nickname, m.avatar, m.phone, m.level, m.invite_code AS inviteCode,
         m.inviter_id AS inviterId, m.second_inviter_id AS secondInviterId, m.third_inviter_id AS thirdInviterId,
         m.status, m.real_name AS realName, m.register_time AS registerTime,
         m.become_agent_time AS becomeAgentTime, m.level_expire_time AS levelExpireTime,
         m.created_at AS createdAt,
         i.nickname AS inviterName, i.phone AS inviterPhone,
         w.balance, w.frozen, w.total_income AS totalIncome, w.total_withdraw AS totalWithdraw,
         pa.bank_name AS bankName, pa.bank_card AS bankCard, pa.bank_holder AS bankHolder,
         pa.alipay_name AS alipayName, pa.alipay_account AS alipayAccount
  FROM member m
  LEFT JOIN member i ON i.id = m.inviter_id
  LEFT JOIN wallet w ON w.member_id = m.id
  LEFT JOIN payout_account pa ON pa.member_id = m.id
`

/** GET /members?page=&pageSize=&keyword=&level=&status= */
router.get('/', (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const keyword = str(req.query.keyword)
    const level = req.query.level === undefined || req.query.level === '' ? null : int(req.query.level)
    const status = req.query.status === undefined || req.query.status === '' ? null : int(req.query.status)

    const conds: string[] = []
    const params: (string | number)[] = []
    if (keyword) {
      conds.push('(m.nickname LIKE ? OR m.phone LIKE ? OR m.invite_code LIKE ?)')
      const like = `%${keyword}%`
      params.push(like, like, like)
    }
    if (level !== null) { conds.push('m.level = ?'); params.push(level) }
    if (status !== null) { conds.push('m.status = ?'); params.push(status) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const data = paginate(
      `${MEMBER_SELECT} ${where} ORDER BY m.id DESC`,
      `SELECT COUNT(*) AS c FROM member m ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /members/:id 详情（含统计：订单数/消费/佣金/钱包） */
router.get('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const member = get(MEMBER_SELECT + ' WHERE m.id = ?', id)
    if (!member) throw notFound('会员不存在')
    const orderStat = get(
      `SELECT COUNT(*) AS orderCount, COALESCE(SUM(pay_amount),0) AS totalSpend FROM "order" WHERE member_id = ? AND status IN (1,2,3)`, id,
    )
    const commissionStat = get(
      `SELECT COUNT(*) AS commissionCount, COALESCE(SUM(amount),0) AS totalCommission FROM commission WHERE member_id = ? AND status IN (0,1,2)`, id,
    )
    const directCount = get('SELECT COUNT(*) AS c FROM member WHERE inviter_id = ?', id)
    const teamCount = get('SELECT COUNT(*) AS c FROM member WHERE inviter_id = ? OR second_inviter_id = ? OR third_inviter_id = ?', id, id, id)
    const recentOrders = all('SELECT id, order_no AS orderNo, order_type AS orderType, pay_amount AS payAmount, status, create_time AS createTime FROM "order" WHERE member_id = ? ORDER BY id DESC LIMIT 5', id)
    const recentCommissions = all('SELECT id, amount, distribution_level AS distributionLevel, status, create_time AS createTime FROM commission WHERE member_id = ? ORDER BY id DESC LIMIT 5', id)
    ok(res, {
      ...member,
      stats: { ...orderStat, ...commissionStat, directCount: directCount?.c ?? 0, teamCount: teamCount?.c ?? 0 },
      recentOrders,
      recentCommissions,
    })
  } catch (e) { next(e) }
})

/** GET /members/:id/wallet 钱包 */
router.get('/:id/wallet', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const wallet = get('SELECT id, member_id AS memberId, balance, frozen, total_income AS totalIncome, total_withdraw AS totalWithdraw FROM wallet WHERE member_id = ?', id)
    if (!wallet) throw notFound('钱包不存在')
    ok(res, wallet)
  } catch (e) { next(e) }
})

/** PATCH /members/:id/status 会员启停（1 正常 / 2 冻结） */
router.patch('/:id/status', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM member WHERE id = ?', id)) throw notFound('会员不存在')
    const status = z.object({ status: z.number().int().min(1).max(2) }).parse(req.body).status
    run('UPDATE member SET status = ? WHERE id = ?', status, id)
    ok(res, null, status === 2 ? '会员已冻结' : '会员已解冻')
  } catch (e) { next(e) }
})

/** POST /members 自定义创建会员（后台录入，代理商等级联动发放当月领货额度） */
router.post('/', (req, res, next) => {
  try {
    const body = z.object({
      nickname: z.string().min(1).max(20),
      phone: z.string().min(5).max(20),
      level: z.number().int().min(0),
      realName: z.string().max(20).optional(),
      // 登录密码（6-50 位，选填；留空默认 123456）
      password: z.string().min(6).max(50).optional(),
    }).parse(req.body)
    if (get('SELECT id FROM member WHERE phone = ?', body.phone)) throw conflict('该手机号已存在')
    if (body.level > 0 && !get('SELECT id FROM level_config WHERE level = ?', body.level)) throw badRequest('等级不存在，请先在等级权益配置中创建')

    const inviteCode = `SH${body.phone.slice(-4)}${Math.floor(Math.random() * 900 + 100)}`
    const passwordHash = bcrypt.hashSync(body.password || '123456', config.bcryptRounds)
    const r = run(
      `INSERT INTO member (phone, password_hash, nickname, avatar, level, invite_code, status, real_name, register_time, become_agent_time)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      body.phone, passwordHash, body.nickname, `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(body.nickname)}`,
      body.level, inviteCode, body.realName || '', now(), body.level > 0 ? now() : null,
    )
    const id = Number(r.lastInsertRowid)
    run('INSERT OR IGNORE INTO wallet (member_id, balance, frozen, total_income, total_withdraw) VALUES (?, 0, 0, 0, 0)', id)

    // 等级联动：代理商等级自动发放当月领货额度
    if (body.level > 0) {
      const lv = get<{ monthlyCredit: number }>('SELECT monthly_credit AS monthlyCredit FROM level_config WHERE level = ?', body.level)
      const credit = Number(lv?.monthlyCredit ?? 0)
      if (credit > 0) {
        const rec = run(
          'INSERT INTO credit_record (member_id, month, credit_amount, used_amount, remain_amount, status, remark, create_time) VALUES (?, ?, ?, 0, ?, 0, ?, ?)',
          id, monthOf(), credit, credit, '后台创建会员自动发放', now(),
        )
        run('INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, operator_id, create_time) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
          Number(rec.lastInsertRowid), id, credit, credit, '后台创建会员自动发放', req.auth!.uid, now())
      }
    }
    ok(res, get('SELECT id, phone, nickname, level, invite_code AS inviteCode FROM member WHERE id = ?', id), '会员创建成功', 201)
  } catch (e) { next(e) }
})

/** GET /members/:id/orders 订单记录 */
router.get('/:id/orders', (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const id = Number(req.params.id)
    const data = paginate(
      'SELECT id, order_no AS orderNo, order_type AS orderType, pay_amount AS payAmount, status, create_time AS createTime FROM "order" WHERE member_id = ? ORDER BY id DESC',
      'SELECT COUNT(*) AS c FROM "order" WHERE member_id = ?', [id], page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /members/:id/commissions 佣金记录 */
router.get('/:id/commissions', (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const id = Number(req.params.id)
    const data = paginate(
      `SELECT c.id, c.amount, c.rate, c.distribution_level AS distributionLevel, c.package_level AS packageLevel,
              c.status, c.create_time AS createTime, s.nickname AS sourceName
       FROM commission c LEFT JOIN member s ON s.id = c.source_member_id
       WHERE c.member_id = ? ORDER BY c.id DESC`,
      'SELECT COUNT(*) AS c FROM commission WHERE member_id = ?', [id], page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /members/:id/credits 领货额度 */
router.get('/:id/credits', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const list = all('SELECT id, member_id AS memberId, month, credit_amount AS creditAmount, used_amount AS usedAmount, remain_amount AS remainAmount, status, remark FROM credit_record WHERE member_id = ? ORDER BY month DESC', id)
    ok(res, list)
  } catch (e) { next(e) }
})

export default router
