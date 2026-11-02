import { all, get, run, transaction } from '../db/index.js'
import { badRequest } from '../utils/response.js'
import { genNo, monthOf, money, now } from '../utils/index.js'
import { createPendingCommissions } from './distribution.js'
import { recordFinanceFlow } from './finance.js'
import { grantConsumptionCredit, finalizeCreditRedeem } from './credit.js'
import { tryAutoMatchResell } from './resellMatch.js'

export type PayType = 'wechat' | 'alipay'
export type PaymentMode = 'mock' | 'real'

export interface PaymentOrderInput {
  orderId: number
  memberId: number
  payType: PayType
  amount: number
}

export interface PaymentCreateResult {
  paymentNo: string
  payType: PayType
  amount: number
  status: number
  mode: PaymentMode
  provider: 'mock' | PayType
  mock: boolean
  credential: Record<string, unknown>
}

type SystemConfigRow = { key: string; value: string }

const PAYMENT_KEYS: [string, string, string][] = [
  ['payment.mode', 'mock', '支付模式：mock 模拟 / real 真实网关'],
  ['payment.mock_auto_success', '1', '模拟支付是否自动成功：1 是 / 0 否'],
  ['payment.wechat.enabled', '0', '微信支付启用状态：1 启用 / 0 关闭'],
  ['payment.wechat.app_id', '', '微信支付 AppID'],
  ['payment.wechat.mch_id', '', '微信支付商户号'],
  ['payment.wechat.api_v3_key', '', '微信支付 APIv3 密钥'],
  ['payment.wechat.cert_serial_no', '', '微信支付证书序列号'],
  ['payment.wechat.notify_url', '', '微信支付回调地址'],
  ['payment.alipay.enabled', '0', '支付宝启用状态：1 启用 / 0 关闭'],
  ['payment.alipay.app_id', '', '支付宝 AppID'],
  ['payment.alipay.merchant_private_key', '', '支付宝应用私钥'],
  ['payment.alipay.alipay_public_key', '', '支付宝公钥'],
  ['payment.alipay.gateway', 'https://openapi.alipay.com/gateway.do', '支付宝网关地址'],
  ['payment.alipay.notify_url', '', '支付宝回调地址'],
]

export function ensurePaymentConfigs() {
  const stmt = 'INSERT OR IGNORE INTO system_config (config_key, config_value, config_group, description, update_time) VALUES (?, ?, ?, ?, ?)'
  for (const [key, value, desc] of PAYMENT_KEYS) {
    run(stmt, key, value, 'payment', desc, now())
  }
}

function getPaymentConfig() {
  const rows = all<SystemConfigRow>('SELECT config_key AS key, config_value AS value FROM system_config WHERE config_group = ?', 'payment')
  const map = new Map(rows.map(row => [row.key, row.value]))
  const value = (key: string, fallback = '') => map.get(key) ?? fallback
  const mode: PaymentMode = value('payment.mode', 'mock') === 'real' ? 'real' : 'mock'
  return {
    mode,
    mockAutoSuccess: value('payment.mock_auto_success', '1') !== '0',
    wechat: {
      enabled: value('payment.wechat.enabled') === '1',
      appId: value('payment.wechat.app_id'),
      mchId: value('payment.wechat.mch_id'),
      apiV3Key: value('payment.wechat.api_v3_key'),
      certSerialNo: value('payment.wechat.cert_serial_no'),
      notifyUrl: value('payment.wechat.notify_url'),
    },
    alipay: {
      enabled: value('payment.alipay.enabled') === '1',
      appId: value('payment.alipay.app_id'),
      merchantPrivateKey: value('payment.alipay.merchant_private_key'),
      alipayPublicKey: value('payment.alipay.alipay_public_key'),
      gateway: value('payment.alipay.gateway', 'https://openapi.alipay.com/gateway.do'),
      notifyUrl: value('payment.alipay.notify_url'),
    },
  }
}

/** 当前支付模式；退款审核只能在已接通退款能力的通道上完成资金状态变更。 */
export function getPaymentMode(): PaymentMode {
  ensurePaymentConfigs()
  return getPaymentConfig().mode
}

function createMockCredential(paymentNo: string, amount: number) {
  return {
    paymentNo,
    amount,
    nextAction: 'simulate',
    message: '当前为模拟支付通道，不会产生真实扣款。',
  }
}

function assertRealProviderReady(payType: PayType) {
  const config = getPaymentConfig()
  if (payType === 'wechat') {
    const missing = [
      ['AppID', config.wechat.appId],
      ['商户号', config.wechat.mchId],
      ['APIv3 密钥', config.wechat.apiV3Key],
      ['证书序列号', config.wechat.certSerialNo],
      ['回调地址', config.wechat.notifyUrl],
    ].filter(([, value]) => !value).map(([label]) => label)
    if (!config.wechat.enabled) throw badRequest('微信支付未启用，请先在后台支付配置中开启')
    if (missing.length) throw badRequest(`微信支付配置不完整：${missing.join('、')}`)
  }
  if (payType === 'alipay') {
    const missing = [
      ['AppID', config.alipay.appId],
      ['应用私钥', config.alipay.merchantPrivateKey],
      ['支付宝公钥', config.alipay.alipayPublicKey],
      ['网关地址', config.alipay.gateway],
      ['回调地址', config.alipay.notifyUrl],
    ].filter(([, value]) => !value).map(([label]) => label)
    if (!config.alipay.enabled) throw badRequest('支付宝未启用，请先在后台支付配置中开启')
    if (missing.length) throw badRequest(`支付宝配置不完整：${missing.join('、')}`)
  }
}

function createRealCredential(paymentNo: string, payType: PayType, amount: number) {
  assertRealProviderReady(payType)
  return {
    paymentNo,
    amount,
    nextAction: 'gateway',
    message: payType === 'wechat'
      ? '微信支付配置已就绪，下一步可接入 JSAPI/H5/APP 拉起参数。'
      : '支付宝配置已就绪，下一步可接入 WAP/APP 支付请求参数。',
  }
}

export function createPayment(input: PaymentOrderInput): PaymentCreateResult {
  ensurePaymentConfigs()
  const config = getPaymentConfig()
  const payment = transaction(() => {
    const order = get<{ memberId: number; status: number; payAmount: number }>(
      'SELECT member_id AS memberId, status, pay_amount AS payAmount FROM "order" WHERE id = ?', input.orderId,
    )
    if (!order || Number(order.memberId) !== input.memberId) throw badRequest('订单不存在或无权操作')
    if (Number(order.status) !== 0) throw badRequest('仅待支付订单可创建支付单')
    if (money(Number(order.payAmount)) !== money(input.amount)) throw badRequest('支付金额与订单金额不一致')
    const existing = get<Record<string, unknown>>('SELECT * FROM payment_order WHERE order_id = ? AND status = 0', input.orderId)
    if (existing) return { paymentNo: String(existing.paymentNo), amount: Number(existing.amount), payType: String(existing.payType) as PayType }
    const paymentNo = genNo('PAY')
    run(
      'INSERT INTO payment_order (payment_no, order_id, member_id, pay_type, amount, status, create_time) VALUES (?, ?, ?, ?, ?, 0, ?)',
      paymentNo, input.orderId, input.memberId, input.payType, input.amount, now(),
    )
    return { paymentNo, amount: input.amount, payType: input.payType }
  })
  const { paymentNo, amount, payType } = payment
  const mock = config.mode === 'mock'
  const credential = mock ? createMockCredential(paymentNo, amount) : createRealCredential(paymentNo, payType, amount)
  return {
    paymentNo,
    payType,
    amount,
    status: 0,
    mode: config.mode,
    provider: mock ? 'mock' : payType,
    mock,
    credential,
  }
}

export function completeMockPayment(paymentNo: string, memberId: number) {
  ensurePaymentConfigs()
  const config = getPaymentConfig()
  if (config.mode !== 'mock') throw badRequest('当前不是模拟支付模式，不能使用模拟回调')
  const pay = get<Record<string, unknown>>('SELECT * FROM payment_order WHERE payment_no = ?', paymentNo)
  if (!pay) throw badRequest('支付单不存在')
  if (Number(pay.memberId) !== memberId) throw badRequest('无权操作')
  if (Number(pay.status) !== 0) throw badRequest('支付单已处理')
  const order = get<{ status: number; orderType: number; orderNo: string; payAmount: number }>(
    'SELECT status, order_type AS orderType, order_no AS orderNo, pay_amount AS payAmount FROM "order" WHERE id = ?',
    pay.orderId,
  )
  // 订单可能已经通过旧版 /orders/:id/pay 路径完成支付：这里必须再校验订单自身状态，
  // 否则一张滞留在 status=0 的支付单会被重复处理，导致收入与消费返还额度被二次记账
  if (!order || Number(order.status) !== 0) throw badRequest('订单已处理，无需重复支付')
  transaction(() => {
    const paidAt = now()
    const paymentUpdate = run(
      'UPDATE payment_order SET status = 1, trade_no = ?, pay_time = ? WHERE id = ? AND status = 0',
      `MOCK${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`, paidAt, pay.id,
    )
    if (Number(paymentUpdate.changes) !== 1) throw badRequest('支付单已处理')
    const orderUpdate = run('UPDATE "order" SET status = 1, pay_time = ? WHERE id = ? AND status = 0', paidAt, pay.orderId)
    if (Number(orderUpdate.changes) !== 1) throw badRequest('订单已处理，无需重复支付')

    // 支付只代表资金到账，礼包和其他实物订单都必须进入待发货；确认收货后才开始佣金售后期。
    recordFinanceFlow(1, Number(order.payAmount), order.orderNo, '订单支付收入')
    createPendingCommissions(Number(pay.orderId))
    grantConsumptionCredit(Number(pay.orderId))
    tryAutoMatchResell(Number(pay.orderId))
    if (Number(order.orderType) === 3) finalizeCreditRedeem(Number(pay.orderId))
    if (Number(order.orderType) === 2) activateGiftPackage(Number(pay.orderId), memberId)
  })
  return { orderId: Number(pay.orderId), autoSuccess: config.mockAutoSuccess }
}

export function activateGiftPackage(orderId: number, memberId: number) {
  const order = get<{ memberId: number; status: number; orderType: number }>(
    'SELECT member_id AS memberId, status, order_type AS orderType FROM "order" WHERE id = ?', orderId,
  )
  if (!order || Number(order.memberId) !== memberId || Number(order.orderType) !== 2 || Number(order.status) !== 1) return
  const packageLevel = get<{ level: number }>('SELECT member_level AS level FROM order_item WHERE order_id = ? LIMIT 1', orderId)?.level
  if (!packageLevel || Number(packageLevel) <= 0) return
  const member = get<{ level: number }>('SELECT level FROM member WHERE id = ?', memberId)
  if (!member || Number(member.level) >= Number(packageLevel)) return
  const level = get<{ monthlyCredit: number }>('SELECT monthly_credit AS monthlyCredit FROM level_config WHERE level = ? AND status = 1', packageLevel)
  if (!level) throw badRequest('礼包对应的会员等级已停用，无法开通权益')
  const changed = run('UPDATE member SET level = ?, become_agent_time = ? WHERE id = ? AND level < ?',
    packageLevel, now(), memberId, packageLevel)
  if (Number(changed.changes) !== 1) throw badRequest('会员等级已发生变化，请刷新后查看')
  const credit = Number(level.monthlyCredit ?? 0)
  if (credit <= 0) return
  const ts = now()
  const month = monthOf()
  const existing = get<{ id: number; usedAmount: number; remainAmount: number; resellableAmount: number }>(
    'SELECT id, used_amount AS usedAmount, remain_amount AS remainAmount, resellable_amount AS resellableAmount FROM credit_record WHERE member_id = ? AND month = ?',
    memberId, month,
  )
  let recordId: number
  let remain: number
  if (existing) {
    remain = money(Number(existing.remainAmount) + credit)
    const resellable = money(Number(existing.resellableAmount ?? 0) + credit)
    run('UPDATE credit_record SET credit_amount = credit_amount + ?, remain_amount = ?, resellable_amount = ?, status = ?, update_time = ? WHERE id = ?',
      credit, remain, resellable, Number(existing.usedAmount) > 0 ? 1 : 0, ts, existing.id)
    recordId = existing.id
  } else {
    const inserted = run(
      `INSERT INTO credit_record (member_id, month, credit_amount, used_amount, remain_amount, resellable_amount, status, remark, create_time)
       VALUES (?, ?, ?, 0, ?, ?, 0, ?, ?)`,
      memberId, month, credit, credit, credit, '入会礼包支付后自动发放', ts,
    )
    recordId = Number(inserted.lastInsertRowid)
    remain = credit
  }
  run('INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, order_id, create_time) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
    recordId, memberId, credit, remain, '入会礼包支付后自动发放', orderId, ts)
}
