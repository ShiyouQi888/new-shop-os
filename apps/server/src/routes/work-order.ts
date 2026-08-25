// ===== 客服工单 /api/v1/work-orders =====
import { Router } from 'express'
import { z } from 'zod'
import { get, run, paginate } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, int, str, now } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { logOperation } from './log.js'

const router = Router()
router.use(requireAuth)

router.get('/', requirePermission('workorder:view'), (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const status = req.query.status === undefined || req.query.status === '' ? null : int(req.query.status)
    const type = str(req.query.type)
    const keyword = str(req.query.keyword)
    const conds: string[] = []
    const params: (string | number)[] = []
    if (status !== null) { conds.push('w.status = ?'); params.push(status) }
    if (type) { conds.push('w.type = ?'); params.push(type) }
    if (keyword) {
      conds.push('(w.ticket_no LIKE ? OR w.title LIKE ? OR w.member_name LIKE ? OR w.phone LIKE ? OR w.member_id = ?)')
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, int(keyword, -1))
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const data = paginate(
      `SELECT w.id, w.ticket_no AS ticketNo, w.member_id AS memberId, w.member_name AS memberName,
              w.phone, w.type, w.title, w.content, w.images, w.priority, w.status,
              w.reply_content AS replyContent, w.handler, w.handle_time AS handleTime,
              w.close_time AS closeTime, w.create_time AS createTime, w.update_time AS updateTime
       FROM work_order w ${where} ORDER BY
       CASE w.status WHEN 0 THEN 0 WHEN 1 THEN 1 WHEN 2 THEN 2 ELSE 3 END,
       w.priority DESC, w.id DESC`,
      `SELECT COUNT(*) AS c FROM work_order w ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

router.get('/:id', requirePermission('workorder:view'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const row = get(
      `SELECT id, ticket_no AS ticketNo, member_id AS memberId, member_name AS memberName,
              phone, type, title, content, images, priority, status,
              reply_content AS replyContent, handler, handle_time AS handleTime,
              close_time AS closeTime, create_time AS createTime, update_time AS updateTime
       FROM work_order WHERE id = ?`,
      id,
    )
    if (!row) throw notFound('工单不存在')
    ok(res, row)
  } catch (e) { next(e) }
})

router.post('/:id/reply', requirePermission('workorder:handle'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const row = get<Record<string, unknown>>('SELECT * FROM work_order WHERE id = ?', id)
    if (!row) throw notFound('工单不存在')
    if (Number(row.status) === 3) throw badRequest('已关闭工单不可回复')
    const body = z.object({
      replyContent: z.string().min(1).max(1000),
      status: z.number().int().min(1).max(3).optional(),
    }).parse(req.body)
    const nextStatus = body.status ?? 2
    const ts = now()
    run(
      'UPDATE work_order SET reply_content = ?, status = ?, handler = ?, handle_time = ?, close_time = ?, update_time = ? WHERE id = ?',
      body.replyContent, nextStatus, String(req.auth?.username || ''), ts, nextStatus === 3 ? ts : null, ts, id,
    )
    run(
      'INSERT INTO member_notification (member_id, type, title, content, is_read, create_time) VALUES (?, ?, ?, ?, 0, ?)',
      Number(row.memberId), 'system', '客服工单已回复', `你的工单「${String(row.title)}」已有客服回复，请前往客服与帮助查看。`, ts,
    )
    logOperation(String(req.auth?.username || ''), '客服工单', '回复',
      `回复工单 ${String(row.ticketNo)}`, String(req.ip || ''))
    ok(res, null, nextStatus === 3 ? '工单已回复并关闭' : '工单已回复')
  } catch (e) { next(e) }
})

router.patch('/:id/status', requirePermission('workorder:handle'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const row = get<Record<string, unknown>>('SELECT * FROM work_order WHERE id = ?', id)
    if (!row) throw notFound('工单不存在')
    const body = z.object({ status: z.number().int().min(0).max(3) }).parse(req.body)
    const ts = now()
    run('UPDATE work_order SET status = ?, handler = ?, handle_time = ?, close_time = ?, update_time = ? WHERE id = ?',
      body.status, String(req.auth?.username || ''), ts, body.status === 3 ? ts : null, ts, id)
    ok(res, null, '工单状态已更新')
  } catch (e) { next(e) }
})

export default router
