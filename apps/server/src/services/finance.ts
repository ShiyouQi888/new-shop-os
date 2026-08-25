import { get, run } from '../db/index.js'
import { genNo, money, now } from '../utils/index.js'

export type FinanceFlowType = 1 | 2 | 3 | 4 | 5

export function recordFinanceFlow(type: FinanceFlowType, amount: number, relatedNo: string, remark: string) {
  const value = money(amount)
  if (value === 0) return
  const last = get<{ balance: number }>('SELECT balance FROM finance_flow ORDER BY id DESC LIMIT 1')
  const balance = money(Number(last?.balance ?? 0) + value)
  run(
    'INSERT INTO finance_flow (flow_no, type, amount, balance, related_no, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
    genNo('FF'), type, value, balance, relatedNo, remark, now(),
  )
}
