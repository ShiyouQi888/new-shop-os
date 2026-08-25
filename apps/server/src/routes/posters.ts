// ===== 分销推广海报 /api/v1/posters（后台维护 + 公开读取） =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { now } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { logOperation } from './log.js'

const router = Router()
const QR_DEFAULT = { qrX: 38, qrY: 72, qrSize: 24 }
const posterLayoutSchema = {
  qrX: z.number().min(0).max(100).optional(),
  qrY: z.number().min(0).max(100).optional(),
  qrSize: z.number().min(8).max(60).optional(),
}

type PosterRow = {
  id: number
  title: string
  image: string
  status: number
  isFixed: number
  qrX: number
  qrY: number
  qrSize: number
  sort: number
  createTime: string
  updateTime: string
}

/** GET /posters 海报列表（后台，含停用） */
router.get('/', requireAuth, requirePermission('poster:config'), (_req, res, next) => {
  try {
    const list = all(
      `SELECT id, title, image, status, is_fixed AS isFixed, qr_x AS qrX, qr_y AS qrY, qr_size AS qrSize,
              sort, create_time AS createTime, update_time AS updateTime
       FROM promote_poster ORDER BY is_fixed DESC, sort ASC, id ASC`,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /posters 新增海报 */
router.post('/', requireAuth, requirePermission('poster:config'), (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().max(50).optional(),
      image: z.string().min(1),
      status: z.number().int().min(0).max(1).optional(),
      sort: z.number().int().min(0).optional(),
      ...posterLayoutSchema,
    }).parse(req.body)
    const r = run(
      `INSERT INTO promote_poster (title, image, status, qr_x, qr_y, qr_size, sort, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      body.title || '', body.image, body.status ?? 1,
      body.qrX ?? QR_DEFAULT.qrX, body.qrY ?? QR_DEFAULT.qrY, body.qrSize ?? QR_DEFAULT.qrSize,
      body.sort ?? 0, now(), now(),
    )
    logOperation(String(req.auth?.username || ''), '分销管理', '新增海报', `新增海报「${body.title || '未命名'}」`, String(req.ip || ''))
    ok(res, { id: Number(r.lastInsertRowid) }, '海报已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /posters/:id 编辑 */
router.put('/:id', requireAuth, requirePermission('poster:config'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const poster = get<PosterRow>('SELECT * FROM promote_poster WHERE id = ?', id)
    if (!poster) throw notFound('海报不存在')
    const body = z.object({
      title: z.string().max(50).optional(),
      image: z.string().min(1).optional(),
      status: z.number().int().min(0).max(1).optional(),
      sort: z.number().int().min(0).optional(),
      ...posterLayoutSchema,
    }).parse(req.body)
    run(
      `UPDATE promote_poster
       SET title = ?, image = ?, status = ?, qr_x = ?, qr_y = ?, qr_size = ?, sort = ?, update_time = ?
       WHERE id = ?`,
      body.title ?? poster.title, body.image ?? poster.image,
      body.status !== undefined ? body.status : poster.status,
      body.qrX !== undefined ? body.qrX : poster.qrX,
      body.qrY !== undefined ? body.qrY : poster.qrY,
      body.qrSize !== undefined ? body.qrSize : poster.qrSize,
      body.sort !== undefined ? body.sort : poster.sort, now(), id)
    logOperation(String(req.auth?.username || ''), '分销管理', '编辑海报', `编辑海报「${body.title ?? poster.title}」`, String(req.ip || ''))
    ok(res, null, '海报已更新')
  } catch (e) { next(e) }
})

/** PATCH /posters/:id/fixed 设为固定（唯一）或取消固定 */
router.patch('/:id/fixed', requireAuth, requirePermission('poster:config'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const poster = get<Record<string, unknown>>('SELECT * FROM promote_poster WHERE id = ?', id)
    if (!poster) throw notFound('海报不存在')
    const body = z.object({ fixed: z.boolean() }).parse(req.body)
    if (body.fixed) {
      // 固定唯一：清除其他海报的固定标记
      run('UPDATE promote_poster SET is_fixed = 0')
      run('UPDATE promote_poster SET is_fixed = 1, update_time = ? WHERE id = ?', now(), id)
    } else {
      run('UPDATE promote_poster SET is_fixed = 0, update_time = ? WHERE id = ?', now(), id)
    }
    logOperation(String(req.auth?.username || ''), '分销管理', body.fixed ? '固定海报' : '取消固定',
      `海报「${poster.title}」${body.fixed ? '设为固定' : '取消固定'}`, String(req.ip || ''))
    ok(res, null, body.fixed ? '已设为固定海报' : '已取消固定')
  } catch (e) { next(e) }
})

/** DELETE /posters/:id */
router.delete('/:id', requireAuth, requirePermission('poster:config'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const poster = get<Record<string, unknown>>('SELECT * FROM promote_poster WHERE id = ?', id)
    if (!poster) throw notFound('海报不存在')
    run('DELETE FROM promote_poster WHERE id = ?', id)
    logOperation(String(req.auth?.username || ''), '分销管理', '删除海报', `删除海报「${poster.title}」`, String(req.ip || ''))
    ok(res, null, '海报已删除')
  } catch (e) { next(e) }
})

export default router
