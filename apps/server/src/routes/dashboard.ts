// ===== 仪表盘统计 /api/v1/dashboard =====
import { Router } from 'express'
import { get, all } from '../db/index.js'
import { ok } from '../utils/response.js'
import { requireAuth } from '../middlewares/auth.js'
import { monthOf } from '../utils/index.js'

const router = Router()
router.use(requireAuth)

/** GET /dashboard/summary 运营总览 */
router.get('/summary', (_req, res, next) => {
  try {
    // create_time 等时间戳全部按本地时区写入（见 utils/index.ts 的 now()），"今日"也必须按本地时区计算，
    // 否则本地零点到早上 8 点这段时间 toISOString() 取到的还是 UTC 昨天，导致今日数据被算成 0 再突然跳变
    const now_ = new Date()
    const today = `${now_.getFullYear()}-${String(now_.getMonth() + 1).padStart(2, '0')}-${String(now_.getDate()).padStart(2, '0')}`
    const memberCount = get<{ c: number }>('SELECT COUNT(*) AS c FROM member')!.c
    const totalAgents = get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE level >= 1')!.c
    const todayMemberCount = get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE substr(created_at,1,10) = ?', today)!.c
    const orderCount = get<{ c: number }>('SELECT COUNT(*) AS c FROM "order"')!.c
    const todayOrders = get<{ c: number }>('SELECT COUNT(*) AS c FROM "order" WHERE substr(create_time,1,10) = ?', today)!.c
    const orderAmount = get<{ v: number }>('SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status IN (1,2,3)')!.v
    const todayOrderAmount = get<{ v: number }>('SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status IN (1,2,3) AND substr(create_time,1,10) = ?', today)!.v
    // 待发货是 status=1（待支付是 0），与 finance.ts 的 pendingShipCount 口径保持一致
    const pendingShip = get<{ c: number }>('SELECT COUNT(*) AS c FROM "order" WHERE status = 1')!.c
    const pendingWithdraw = get<{ c: number }>('SELECT COUNT(*) AS c FROM withdraw WHERE status = 0')!.c
    const activeResellOrders = get<{ c: number }>('SELECT COUNT(*) AS c FROM resell_order WHERE status IN (0,1,2)')!.c
    const commissionTotal = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status IN (0,1,2)')!.v
    const month = monthOf()
    const creditTotal = get<{ v: number }>('SELECT COALESCE(SUM(remain_amount),0) AS v FROM credit_record WHERE status IN (0,1) AND month = ?', month)!.v
    // "本月领货使用率"需限定当月，且已用完(status=2)的记录同样要计入分子分母，否则用得越好这个比例反而越低
    const creditUsed = get<{ v: number }>('SELECT COALESCE(SUM(used_amount),0) AS v FROM credit_record WHERE status IN (0,1,2) AND month = ?', month)!.v
    const creditGranted = get<{ v: number }>('SELECT COALESCE(SUM(credit_amount),0) AS v FROM credit_record WHERE status IN (0,1,2) AND month = ?', month)!.v
    const monthlyCreditUsage = creditGranted > 0 ? Math.round((creditUsed / creditGranted) * 100) : 0
    const levelDist = [
      { level: 1, count: get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE level = 1')!.c },
      { level: 2, count: get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE level = 2')!.c },
      { level: 3, count: get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE level = 3')!.c },
      { level: 4, count: get<{ c: number }>('SELECT COUNT(*) AS c FROM member WHERE level = 4')!.c },
    ]
    ok(res, {
      memberCount, totalAgents, todayMemberCount, orderCount, todayOrders, orderAmount, todayOrderAmount,
      pendingShip, pendingWithdraw, activeResellOrders, commissionTotal, creditTotal, monthlyCreditUsage, levelDist,
    })
  } catch (e) { next(e) }
})

/** GET /dashboard/trends?days=7 营收/订单趋势（近 N 天） */
router.get('/trends', (req, res, next) => {
  try {
    const days = Math.min(30, Math.max(7, Number(req.query.days) || 7))
    const list: { date: string; revenue: number; orders: number }[] = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const rev = get<{ v: number }>(
        'SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status IN (1,2,3) AND substr(create_time,1,10) = ?', date,
      )!.v
      const orders = get<{ c: number }>(
        'SELECT COUNT(*) AS c FROM "order" WHERE substr(create_time,1,10) = ?', date,
      )!.c
      list.push({ date: date.slice(5), revenue: Number(rev), orders })
    }
    ok(res, list)
  } catch (e) { next(e) }
})

export default router
