import { all, run } from '../db/index.js'

export function restoreOrderStock(orderId: number) {
  const items = all<{ skuId: number; quantity: number }>(
    'SELECT sku_id AS skuId, quantity FROM order_item WHERE order_id = ? AND sku_id > 0',
    orderId,
  )
  for (const item of items) {
    run(
      'UPDATE product_sku SET stock = stock + ?, sales = CASE WHEN sales >= ? THEN sales - ? ELSE 0 END WHERE id = ?',
      item.quantity, item.quantity, item.quantity, item.skuId,
    )
  }
}
