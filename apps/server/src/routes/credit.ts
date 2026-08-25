// ===== 领货额度 /api/v1/credits =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run, paginate } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, int, str, now } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { logOperation } from './log.js'

const router = Router()
router.use(requireAuth)

/** GET /credits?page=&pageSize=&status=&month=&keyword= */
router.get('/', (req, res, next) => {
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
      `SELECT COUNT(*) AS c FROM credit_record c ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** POST /credits/:id/adjust 额度调整（body: { delta, reason }，delta 正增负减） */
router.post('/:id/adjust', requirePermission('credit:adjust'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const rec = get<Record<string, unknown>>('SELECT * FROM credit_record WHERE id = ?', id)
    if (!rec) throw notFound('额度记录不存在')
    const body = z.object({ delta: z.number(), reason: z.string().min(1).max(100) }).parse(req.body)
    if (body.delta === 0) throw badRequest('调整金额不能为 0')
    const newRemain = Math.max(0, Number(rec.remainAmount) + body.delta)
    const newCredit = Math.max(0, Number(rec.creditAmount) + body.delta)
    // 状态对齐前端枚举：0 待使用 1 部分使用 2 已用完
    const nextStatus = newRemain <= 0 ? 2 : newRemain >= newCredit && body.delta > 0 ? 0 : 1
    run('UPDATE credit_record SET credit_amount = ?, remain_amount = ?, status = ?, update_time = ? WHERE id = ?',
      newCredit, newRemain, nextStatus, now(), id)
    run('INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, operator_id, create_time) VALUES (?, ?, ?, ?, 3, ?, ?, ?)',
      id, rec.memberId, body.delta, newRemain, body.reason, req.auth!.uid, now())
    logOperation(String(req.auth?.username || ''), '领货管理', '调整',
      `调整会员 ${rec.memberId} ${rec.month} 领货额度 ${body.delta > 0 ? '+' : ''}${body.delta}（${body.reason}）`, String(req.ip || ''))
    ok(res, { remainAmount: newRemain }, '额度已调整')
  } catch (e) { next(e) }
})

export default router
