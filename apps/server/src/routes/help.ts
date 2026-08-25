// ===== 帮助/规则文档 /api/v1/help（前台公开展示 + 后台维护） =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run } from '../db/index.js'
import { ok, notFound } from '../utils/response.js'
import { str, now } from '../utils/index.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

/** 解析 scope（help 帮助 / rules 规则），默认 help */
const parseScope = (v: unknown): 'help' | 'rules' => (v === 'rules' ? 'rules' : 'help')

/** GET /help?scope=help|rules 公开：启用的文档列表（前台 /mine/help 与 /mine/rules） */
router.get('/', (req, res, next) => {
  try {
    const scope = parseScope(req.query.scope)
    const list = all(
      'SELECT id, title, category, sort, create_time AS createTime FROM help_article WHERE status = 1 AND scope = ? ORDER BY sort, id',
      scope,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** GET /help/:id 公开：文档详情（前台展开内容） */
router.get('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const doc = get('SELECT id, scope, title, category, content, sort, status, create_time AS createTime, update_time AS updateTime FROM help_article WHERE id = ? AND status = 1', id)
    if (!doc) throw notFound('文档不存在或已下线')
    ok(res, doc)
  } catch (e) { next(e) }
})

// ===== 以下为后台维护接口（需登录） =====

/** GET /help/admin/list?scope= 后台：全量列表（含停用，keyword 筛选） */
router.get('/admin/list', requireAuth, (req, res, next) => {
  try {
    const scope = parseScope(req.query.scope)
    const keyword = str(req.query.keyword)
    const conds = ['scope = ?']
    const params: unknown[] = [scope]
    if (keyword) {
      conds.push('(title LIKE ? OR content LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    const list = all(
      `SELECT id, title, category, sort, status, create_time AS createTime, update_time AS updateTime FROM help_article WHERE ${conds.join(' AND ')} ORDER BY sort, id`,
      ...params,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /help 后台：新增（scope: help 帮助 / rules 规则） */
router.post('/', requireAuth, (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(1).max(60),
      category: z.string().max(20).optional(),
      content: z.string().max(5000).optional(),
      sort: z.number().int().optional(),
      scope: z.enum(['help', 'rules']).optional(),
    }).parse(req.body)
    const r = run(
      'INSERT INTO help_article (scope, title, category, content, sort, status, create_time, update_time) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      body.scope || 'help', body.title, body.category || 'general', body.content || '', body.sort ?? 0, now(), now(),
    )
    ok(res, { id: Number(r.lastInsertRowid) }, '文档已创建', 201)
  } catch (e) { next(e) }
})

/** PUT /help/:id 后台：编辑 */
router.put('/:id', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const cur = get<Record<string, unknown>>('SELECT * FROM help_article WHERE id = ?', id)
    if (!cur) throw notFound('文档不存在')
    const body = z.object({
      title: z.string().min(1).max(60).optional(),
      category: z.string().max(20).optional(),
      content: z.string().max(5000).optional(),
      sort: z.number().int().optional(),
      status: z.number().int().min(0).max(1).optional(),
      scope: z.enum(['help', 'rules']).optional(),
    }).parse(req.body)
    run('UPDATE help_article SET scope = ?, title = ?, category = ?, content = ?, sort = ?, status = ?, update_time = ? WHERE id = ?',
      body.scope ?? cur.scope, body.title ?? cur.title, body.category ?? cur.category, body.content ?? cur.content,
      body.sort ?? cur.sort, body.status ?? cur.status, now(), id)
    ok(res, null, '已更新')
  } catch (e) { next(e) }
})

/** DELETE /help/:id 后台：删除 */
router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id)
    run('DELETE FROM help_article WHERE id = ?', id)
    ok(res, null, '已删除')
  } catch (e) { next(e) }
})

export default router
