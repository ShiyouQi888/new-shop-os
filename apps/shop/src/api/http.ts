/**
 * Shop HTTP 请求层：对接后端服务（http://localhost:3000/api/v1）
 * 公开接口 + 会员 JWT（登录后自动携带 Authorization: Bearer）
 */
import { showToast } from 'vant'

export const BASE_URL = 'http://localhost:3000/api/v1'

/** 会员 token 存储 key（user store 同步使用） */
export const MEMBER_TOKEN_KEY = 'shop_os_member_token'

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
  silent?: boolean
  /** 是否携带会员 token（默认 true） */
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

  // 会员 JWT：登录后自动携带
  if (opts.auth !== false) {
    const token = localStorage.getItem(MEMBER_TOKEN_KEY)
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(BASE_URL + url, { method, headers, body: payload })
  } catch {
    if (!opts.silent) showToast('网络异常，请确认后端服务已启动')
    throw new ApiError('网络异常', -1, 0)
  }

  let json: { code: number; message: string; data: T }
  try {
    json = await res.json()
  } catch {
    throw new ApiError('响应解析失败', -1, res.status)
  }

  // 401：会员登录态失效，清除 token
  if (res.status === 401) {
    localStorage.removeItem(MEMBER_TOKEN_KEY)
    if (!opts.silent) showToast(json.message || '登录已过期，请重新登录')
    throw new ApiError(json.message || '登录已过期', json.code ?? 40100, res.status)
  }

  if (json.code !== 0) {
    if (!opts.silent) showToast(json.message || '请求失败')
    throw new ApiError(json.message || '请求失败', json.code, res.status)
  }
  return json.data
}

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
}
