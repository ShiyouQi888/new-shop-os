/**
 * HTTP 请求层：对接后端服务（http://localhost:3000/api/v1）
 * - 统一 REST 请求封装（GET/POST/PUT/PATCH/DELETE/上传）
 * - 自动携带 JWT（Authorization: Bearer）
 * - 统一解析后端响应 { code, message, data }
 * - 401 自动清除登录态并跳转登录页
 */
import { ElMessage } from 'element-plus'
import { getToken, clearAuth } from '@/utils/auth'

export const BASE_URL = 'http://localhost:3000/api/v1'

export class ApiError extends Error {
  code: number
  status: number
  constructor(message: string, code = -1, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

interface RequestOptions {
  /** 跳过统一错误提示（由调用方自行处理） */
  silent?: boolean
  /** 是否带鉴权头 */
  auth?: boolean
}

async function request<T>(method: string, url: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  let payload: BodyInit | undefined

  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  if (opts.auth !== false) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(BASE_URL + url, { method, headers, body: payload })
  } catch {
    if (!opts.silent) ElMessage.error('网络异常，请确认后端服务已启动（localhost:3000）')
    throw new ApiError('网络异常', -1, 0)
  }

  let json: { code: number; message: string; data: T }
  try {
    json = await res.json()
  } catch {
    throw new ApiError('响应解析失败', -1, res.status)
  }

  // 401：登录态失效
  if (res.status === 401) {
    clearAuth()
    if (!opts.silent) ElMessage.warning('登录已过期，请重新登录')
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new ApiError(json.message || '未登录', json.code ?? 40100, res.status)
  }

  if (json.code !== 0) {
    if (!opts.silent) ElMessage.error(json.message || '请求失败')
    throw new ApiError(json.message || '请求失败', json.code, res.status)
  }
  return json.data
}

/** query 对象 → URL 查询串（跳过空值） */
function toQuery(params?: Record<string, unknown>): string {
  if (!params) return ''
  const parts: string[] = []
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

export const http = {
  get: <T>(url: string, params?: Record<string, unknown>, opts?: RequestOptions) =>
    request<T>('GET', url + toQuery(params), undefined, opts),
  post: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('POST', url, body, opts),
  put: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PUT', url, body, opts),
  patch: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', url, body, opts),
  delete: <T>(url: string, opts?: RequestOptions) =>
    request<T>('DELETE', url, undefined, opts),
  /** 文件上传（FormData） */
  upload: <T>(url: string, formData: FormData, opts?: RequestOptions) =>
    request<T>('POST', url, formData, opts),
}
