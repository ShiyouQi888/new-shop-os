// ===== 鉴权中间件 =====
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { forbidden, unauthorized } from '../utils/response.js'
import { get } from '../db/index.js'

export interface AuthPayload {
  uid: number      // admin_user.id
  username: string
  role: string     // 角色编码
}

/** 会员端 JWT 载荷 */
export interface MemberAuthPayload {
  type: 'member'
  mid: number      // member.id
  phone: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload
      member?: MemberAuthPayload
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthPayload
  } catch {
    return null
  }
}

/** 签发会员 token（有效期 30 天） */
export function signMemberToken(payload: MemberAuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' as jwt.SignOptions['expiresIn'] })
}

/** 校验会员 token */
export function verifyMemberToken(token: string): MemberAuthPayload | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as MemberAuthPayload
    return payload?.type === 'member' ? payload : null
  } catch {
    return null
  }
}

/** 必须登录 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const payload = token ? verifyToken(token) : null
  if (!payload) return next(unauthorized())
  req.auth = payload
  next()
}

/** 会员端必须登录（Bearer 会员 token） */
export function requireMember(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const payload = token ? verifyMemberToken(token) : null
  if (!payload) return next(unauthorized('请先登录'))
  req.member = payload
  next()
}

/** 必须为指定角色（在 requireAuth 之后使用） */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized())
    if (!roles.includes(req.auth.role)) return next(forbidden(`仅限 ${roles.join('/')} 角色访问`))
    next()
  }
}

/** 必须拥有指定权限码（在 requireAuth 之后使用；super_admin 恒通过） */
export function requirePermission(code: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized())
    if (req.auth.role === 'super_admin') return next()
    // 从角色表加载权限
    const role = get('SELECT permissions FROM admin_role WHERE code = ?', req.auth.role) as { permissions: string } | undefined
    const perms = role ? JSON.parse(role.permissions || '[]') as string[] : []
    if (perms.includes(code)) return next()
    next(forbidden(`无权限执行该操作（${code}）`))
  }
}

/** 满足任一权限即可（super_admin 恒通过） */
export function requireAnyPermission(...codes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized())
    if (req.auth.role === 'super_admin') return next()
    const role = get('SELECT permissions FROM admin_role WHERE code = ?', req.auth.role) as { permissions: string } | undefined
    const perms = role ? JSON.parse(role.permissions || '[]') as string[] : []
    if (codes.some(code => perms.includes(code))) return next()
    next(forbidden(`无权限执行该操作（${codes.join('/')}）`))
  }
}
