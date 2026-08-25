import { all, get, run } from '../db/index.js'
import { badRequest } from '../utils/response.js'
import { genNo, now } from '../utils/index.js'
import { createPendingCommissions, scheduleOrderCommissions } from './distribution.js'
import { recordFinanceFlow } from './finance.js'

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
  const existing = get<Record<string, unknown>>('SELECT * FROM payment_order WHERE order_id = ? AND status = 0', input.orderId)
  const paymentNo = existing ? String(existing.paymentNo) : genNo('PAY')
  if (!existing) {
    run(
      'INSERT INTO payment_order (payment_no, order_id, member_id, pay_type, amount, status, create_time) VALUES (?, ?, ?, ?, ?, 0, ?)',
      paymentNo, input.orderId, input.memberId, input.payType, input.amount, now(),
    )
  }
  const amount = existing ? Number(existing.amount) : input.amount
  const payType = (existing ? String(existing.payType) : input.payType) as PayType
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
  run('UPDATE payment_order SET status = 1, trade_no = ?, pay_time = ? WHERE id = ?',
    `MOCK${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`, now(), pay.id)
  const order = get<{ orderType: number; orderNo: string; payAmount: number }>(
    'SELECT order_type AS orderType, order_no AS orderNo, pay_amount AS payAmount FROM "order" WHERE id = ?',
    pay.orderId,
  )
  const nextStatus = Number(order?.orderType) === 2 ? 3 : 1
  if (nextStatus === 3) {
    run('UPDATE "order" SET status = 3, pay_time = ?, finish_time = ? WHERE id = ?', now(), now(), pay.orderId)
  } else {
    run('UPDATE "order" SET status = 1, pay_time = ? WHERE id = ?', now(), pay.orderId)
  }
  if (order) recordFinanceFlow(1, Number(order.payAmount), order.orderNo, '订单支付收入')
  createPendingCommissions(Number(pay.orderId))
  if (nextStatus === 3) scheduleOrderCommissions(Number(pay.orderId))
  return { orderId: Number(pay.orderId), autoSuccess: config.mockAutoSuccess }
}
