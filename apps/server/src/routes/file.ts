// ===== 文件管理 /api/v1/files + 文件分组 /api/v1/file-groups =====
import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'
import { z } from 'zod'
import { all, get, run, paginate } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, str, now, int } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { config } from '../config.js'

// ===== 上传 =====
fs.mkdirSync(config.uploadDir, { recursive: true })
/** 仅允许图片/视频，避免任意文件类型被 /uploads 静态目录当作可执行内容公开托管 */
const ALLOWED_MIME = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|webm))$/
/** multer/busboy 默认按 latin1 解析 multipart 头部字段，中文等非 ASCII 文件名会被错误解码成乱码，这里转回 utf8 */
const fixFileName = (name: string) => Buffer.from(name, 'latin1').toString('utf8')

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(fixFileName(file.originalname))}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.test(file.mimetype)) return cb(badRequest('仅支持上传图片或视频文件'))
    cb(null, true)
  },
})

/** 按分组规则自动归组 */
function matchGroup(fileName: string, mime: string): number | null {
  const ext = path.extname(fileName).slice(1).toLowerCase()
  const lower = fileName.toLowerCase()
  const isVideo = mime.startsWith('video/')
  const groups = all<{ id: number; matchRules: string }>('SELECT id, match_rules AS matchRules FROM file_group')
  for (const g of groups) {
    if (!g.matchRules) continue
    const rules = g.matchRules.split(',').map((r) => r.trim()).filter(Boolean)
    for (const rule of rules) {
      if (rule === 'video' && isVideo) return g.id
      if (rule === 'image' && !isVideo && mime.startsWith('image/')) return g.id
      if (rule && lower.includes(rule)) return g.id
    }
  }
  return null
}

export const fileRouter = Router()
fileRouter.use(requireAuth)

/** POST /files/upload 上传（multipart field: file；可选 groupId） */
fileRouter.post('/upload', requirePermission('system:file'), upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) throw badRequest('未收到文件')
    const f = req.file
    const originalName = fixFileName(f.originalname)
    const groupId = req.body.groupId ? int(req.body.groupId) : matchGroup(originalName, f.mimetype)
    const isVideo = f.mimetype.startsWith('video/')
    const r = run(
      `INSERT INTO file_asset (name, url, thumb_url, size, mime_type, ext, type, width, height, duration, group_id, uploader_id, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
      originalName, `${config.baseUrl}/uploads/${f.filename}`, isVideo ? '' : `${config.baseUrl}/uploads/${f.filename}`,
      f.size, f.mimetype, path.extname(originalName).slice(1).toLowerCase(), isVideo ? 2 : 1, groupId, req.auth!.uid, now(),
    )
    const id = Number(r.lastInsertRowid)
    const row = get('SELECT * FROM file_asset WHERE id = ?', id)
    ok(res, row, '上传成功', 201)
  } catch (e) { next(e) }
})

/** GET /files?page=&pageSize=&keyword=&type=&groupId= */
fileRouter.get('/', requirePermission('system:file'), (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const keyword = str(req.query.keyword)
    const rawType = req.query.type === undefined || req.query.type === '' ? '' : String(req.query.type)
    const type = rawType === 'image' ? 1 : rawType === 'video' ? 2 : rawType ? int(rawType) : null
    const groupId = req.query.groupId === undefined || req.query.groupId === '' ? null : int(req.query.groupId)

    const conds: string[] = []
    const params: (string | number)[] = []
    if (keyword) { conds.push('name LIKE ?'); params.push(`%${keyword}%`) }
    if (type !== null) { conds.push('type = ?'); params.push(type) }
    if (String(req.query.groupId) === 'null') conds.push('group_id IS NULL')
    else if (groupId !== null) { conds.push('group_id = ?'); params.push(groupId) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const data = paginate(
      `SELECT id, name, url, thumb_url AS thumbUrl, size, mime_type AS mimeType, ext, type,
              width, height, duration, group_id AS groupId, uploader_id AS uploaderId, create_time AS createTime
       FROM file_asset ${where} ORDER BY id DESC`,
      `SELECT COUNT(*) AS c FROM file_asset ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** PATCH /files/group 批量移动（body: { ids, groupId }）—— 需在 /:id 之前注册 */
fileRouter.patch('/group', requirePermission('system:file'), (req, res, next) => {
  try {
    const body = z.object({ ids: z.array(z.number().int()).min(1), groupId: z.number().nullable() }).parse(req.body)
    run(`UPDATE file_asset SET group_id = ? WHERE id IN (${body.ids.map(() => '?').join(',')})`, body.groupId, ...body.ids)
    ok(res, null, `已移动 ${body.ids.length} 个文件`)
  } catch (e) { next(e) }
})

/** PATCH /files/:id/group 移动分组（body: { groupId }，null 为未分组） */
fileRouter.patch('/:id/group', requirePermission('system:file'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM file_asset WHERE id = ?', id)) throw notFound('文件不存在')
    const body = z.object({ groupId: z.number().nullable() }).parse(req.body)
    run('UPDATE file_asset SET group_id = ? WHERE id = ?', body.groupId, id)
    ok(res, null, '已移动')
  } catch (e) { next(e) }
})

/** PATCH /files/:id/name 重命名 */
fileRouter.patch('/:id/name', requirePermission('system:file'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM file_asset WHERE id = ?', id)) throw notFound('文件不存在')
    const name = z.object({ name: z.string().min(1).max(100) }).parse(req.body).name
    run('UPDATE file_asset SET name = ? WHERE id = ?', name, id)
    ok(res, null, '已重命名')
  } catch (e) { next(e) }
})

/** DELETE /files/:id */
fileRouter.delete('/:id', requirePermission('system:file'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const f = get<Record<string, unknown>>('SELECT * FROM file_asset WHERE id = ?', id)
    if (!f) throw notFound('文件不存在')
    run('DELETE FROM file_asset WHERE id = ?', id)
    // 物理文件一并删除，避免"已删除"的资源仍可通过原始 URL 公开访问
    const fileName = String(f.url || '').split('/').pop()
    if (fileName) {
      fs.unlink(path.join(config.uploadDir, fileName), () => {})
    }
    ok(res, null, '已删除')
  } catch (e) { next(e) }
})

// ===== 文件分组 =====
export const fileGroupRouter = Router()
fileGroupRouter.use(requireAuth)

/** GET /file-groups */
fileGroupRouter.get('/', requirePermission('system:file'), (_req, res, next) => {
  try {
    const list = all(
      `SELECT g.id, g.name, g.icon, g.match_rules AS matchRules, g.create_time AS createTime,
              (SELECT COUNT(*) FROM file_asset f WHERE f.group_id = g.id) AS assetCount
       FROM file_group g ORDER BY g.id`,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /file-groups */
fileGroupRouter.post('/', requirePermission('system:file'), (req, res, next) => {
  try {
    const body = z.object({ name: z.string().min(1).max(20), icon: z.string().max(30).optional(), matchRules: z.string().max(100).optional() }).parse(req.body)
    const r = run('INSERT INTO file_group (name, icon, match_rules, create_time) VALUES (?, ?, ?, ?)',
      body.name, body.icon || 'folder', body.matchRules || '', now())
    ok(res, { id: Number(r.lastInsertRowid) }, '分组已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /file-groups/:id */
fileGroupRouter.put('/:id', requirePermission('system:file'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM file_group WHERE id = ?', id)) throw notFound('分组不存在')
    const body = z.object({ name: z.string().min(1).max(20).optional(), icon: z.string().max(30).optional(), matchRules: z.string().max(100).optional() }).parse(req.body)
    const cur = get<Record<string, unknown>>('SELECT * FROM file_group WHERE id = ?', id)!
    run('UPDATE file_group SET name = ?, icon = ?, match_rules = ? WHERE id = ?',
      body.name ?? cur.name, body.icon ?? cur.icon, body.matchRules ?? cur.matchRules, id)
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** DELETE /file-groups/:id（组内文件置为未分组） */
fileGroupRouter.delete('/:id', requirePermission('system:file'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!get('SELECT id FROM file_group WHERE id = ?', id)) throw notFound('分组不存在')
    run('UPDATE file_asset SET group_id = NULL WHERE group_id = ?', id)
    run('DELETE FROM file_group WHERE id = ?', id)
    ok(res, null, '分组已删除')
  } catch (e) { next(e) }
})

