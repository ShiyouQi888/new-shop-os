import { get, run, transaction } from '../db/index.js'
import { genNo, money, now } from '../utils/index.js'

export type FinanceFlowType = 1 | 2 | 3 | 4 | 5

export async function lockFinanceLedger() {
  await get('SELECT pg_advisory_xact_lock(2026110301)')
}

export async function recordFinanceFlow(type: FinanceFlowType, amount: number, relatedNo: string, remark: string) {
  const value = money(amount)
  if (value === 0) return
  await transaction(async () => {
    // The balance is a global running ledger. Serialize writers until the row is inserted.
    await lockFinanceLedger()
    const last = (await get<{ balance: number }>('SELECT balance FROM finance_flow ORDER BY id DESC LIMIT 1'))
    const balance = money(Number(last?.balance ?? 0) + value)
    await run(
      'INSERT INTO finance_flow (flow_no, type, amount, balance, related_no, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      genNo('FF'), type, value, balance, relatedNo, remark, now(),
    )
  })
}
