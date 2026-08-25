// ===== 管理员管理 /api/v1/admins =====
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { get, run, paginate } from '../db/index.js'
import { ok, badRequest, conflict, notFound } from '../utils/response.js'
import { parsePagination, str, now } from '../utils/index.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'
import { logOperation } from './log.js'
import { config } from '../config.js'

const router = Router()
router.use(requireAuth, requireRole('super_admin'))

/** GET /admins?page=&pageSize=&keyword= */
router.get('/', (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const keyword = str(req.query.keyword)
    const where = keyword ? `WHERE username LIKE ? OR name LIKE ?` : ''
    const like = `%${keyword}%`
    const params: (string | number)[] = keyword ? [like, like] : []
    const data = paginate(
      `SELECT a.id, a.username, a.name, a.role, a.avatar, a.status, a.created_at AS createdAt,
              COALESCE(r.name, a.role) AS roleName, r.is_builtin AS isBuiltin
       FROM admin_user a LEFT JOIN admin_role r ON r.code = a.role ${where} ORDER BY a.id DESC`,
      `SELECT COUNT(*) AS c FROM admin_user a ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /admins/:id */
router.get('/:id', (req, res, next) => {
  try {
    const admin = get('SELECT id, username, name, role, avatar, status, created_at AS createdAt FROM admin_user WHERE id = ?', Number(req.params.id))
    if (!admin) throw notFound('管理员不存在')
    ok(res, admin)
  } catch (e) { next(e) }
})

/** POST /admins 新增管理员 */
router.post('/', (req, res, next) => {
  try {
    const body = z.object({
      username: z.string().min(2).max(30),
      password: z.string().min(6).max(50),
      name: z.string().max(30).optional(),
      role: z.string().min(1).max(40).optional(),
    }).parse(req.body)
    if (get('SELECT id FROM admin_user WHERE username = ?', body.username)) throw conflict('账号已存在')
    const role = body.role || 'ops'
    if (role !== 'super_admin' && !get('SELECT id FROM admin_role WHERE code = ?', role)) throw badRequest('角色不存在')
    const res2 = run(
      'INSERT INTO admin_user (username, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
      body.username, bcrypt.hashSync(body.password, config.bcryptRounds), body.name || body.username, role, now(), now(),
    )
    logOperation(String(req.auth?.username || ''), '管理员管理', '新增', `新增管理员「${body.name || body.username}」`, String(req.ip || ''))
    ok(res, { id: Number(res2.lastInsertRowid) }, '管理员已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /admins/:id 编辑（密码可选） */
router.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const admin = get('SELECT * FROM admin_user WHERE id = ?', id)
    if (!admin) throw notFound('管理员不存在')
    if (admin.role === 'super_admin' && req.auth!.role !== 'super_admin') throw badRequest('仅超级管理员可编辑超级管理员')
    const body = z.object({
      name: z.string().max(30).optional(),
      role: z.string().min(1).max(40).optional(),
      password: z.string().min(6).max(50).optional(),
    }).parse(req.body)
    const name = body.name ?? admin.name
    const role = body.role ?? admin.role
    if (role !== 'super_admin' && !get('SELECT id FROM admin_role WHERE code = ?', role)) throw badRequest('角色不存在')
    const passwordHash = body.password ? bcrypt.hashSync(body.password, config.bcryptRounds) : admin.passwordHash
    run('UPDATE admin_user SET name = ?, role = ?, password_hash = ?, updated_at = ? WHERE id = ?', name, role, passwordHash, now(), id)
    logOperation(String(req.auth?.username || ''), '管理员管理', '编辑', `编辑管理员「${name}」`, String(req.ip || ''))
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** PATCH /admins/:id/status 启停 */
router.patch('/:id/status', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const admin = get('SELECT * FROM admin_user WHERE id = ?', id)
    if (!admin) throw notFound('管理员不存在')
    if (admin.role === 'super_admin') throw badRequest('超级管理员不可禁用')
    const status = z.object({ status: z.number().int().min(0).max(1) }).parse(req.body).status
    run('UPDATE admin_user SET status = ?, updated_at = ? WHERE id = ?', status, now(), id)
    ok(res, null, status ? '已启用' : '已禁用')
  } catch (e) { next(e) }
})

/** DELETE /admins/:id */
router.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const admin = get('SELECT * FROM admin_user WHERE id = ?', id)
    if (!admin) throw notFound('管理员不存在')
    if (admin.role === 'super_admin') throw badRequest('超级管理员不可删除')
    if (id === req.auth!.uid) throw badRequest('不能删除当前登录账号')
    run('DELETE FROM admin_user WHERE id = ?', id)
    ok(res, null, '已删除')
  } catch (e) { next(e) }
})

/** GET /admins/:id 排除 —— 防止与 :id 冲突的占位 */
export default router
