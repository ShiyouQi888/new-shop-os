import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  OrderStatus,
  OrderType,
  type GiftPackage,
  type Order,
  type OrderItem,
} from '@shop-os/shared'
import { useUserStore } from './user'
import { api } from '@/api'
import type { CartItem } from './cart'

type PayType = 'wechat' | 'alipay'

interface AddressSnapshot {
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
}

interface RetailOrderPayload {
  items: CartItem[]
  totalAmount: number
  discountAmount: number
  shippingFee: number
  payAmount: number
  payType: PayType
  address: AddressSnapshot
}

const nowText = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 后端订单行 → 前端 Order 结构（含 items 单行聚合） */
function toOrder(row: Record<string, unknown>): Order {
  const id = Number(row.id)
  const item: OrderItem = {
    id: id * 100 + 1,
    orderId: id,
    skuId: Number(row.skuId ?? 0),
    skuName: String(row.skuName || ''),
    quantity: Number(row.quantity ?? 1),
    originalPrice: Number(row.totalAmount ?? 0),
    memberPrice: Number(row.payAmount ?? 0),
    unitPrice: Number(row.payAmount ?? 0),
    totalPrice: Number(row.payAmount ?? 0),
    discountAmount: 0,
    sourceType: 1,
    resellOrderId: null,
  }
  const order: Order & { itemImage?: string } = {
    id,
    orderNo: String(row.orderNo || ''),
    memberId: Number(row.memberId ?? 0),
    orderType: Number(row.orderType ?? OrderType.Retail),
    totalAmount: Number(row.totalAmount ?? 0),
    discountAmount: Number(row.discountAmount ?? 0),
    couponAmount: 0,
    shippingFee: Number(row.shippingFee ?? 0),
    payAmount: Number(row.payAmount ?? 0),
    memberLevel: Number(row.memberLevel ?? 0),
    payType: null,
    payTime: row.payTime ? String(row.payTime) : null,
    status: Number(row.status ?? 0),
    receiverName: String(row.receiverName ?? ''),
    receiverPhone: String(row.receiverPhone ?? ''),
    receiverAddress: String(row.receiverAddress ?? ''),
    logisticsCompany: row.logisticsCompany ? String(row.logisticsCompany) : null,
    logisticsNo: row.logisticsNo ? String(row.logisticsNo) : null,
    shipTime: row.shipTime ? String(row.shipTime) : null,
    confirmTime: row.finishTime ? String(row.finishTime) : null,
    inviterId: null,
    remark: String(row.remark ?? ''),
    createTime: String(row.createTime ?? ''),
    items: [item],
    itemImage: row.itemImage ? String(row.itemImage) : '',
  }
  return order
}

export const useOrderStore = defineStore('orders', () => {
  const userStore = useUserStore()
  const orders = ref<Order[]>([])

  const list = computed(() => orders.value)

  /** 从后端拉取当前会员订单 */
  const loadOrders = async () => {
    if (!userStore.member) { orders.value = []; return }
    try {
      const rows = await api.getOrders(userStore.member.id)
      orders.value = (rows as unknown as Record<string, unknown>[]).map(toOrder)
    } catch {
      /* 静默 */
    }
  }

  // 登录态变化时刷新订单
  watch(() => userStore.member?.id, () => { loadOrders() }, { immediate: true })

  /** 创建零售订单（后端落库，返回前端可用的 Order 结构） */
  const createRetailOrder = async (payload: RetailOrderPayload): Promise<Order> => {
    if (!userStore.member) throw new Error('请先登录后再提交订单')
    const res = await api.createOrder({
      memberId: userStore.member.id,
      items: payload.items.map(it => ({ skuId: it.skuId, quantity: it.quantity })),
      receiverName: payload.address.name,
      receiverPhone: payload.address.phone,
      receiverAddress: `${payload.address.province}${payload.address.city}${payload.address.district}${payload.address.detail}`,
      remark: payload.payType === 'alipay' ? '支付宝支付' : '微信支付',
    })
    const order = toOrder({
      id: res.orderId, orderNo: `SO${Date.now()}`, memberId: userStore.member.id,
      orderType: OrderType.Retail, totalAmount: payload.totalAmount,
      discountAmount: payload.discountAmount, shippingFee: payload.shippingFee,
      payAmount: payload.payAmount, status: OrderStatus.PendingPayment,
      skuName: payload.items[0]?.skuName || '', quantity: payload.items.reduce((s, i) => s + i.quantity, 0),
      receiverName: payload.address.name, receiverPhone: payload.address.phone,
      receiverAddress: `${payload.address.province}${payload.address.city}${payload.address.district}${payload.address.detail}`,
      createTime: nowText(),
    })
    orders.value.unshift(order)
    return order
  }

  /** 创建礼包订单（后端落库 + 开通代理商权益） */
  const createGiftPackageOrder = async (pkg: GiftPackage, payType: PayType): Promise<Order> => {
    if (!userStore.member) throw new Error('请先登录后再开通代理商权益')
    const res = await api.createOrder({
      memberId: userStore.member.id,
      giftPackageId: pkg.id,
      receiverName: userStore.member.nickname,
      receiverPhone: userStore.member.phone,
      receiverAddress: '权益订单无需物流配送',
    })
    const order = toOrder({
      id: res.orderId, orderNo: `GP${Date.now()}`, memberId: userStore.member.id,
      orderType: OrderType.GiftPackage, totalAmount: pkg.price, discountAmount: 0,
      shippingFee: 0, payAmount: pkg.price, status: OrderStatus.PendingPayment,
      skuName: pkg.name, quantity: 1, receiverName: userStore.member.nickname,
      receiverPhone: userStore.member.phone, receiverAddress: '权益订单无需物流配送',
      createTime: nowText(),
    })
    orders.value.unshift(order)
    await loadOrders()
    return order
  }

  /** 支付订单 */
  const payOrder = async (orderId: number, _payType: PayType) => {
    await api.payOrder(orderId)
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      order.status = OrderStatus.PaidPendingShip
      order.payTime = nowText()
    }
    await loadOrders()
    return order ?? null
  }

  /** 确认收货 */
  const confirmReceived = async (orderId: number) => {
    await api.confirmOrder(orderId)
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      order.status = OrderStatus.Completed
      order.confirmTime = nowText()
    }
    await loadOrders()
    return order ?? null
  }

  /** 取消订单 */
  const cancelOrder = async (orderId: number) => {
    await api.cancelOrder(orderId)
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      order.status = OrderStatus.Cancelled
    }
    await loadOrders()
    return order ?? null
  }

  /** 再次购买：基于订单商品构造（用于加购） */
  const getRebuyItems = (order: Order) => order.items.map(item => ({
    sku: { id: item.skuId, spuId: 0, skuName: item.skuName, price: item.unitPrice, stock: 99 } as unknown as import('@shop-os/shared').ProductSKU,
    spu: { id: 0, name: item.skuName, mainImage: '', status: 1 } as unknown as import('@shop-os/shared').ProductSPU,
  }))

  return {
    list,
    createRetailOrder,
    createGiftPackageOrder,
    payOrder,
    confirmReceived,
    cancelOrder,
    getRebuyItems,
    loadOrders,
  }
})
