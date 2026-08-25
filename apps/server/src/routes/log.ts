// ===== 后台日志 /api/v1/logs（操作日志 + 登录日志） =====
import { Router } from 'express'
import { all, get, run, paginate } from '../db/index.js'
import { ok } from '../utils/response.js'
import { parsePagination, str, int, now } from '../utils/index.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()
router.use(requireAuth)

/** GET /logs/operations?page=&pageSize=&keyword= 操作日志 */
router.get('/operations', (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const keyword = str(req.query.keyword)
    const where = keyword ? `WHERE operator LIKE ? OR module LIKE ? OR action LIKE ? OR description LIKE ? OR ip LIKE ?` : ''
    const like = `%${keyword}%`
    const params: string[] = keyword ? [like, like, like, like, like] : []
    const data = paginate(
      `SELECT id, operator, module, action, description, ip, create_time AS createTime
       FROM admin_log ${where} ORDER BY id DESC`,
      `SELECT COUNT(*) AS c FROM admin_log ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /logs/logins?page=&pageSize=&keyword=&success= 登录日志 */
router.get('/logins', (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const keyword = str(req.query.keyword)
    const success = req.query.success === undefined || req.query.success === '' ? null : (int(req.query.success) === 1 ? 1 : 0)
    const conds: string[] = []
    const params: (string | number)[] = []
    if (keyword) { conds.push('(username LIKE ? OR ip LIKE ? OR device LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`) }
    if (success !== null) { conds.push('success = ?'); params.push(success) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const data = paginate(
      `SELECT id, username, ip, device, success, create_time AS createTime
       FROM admin_login_log ${where} ORDER BY id DESC`,
      `SELECT COUNT(*) AS c FROM admin_login_log ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

export const logOperation = (operator: string, module: string, action: string, description: string, ip = '') => {
  run('INSERT INTO admin_log (operator, module, action, description, ip) VALUES (?, ?, ?, ?, ?)',
    operator, module, action, description, ip)
}

export const logLogin = (username: string, success: boolean, ip = '', device = '') => {
  run('INSERT INTO admin_login_log (username, ip, device, success) VALUES (?, ?, ?, ?)',
    username, ip, device, success ? 1 : 0)
}

export default router
