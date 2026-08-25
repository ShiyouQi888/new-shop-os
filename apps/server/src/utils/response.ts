// ===== 统一响应与错误 =====
import type { Response } from 'express'

/** 业务码：0 成功，其余为业务错误码 */
export const CODE: Record<string, number> = {
  OK: 0,
  BAD_REQUEST: 40000,
  UNAUTHORIZED: 40100,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  CONFLICT: 40900,
  SERVER_ERROR: 50000,
}

export interface ApiBody<T = unknown> {
  code: number
  message: string
  data: T | null
}

/** 成功响应 */
export function ok<T>(res: Response, data: T | null = null, message = 'ok', status = 200) {
  const body: ApiBody<T> = { code: CODE.OK, message, data }
  res.status(status).json(body)
}

/** 失败响应 */
export function fail(res: Response, code: number, message: string, status = 400) {
  const body: ApiBody = { code, message, data: null }
  res.status(status).json(body)
}

/** 业务异常：在错误处理中间件中被捕获并转为统一响应 */
export class AppError extends Error {
  code: number
  status: number

  constructor(message: string, code = CODE.BAD_REQUEST, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function badRequest(message: string) {
  return new AppError(message, CODE.BAD_REQUEST, 400)
}

export function unauthorized(message = '未登录或登录已过期') {
  return new AppError(message, CODE.UNAUTHORIZED, 401)
}

export function forbidden(message = '无权访问') {
  return new AppError(message, CODE.FORBIDDEN, 403)
}

export function notFound(message = '资源不存在') {
  return new AppError(message, CODE.NOT_FOUND, 404)
}

export function conflict(message: string) {
  return new AppError(message, CODE.CONFLICT, 409)
}
