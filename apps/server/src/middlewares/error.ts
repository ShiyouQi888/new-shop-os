// ===== 全局错误处理 =====
import type { Request, Response, NextFunction } from 'express'
import { AppError, CODE, fail } from '../utils/response.js'

/** 404 兜底 */
export function notFoundHandler(_req: Request, res: Response) {
  fail(res, CODE.NOT_FOUND, '接口不存在', 404)
}

/** 统一错误处理 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return fail(res, err.code, err.message, err.status)
  }
  // Zod 校验错误
  if (err && typeof err === 'object' && 'issues' in (err as object)) {
    const zod = err as { issues: { path: (string | number)[]; message: string }[] }
    const first = zod.issues[0]
    const msg = first ? `${first.path.join('.')}: ${first.message}` : '参数校验失败'
    return fail(res, CODE.BAD_REQUEST, msg, 400)
  }
  // multer 错误
  if (err instanceof Error && err.name === 'MulterError') {
    return fail(res, CODE.BAD_REQUEST, `上传失败：${err.message}`, 400)
  }
  console.error('[server]', err)
  return fail(res, CODE.SERVER_ERROR, '服务器内部错误', 500)
}
