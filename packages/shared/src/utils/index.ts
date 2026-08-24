/**
 * 共享工具函数
 */
import dayjs from 'dayjs'

/**
 * 格式化金额 - ¥1,234.00
 */
export function formatMoney(amount: number | string, decimals = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '¥0.00'
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

/**
 * 格式化金额（不带¥符号）
 */
export function formatNumber(amount: number | string, decimals = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date | null, format = 'YYYY-MM-DD HH:mm'): string {
  if (!date) return '-'
  return dayjs(date).format(format)
}

/**
 * 短日期
 */
export function formatDateShort(date: string | Date | null): string {
  if (!date) return '-'
  return dayjs(date).format('MM-DD HH:mm')
}

/**
 * 相对时间
 */
export function timeAgo(date: string | Date): string {
  const d = dayjs(date)
  const now = dayjs()
  const diffSec = now.diff(d, 'second')
  if (diffSec < 60) return '刚刚'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}小时前`
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}天前`
  return d.format('YYYY-MM-DD')
}

/**
 * 生成订单号
 */
export function generateOrderNo(prefix = 'SF'): string {
  const date = dayjs().format('YYYYMMDDHHmmss')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}${date}${random}`
}

/**
 * 手机号脱敏
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 姓名脱敏
 */
export function maskName(name: string): string {
  if (!name) return name
  if (name.length === 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

/**
 * 计算折扣价
 * @param price 原价
 * @param discount 折扣率 90 = 9折
 */
export function calcDiscountPrice(price: number, discount: number): number {
  if (!discount || discount >= 100) return price
  const result = (price * discount) / 100
  return Math.round(result * 100) / 100
}

/**
 * 计算佣金
 * @param amount 订单金额
 * @param rate 佣金比例 15 = 15%
 */
export function calcCommission(amount: number, rate: number): number {
  const result = (amount * rate) / 100
  return Math.round(result * 100) / 100
}

/**
 * 计算转卖结算金额
 */
export function calcResellSettle(goodsValue: number, feeRate: number, shippingFee: number): { serviceFee: number; settleAmount: number } {
  const serviceFee = Math.round((goodsValue * feeRate) / 100 * 100) / 100
  const settleAmount = Math.round((goodsValue - serviceFee - shippingFee) * 100) / 100
  return { serviceFee, settleAmount }
}

/**
 * 防抖
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(null, args), delay)
  }
}

/**
 * 节流
 */
export function throttle<T extends (...args: any[]) => void>(fn: T, delay = 300): (...args: Parameters<T>) => void {
  let last = 0
  return function (...args: Parameters<T>) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(null, args)
    }
  }
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as T
  if (obj instanceof Object) {
    const cloned: Record<string, unknown> = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone((obj as Record<string, unknown>)[key])
      }
    }
    return cloned as T
  }
  return obj
}

/**
 * 下载文件
 */
export function downloadFile(url: string, filename?: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename || ''
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 生成随机ID
 */
export function genId(prefix = ''): string {
  return prefix + Math.random().toString(36).substring(2, 9)
}
