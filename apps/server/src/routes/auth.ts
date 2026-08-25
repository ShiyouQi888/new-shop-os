// ===== 认证模块 /api/v1/auth =====
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { get } from '../db/index.js'
import { ok, badRequest, unauthorized } from '../utils/response.js'
import { signToken, requireAuth } from '../middlewares/auth.js'
import { logLogin } from './log.js'

const router = Router()

/** POST /auth/login 管理员登录 */
router.post('/login', (req, res, next) => {
  try {
    const body = z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(req.body)
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').slice(0, 50)
    const device = String(req.headers['user-agent'] || '').slice(0, 120)
    const admin = get<{ id: number; username: string; passwordHash: string; name: string; role: string; avatar: string; status: number }>(
      'SELECT id, username, password_hash AS passwordHash, name, role, avatar, status FROM admin_user WHERE username = ?',
      body.username,
    )
    if (!admin || !bcrypt.compareSync(body.password, admin.passwordHash)) {
      logLogin(body.username, false, ip, device)
      throw unauthorized('账号或密码错误')
    }
    if (admin.status !== 1) {
      logLogin(body.username, false, ip, device)
      throw badRequest('账号已被禁用')
    }
    logLogin(body.username, true, ip, device)
    const token = signToken({ uid: admin.id, username: admin.username, role: admin.role as never })
    // 附带角色名称与权限码
    const role = get('SELECT name, permissions FROM admin_role WHERE code = ?', admin.role) as { name: string; permissions: string } | undefined
    const roleName = role?.name || admin.role
    const permissions = admin.role === 'super_admin'
      ? null
      : role ? JSON.parse(role.permissions || '[]') as string[] : []
    ok(res, {
      token,
      user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, roleName, avatar: admin.avatar },
      permissions,
    }, '登录成功')
  } catch (e) { next(e) }
})

/** GET /auth/me 当前登录管理员信息 */
router.get('/me', requireAuth, (req, res, next) => {
  try {
    const admin = get(
      'SELECT id, username, name, role, avatar, status FROM admin_user WHERE id = ?',
      req.auth!.uid,
    )
    if (!admin) throw unauthorized()
    const role = get('SELECT name, permissions FROM admin_role WHERE code = ?', admin.role) as { name: string; permissions: string } | undefined
    const roleName = role?.name || admin.role
    const permissions = admin.role === 'super_admin'
      ? null
      : role ? JSON.parse(role.permissions || '[]') as string[] : []
    ok(res, { ...admin, roleName, permissions })
  } catch (e) { next(e) }
})

/** POST /auth/logout 登出（JWT 无状态，前端移除凭证即可） */
router.post('/logout', (_req, res) => ok(res, null, '已退出登录'))

export default router
