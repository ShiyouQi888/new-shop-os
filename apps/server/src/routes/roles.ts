// ===== 角色管理 /api/v1/roles（管理员/角色管理页） =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, badRequest, conflict, notFound } from '../utils/response.js'
import { now } from '../utils/index.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'
import { logOperation } from './log.js'
import { PERMISSIONS, BUILTIN_ROLES } from '../permissions.js'

const router = Router()
router.use(requireAuth, requireRole('super_admin'))

/** GET /roles 角色列表 */
router.get('/', (_req, res, next) => {
  try {
    const list = all(
      `SELECT id, code, name, description, permissions, is_builtin AS isBuiltin, status,
              create_time AS createTime, update_time AS updateTime
       FROM admin_role ORDER BY is_builtin DESC, id ASC`,
    )
    ok(res, list.map(r => ({ ...r, permissions: JSON.parse(String(r.permissions || '[]')) })))
  } catch (e) { next(e) }
})

/** GET /roles/permission-tree 权限点清单（前端权限树） */
router.get('/permission-tree', (_req, res, next) => {
  try {
    const groups: { group: string; items: { code: string; name: string; desc?: string }[] }[] = []
    for (const p of PERMISSIONS) {
      const g = groups.find(x => x.group === p.group)
      if (g) g.items.push({ code: p.code, name: p.name, desc: p.desc })
      else groups.push({ group: p.group, items: [{ code: p.code, name: p.name, desc: p.desc }] })
    }
    ok(res, groups)
  } catch (e) { next(e) }
})

/** POST /roles 新增角色（body: { name, description?, permissions? }） */
router.post('/', (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(20),
      description: z.string().max(100).optional(),
      permissions: z.array(z.string()).optional(),
    }).parse(req.body)
    const code = `role_${Date.now().toString(36)}`
    if (get('SELECT id FROM admin_role WHERE name = ?', body.name)) throw conflict('角色名称已存在')
    const perms = body.permissions && body.permissions.length ? body.permissions : ['dashboard:view']
    const r = run(
      'INSERT INTO admin_role (code, name, description, permissions, is_builtin, status, create_time, update_time) VALUES (?, ?, ?, ?, 0, 1, ?, ?)',
      code, body.name, body.description || '', JSON.stringify(perms), now(), now(),
    )
    logOperation(String(req.auth?.username || ''), '权限管理', '新增角色', `新增角色「${body.name}」`, String(req.ip || ''))
    ok(res, { id: Number(r.lastInsertRowid) }, '角色已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /roles/:id 编辑角色 */
router.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const role = get<Record<string, unknown>>('SELECT * FROM admin_role WHERE id = ?', id)
    if (!role) throw notFound('角色不存在')
    const body = z.object({
      name: z.string().min(1).max(20).optional(),
      description: z.string().max(100).optional(),
      permissions: z.array(z.string()).optional(),
      status: z.number().int().min(0).max(1).optional(),
    }).parse(req.body)
    if (body.name && body.name !== role.name && get('SELECT id FROM admin_role WHERE name = ? AND id != ?', body.name, id)) {
      throw conflict('角色名称已存在')
    }
    if (role.code === 'super_admin' && body.status === 0) throw badRequest('超级管理员角色不可禁用')
    // 校验权限码合法性
    if (body.permissions) {
      const valid = new Set(PERMISSIONS.map(p => p.code))
      const invalid = body.permissions.filter(p => !valid.has(p))
      if (invalid.length) throw badRequest(`存在无效权限码：${invalid.join(', ')}`)
    }
    run(
      'UPDATE admin_role SET name = ?, description = ?, permissions = ?, status = ?, update_time = ? WHERE id = ?',
      body.name ?? role.name, body.description ?? role.description,
      body.permissions ? JSON.stringify(body.permissions) : role.permissions,
      body.status !== undefined ? body.status : role.status, now(), id,
    )
    logOperation(String(req.auth?.username || ''), '权限管理', '编辑角色', `编辑角色「${body.name ?? role.name}」`, String(req.ip || ''))
    ok(res, null, '角色已更新')
  } catch (e) { next(e) }
})

/** DELETE /roles/:id 删除角色 */
router.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const role = get<Record<string, unknown>>('SELECT * FROM admin_role WHERE id = ?', id)
    if (!role) throw notFound('角色不存在')
    if (Number(role.isBuiltin) === 1) throw badRequest('内置角色不可删除')
    const used = get('SELECT COUNT(*) AS c FROM admin_user WHERE role = ?', role.code)
    if (used && Number(used.c) > 0) throw badRequest('该角色下仍有管理员，请先转移后再删除')
    run('DELETE FROM admin_role WHERE id = ?', id)
    logOperation(String(req.auth?.username || ''), '权限管理', '删除角色', `删除角色「${role.name}」`, String(req.ip || ''))
    ok(res, null, '角色已删除')
  } catch (e) { next(e) }
})

/** POST /roles/seed-builtin 重置内置角色（幂等） */
router.post('/seed-builtin', (req, res, next) => {
  try {
    for (const b of BUILTIN_ROLES) {
      const exists = get('SELECT id FROM admin_role WHERE code = ?', b.code)
      if (exists) {
        run('UPDATE admin_role SET name = ?, description = ?, permissions = ? WHERE code = ?',
          b.name, b.description, JSON.stringify(b.permissions), b.code)
      } else {
        run('INSERT INTO admin_role (code, name, description, permissions, is_builtin, status, create_time, update_time) VALUES (?, ?, ?, ?, 1, 1, ?, ?)',
          b.code, b.name, b.description, JSON.stringify(b.permissions), now(), now())
      }
    }
    logOperation(String(req.auth?.username || ''), '权限管理', '重置内置角色', '重置全部内置角色为默认权限', String(req.ip || ''))
    ok(res, null, '内置角色已就绪')
  } catch (e) { next(e) }
})

export default router
