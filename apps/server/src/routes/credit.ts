// ===== 领货额度 /api/v1/credits =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run, paginate, transaction } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, int, str, now, money } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { logOperation } from './log.js'

const router = Router()
router.use(requireAuth)

/** GET /credits?page=&pageSize=&status=&month=&keyword= */
router.get('/', requirePermission('credit:view'), (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const status = req.query.status === undefined || req.query.status === '' ? null : int(req.query.status)
    const month = str(req.query.month)
    const keyword = str(req.query.keyword)

    const conds: string[] = []
    const params: (string | number)[] = []
    if (status !== null) { conds.push('c.status = ?'); params.push(status) }
    if (month) { conds.push('c.month = ?'); params.push(month) }
    if (keyword) { conds.push('(m.nickname LIKE ? OR m.phone LIKE ? OR c.member_id = ?)'); params.push(`%${keyword}%`, `%${keyword}%`, int(keyword, -1)) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const data = paginate(
      `SELECT c.id, c.member_id AS memberId, c.month, c.credit_amount AS creditAmount, c.used_amount AS usedAmount,
              c.remain_amount AS remainAmount, c.status, c.remark, c.create_time AS createTime,
              m.nickname, m.avatar, m.phone, m.level
       FROM credit_record c LEFT JOIN member m ON m.id = c.member_id ${where} ORDER BY c.id DESC`,
      `SELECT COUNT(*) AS c FROM credit_record c LEFT JOIN member m ON m.id = c.member_id ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** POST /credits/:id/adjust 额度调整（body: { delta, reason }，delta 正增负减） */
router.post('/:id/adjust', requirePermission('credit:adjust'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const body = z.object({ delta: z.number(), reason: z.string().min(1).max(100) }).parse(req.body)
    const delta = money(body.delta)
    if (delta === 0) throw badRequest('调整金额不能为 0')
    const newRemain = transaction(() => {
      const rec = get<Record<string, unknown>>('SELECT * FROM credit_record WHERE id = ?', id)
      if (!rec) throw notFound('额度记录不存在')
      const oldCredit = Number(rec.creditAmount)
      const oldUsed = Number(rec.usedAmount)
      const oldRemain = Number(rec.remainAmount)
      const oldResellable = Number(rec.resellableAmount ?? 0)
      if (delta < 0 && Math.abs(delta) > oldRemain) throw badRequest('扣减金额不能超过当前剩余额度')
      const updatedCredit = money(oldCredit + delta)
      const updatedRemain = money(oldRemain + delta)
      const updatedResellable = money(Math.min(oldResellable, updatedRemain))
      if (updatedCredit < oldUsed || updatedRemain < 0) throw badRequest('调整后额度不能低于已使用额度')
      // 状态对齐前端枚举：0 待使用 1 部分使用 2 已用完；已消耗权益不可被后台调整回收。
      const nextStatus = updatedRemain <= 0 ? 2 : oldUsed <= 0 ? 0 : 1
      const ts = now()
      const changed = run(
        'UPDATE credit_record SET credit_amount = ?, remain_amount = ?, resellable_amount = ?, status = ?, update_time = ? WHERE id = ? AND credit_amount = ? AND used_amount = ? AND remain_amount = ? AND resellable_amount = ?',
        updatedCredit, updatedRemain, updatedResellable, nextStatus, ts, id, oldCredit, oldUsed, oldRemain, oldResellable,
      )
      if (Number(changed.changes) !== 1) throw badRequest('额度记录已变化，请刷新后重试')
      run('INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, operator_id, create_time) VALUES (?, ?, ?, ?, 3, ?, ?, ?)',
        id, rec.memberId, delta, updatedRemain, body.reason, req.auth!.uid, ts)
      logOperation(String(req.auth?.username || ''), '领货管理', '调整',
        `调整会员 ${rec.memberId} ${rec.month} 领货额度 ${delta > 0 ? '+' : ''}${delta}（${body.reason}）`, String(req.ip || ''))
      return updatedRemain
    })
    ok(res, { remainAmount: newRemain }, '额度已调整')
  } catch (e) { next(e) }
})

export default router
