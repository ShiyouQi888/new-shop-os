// ===== 通用工具 =====
import { AppError, badRequest } from './response.js'

/** 解析并校验分页参数，page>=1, pageSize 1-100 */
export function parsePagination(query: Record<string, unknown>) {
  const page = clampInt(query.page, 1, 1, 100000)
  const pageSize = clampInt(query.pageSize, 10, 1, 100)
  return { page, pageSize }
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

/** 解析字符串数字（undefined/空串 → fallback） */
export function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** 解析整数 */
export function int(v: unknown, fallback = 0): number {
  return Math.trunc(num(v, fallback))
}

/** 字符串裁剪 */
export function str(v: unknown, max = 255): string {
  if (v === null || v === undefined) return ''
  return String(v).trim().slice(0, max)
}

/** 生成业务单号：前缀 + 时间 + 随机 */
export function genNo(prefix: string): string {
  const d = new Date()
  const pad = (n: number, l = 2) => String(n).padStart(l, '0')
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}${ts}${rand}`
}

/** 金额保留两位 */
export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** 当前时间 'YYYY-MM-DD HH:mm:ss' */
export function now(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 月份 'YYYY-MM' */
export function monthOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** 解析 JSON 字段，失败返回 fallback */
export function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== 'string' || !v) return fallback
  try {
    return JSON.parse(v) as T
  } catch {
    return fallback
  }
}

/** 数字数组去重 */
export function uniqueNumbers(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.map((x) => Number(x)).filter((x) => Number.isFinite(x)))]
}

export { AppError }
