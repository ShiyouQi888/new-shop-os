// ===== 转卖自动匹配：商城/入会礼包订单命中转卖商品池后，自动匹配最早的一笔待匹配转卖单 =====
import { get, all, run } from '../db/index.js'
import { now } from '../utils/index.js'

const autoMatchEnabled = () =>
  get<{ v: string }>('SELECT config_value AS v FROM system_config WHERE config_key = ?', 'resell.auto_match_enabled')?.v === '1'

/**
 * 订单支付成功后调用。只要订单内任意一件商品命中转卖商品池（不区分池子归属的等级，任意等级配置的商品都算），
 * 就视为"商城有一笔符合的成交"，按先进先出匹配当前最早的待匹配转卖单（不要求金额或商品完全对应，
 * 这与后台人工匹配长期以来的语义一致——匹配只是证明真实市场需求存在，结算金额始终由转卖单自己的额度和费率决定）。
 */
export function tryAutoMatchResell(orderId: number) {
  if (!autoMatchEnabled()) return
  const order = get<{ orderType: number }>('SELECT order_type AS orderType FROM "order" WHERE id = ?', orderId)
  if (!order || ![1, 2].includes(Number(order.orderType))) return

  const items = all<{ skuId: number }>('SELECT sku_id AS skuId FROM order_item WHERE order_id = ? AND sku_id > 0', orderId)
  if (!items.length) return
  const skuIds = [...new Set(items.map(i => i.skuId))]
  const placeholders = skuIds.map(() => '?').join(',')
  const hit = get(
    `SELECT 1 AS x FROM product_sku s JOIN resell_pool_item p ON p.spu_id = s.spu_id WHERE s.id IN (${placeholders}) LIMIT 1`,
    ...skuIds,
  )
  if (!hit) return

  const pending = get<{ id: number }>('SELECT id FROM resell_order WHERE status = 0 ORDER BY id ASC LIMIT 1')
  if (!pending) return

  run('UPDATE resell_order SET status = 2, match_order_id = ?, match_time = ?, auto_matched = 1 WHERE id = ?',
    orderId, now(), pending.id)
}
