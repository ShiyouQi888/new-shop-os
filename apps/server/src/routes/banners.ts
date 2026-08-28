// ===== 商城首页轮播图 /api/v1/banners（后台维护，前台读取见 shop.ts 的 /shop/home） =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, notFound } from '../utils/response.js'
import { now } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { logOperation } from './log.js'

const router = Router()

type BannerRow = {
  id: number
  title: string
  image: string
  link: string
  status: number
  sort: number
  createTime: string
  updateTime: string
}

/** GET /banners 轮播图列表（后台，含停用） */
router.get('/', requireAuth, requirePermission('banner:config'), (_req, res, next) => {
  try {
    const list = all(
      `SELECT id, title, image, link, status, sort, create_time AS createTime, update_time AS updateTime
       FROM home_banner ORDER BY sort ASC, id ASC`,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /banners 新增轮播图 */
router.post('/', requireAuth, requirePermission('banner:config'), (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().max(50).optional(),
      image: z.string().min(1),
      link: z.string().max(200).optional(),
      status: z.number().int().min(0).max(1).optional(),
      sort: z.number().int().min(0).optional(),
    }).parse(req.body)
    const r = run(
      `INSERT INTO home_banner (title, image, link, status, sort, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      body.title || '', body.image, body.link || '', body.status ?? 1, body.sort ?? 0, now(), now(),
    )
    logOperation(String(req.auth?.username || ''), '商城管理', '新增轮播图', `新增轮播图「${body.title || '未命名'}」`, String(req.ip || ''))
    ok(res, { id: Number(r.lastInsertRowid) }, '轮播图已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /banners/:id 编辑 */
router.put('/:id', requireAuth, requirePermission('banner:config'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const banner = get<BannerRow>('SELECT * FROM home_banner WHERE id = ?', id)
    if (!banner) throw notFound('轮播图不存在')
    const body = z.object({
      title: z.string().max(50).optional(),
      image: z.string().min(1).optional(),
      link: z.string().max(200).optional(),
      status: z.number().int().min(0).max(1).optional(),
      sort: z.number().int().min(0).optional(),
    }).parse(req.body)
    run(
      `UPDATE home_banner SET title = ?, image = ?, link = ?, status = ?, sort = ?, update_time = ? WHERE id = ?`,
      body.title ?? banner.title, body.image ?? banner.image, body.link ?? banner.link,
      body.status !== undefined ? body.status : banner.status,
      body.sort !== undefined ? body.sort : banner.sort, now(), id,
    )
    logOperation(String(req.auth?.username || ''), '商城管理', '编辑轮播图', `编辑轮播图「${body.title ?? banner.title}」`, String(req.ip || ''))
    ok(res, null, '轮播图已更新')
  } catch (e) { next(e) }
})

/** DELETE /banners/:id */
router.delete('/:id', requireAuth, requirePermission('banner:config'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const banner = get<BannerRow>('SELECT * FROM home_banner WHERE id = ?', id)
    if (!banner) throw notFound('轮播图不存在')
    run('DELETE FROM home_banner WHERE id = ?', id)
    logOperation(String(req.auth?.username || ''), '商城管理', '删除轮播图', `删除轮播图「${banner.title || '未命名'}」`, String(req.ip || ''))
    ok(res, null, '轮播图已删除')
  } catch (e) { next(e) }
})

export default router
