import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  MemberLevel,
  OrderStatus,
  OrderType,
  generateOrderNo,
  mockOrders,
  mockProducts,
  mockSkus,
  type GiftPackage,
  type Order,
  type OrderItem,
} from '@shop-os/shared'
import { useUserStore } from './user'
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

const payTypeCode = (payType: PayType) => payType === 'alipay' ? 2 : 1

export const useOrderStore = defineStore('orders', () => {
  const userStore = useUserStore()
  const orders = ref<Order[]>(mockOrders.map(order => ({ ...order, items: order.items.map(item => ({ ...item })) })))

  const list = computed(() => {
    if (!userStore.member) return []
    return orders.value.filter(order => order.memberId === userStore.member!.id)
  })

  const createRetailOrder = (payload: RetailOrderPayload) => {
    if (!userStore.member) {
      throw new Error('请先登录后再提交订单')
    }
    const id = Date.now()
    const orderItems: OrderItem[] = payload.items.map((item, index) => ({
      id: id + index + 1,
      orderId: id,
      skuId: item.skuId,
      skuName: item.skuName,
      quantity: item.quantity,
      originalPrice: item.price,
      memberPrice: item.memberPrice,
      unitPrice: item.memberPrice,
      totalPrice: Number((item.memberPrice * item.quantity).toFixed(2)),
      discountAmount: Number(((item.price - item.memberPrice) * item.quantity).toFixed(2)),
      sourceType: 1,
      resellOrderId: null,
    }))

    const order: Order = {
      id,
      orderNo: generateOrderNo('SFRT'),
      memberId: userStore.member.id,
      orderType: OrderType.Retail,
      totalAmount: payload.totalAmount,
      discountAmount: payload.discountAmount,
      couponAmount: 0,
      shippingFee: payload.shippingFee,
      payAmount: payload.payAmount,
      memberLevel: userStore.member.level,
      payType: null,
      payTime: null,
      status: OrderStatus.PendingPayment,
      receiverName: payload.address.name,
      receiverPhone: payload.address.phone,
      receiverAddress: `${payload.address.province}${payload.address.city}${payload.address.district}${payload.address.detail}`,
      logisticsCompany: null,
      logisticsNo: null,
      shipTime: null,
      confirmTime: null,
      inviterId: userStore.member.inviterId,
      remark: `模拟订单，待使用${payload.payType === 'alipay' ? '支付宝' : '微信'}支付`,
      createTime: nowText(),
      items: orderItems,
    }

    orders.value.unshift(order)
    return order
  }

  const createGiftPackageOrder = (pkg: GiftPackage, payType: PayType) => {
    if (!userStore.member) {
      throw new Error('请先登录后再开通代理商权益')
    }
    const id = Date.now()
    const sku = mockSkus.find(s => s.spuId === pkg.spuId)
    const order: Order = {
      id,
      orderNo: generateOrderNo('SFGP'),
      memberId: userStore.member.id,
      orderType: OrderType.GiftPackage,
      totalAmount: pkg.price,
      discountAmount: 0,
      couponAmount: 0,
      shippingFee: 0,
      payAmount: pkg.price,
      memberLevel: userStore.member.level,
      payType: payTypeCode(payType),
      payTime: nowText(),
      status: OrderStatus.Completed,
      receiverName: userStore.member.nickname,
      receiverPhone: userStore.member.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      receiverAddress: '权益订单无需物流配送',
      logisticsCompany: null,
      logisticsNo: null,
      shipTime: null,
      confirmTime: nowText(),
      inviterId: userStore.member.inviterId,
      remark: '模拟大礼包入会订单，支付后权益即时生效',
      createTime: nowText(),
      items: [{
        id: id + 1,
        orderId: id,
        skuId: sku?.id || pkg.spuId,
        skuName: pkg.name,
        quantity: 1,
        originalPrice: pkg.price,
        memberPrice: pkg.price,
        unitPrice: pkg.price,
        totalPrice: pkg.price,
        discountAmount: 0,
        sourceType: 1,
        resellOrderId: null,
      }],
    }

    orders.value.unshift(order)
    userStore.upgradeToAgent(pkg.level)
    return order
  }

  const payOrder = (orderId: number, payType: PayType) => {
    const order = orders.value.find(o => o.id === orderId)
    if (!order || order.status !== OrderStatus.PendingPayment) return null
    order.status = OrderStatus.PaidPendingShip
    order.payType = payTypeCode(payType)
    order.payTime = nowText()
    order.remark = `已完成${payType === 'alipay' ? '支付宝' : '微信'}模拟支付，等待商家发货`
    return order
  }

  const confirmReceived = (orderId: number) => {
    const order = orders.value.find(o => o.id === orderId)
    if (!order || order.status !== OrderStatus.Shipped) return null
    order.status = OrderStatus.Completed
    order.confirmTime = nowText()
    return order
  }

  const cancelOrder = (orderId: number) => {
    const order = orders.value.find(o => o.id === orderId)
    if (!order || order.status !== OrderStatus.PendingPayment) return null
    order.status = OrderStatus.Cancelled
    order.remark = '用户取消模拟订单'
    return order
  }

  const getRebuyItems = (order: Order) => order.items.map(item => {
    const sku = mockSkus.find(s => s.id === item.skuId)
    const spu = mockProducts.find(p => p.id === sku?.spuId)
    if (!sku || !spu) return null
    return { sku, spu }
  }).filter(Boolean) as { sku: typeof mockSkus[number]; spu: typeof mockProducts[number] }[]

  return {
    list,
    createRetailOrder,
    createGiftPackageOrder,
    payOrder,
    confirmReceived,
    cancelOrder,
    getRebuyItems,
  }
})
