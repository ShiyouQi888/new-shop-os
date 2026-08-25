// ===== 提现管理 /api/v1/withdraws =====
import { Router } from 'express'
import { z } from 'zod'
import { get, run, paginate } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, int, str, now, genNo } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { logOperation } from './log.js'

const router = Router()
router.use(requireAuth)

/** GET /withdraws?page=&pageSize=&status=&keyword= */
router.get('/', (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const status = req.query.status === undefined || req.query.status === '' ? null : int(req.query.status)
    const keyword = str(req.query.keyword)

    const conds: string[] = []
    const params: (string | number)[] = []
    if (status !== null) { conds.push('w.status = ?'); params.push(status) }
    if (keyword) { conds.push('(w.withdraw_no LIKE ? OR w.member_name LIKE ? OR w.member_id = ?)'); params.push(`%${keyword}%`, `%${keyword}%`, int(keyword, -1)) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const data = paginate(
      `SELECT w.id, w.withdraw_no AS withdrawNo, w.member_id AS memberId, w.member_name AS memberName,
              w.amount, w.fee, w.actual_amount AS actualAmount, w.pay_type AS payType,
              w.bank_name AS bankName, w.bank_card AS bankCard, w.bank_holder AS bankHolder,
              w.alipay_name AS alipayName, w.alipay_account AS alipayAccount,
              w.status, w.audit_time AS auditTime, w.audit_remark AS auditRemark, w.pay_time AS payTime,
              w.transaction_no AS transactionNo, w.create_time AS createTime
       FROM withdraw w ${where} ORDER BY w.id DESC`,
      `SELECT COUNT(*) AS c FROM withdraw w ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** POST /withdraws/:id/audit 审核（body: { pass, remark }） */
router.post('/:id/audit', requirePermission('withdraw:audit'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const w = get<Record<string, unknown>>('SELECT * FROM withdraw WHERE id = ?', id)
    if (!w) throw notFound('提现单不存在')
    if (Number(w.status) !== 0) throw badRequest('仅待审核的提现单可审核')
    const body = z.object({ pass: z.boolean(), remark: z.string().max(200).optional() }).parse(req.body)
    if (!body.pass && !body.remark) throw badRequest('驳回时必须填写原因')
    const nextStatus = body.pass ? 1 : 3
    run('UPDATE withdraw SET status = ?, audit_time = ?, audit_remark = ? WHERE id = ?', nextStatus, now(), body.remark || '', id)
    logOperation(String(req.auth?.username || ''), '提现管理', body.pass ? '审核通过' : '驳回',
      `${body.pass ? '通过' : '驳回'}提现单 ${String(w.withdrawNo)}${body.remark ? '（' + body.remark + '）' : ''}`, String(req.ip || ''))
    ok(res, null, body.pass ? '审核通过，等待打款' : '已驳回')
  } catch (e) { next(e) }
})

/** POST /withdraws/:id/pay 打款（body: { transactionNo? }） */
router.post('/:id/pay', requirePermission('withdraw:audit'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const w = get<Record<string, unknown>>('SELECT * FROM withdraw WHERE id = ?', id)
    if (!w) throw notFound('提现单不存在')
    if (Number(w.status) !== 1) throw badRequest('仅审核通过待打款的提现单可打款')
    const body = z.object({ transactionNo: z.string().max(50).optional() }).parse(req.body)
    const txNo = body.transactionNo || genNo('LSH')
    run('UPDATE withdraw SET status = 2, pay_time = ?, transaction_no = ? WHERE id = ?', now(), txNo, id)
    logOperation(String(req.auth?.username || ''), '提现管理', '打款',
      `打款提现单 ${String(w.withdrawNo)}（交易号 ${txNo}）`, String(req.ip || ''))
    ok(res, null, '打款完成')
  } catch (e) { next(e) }
})

export default router
