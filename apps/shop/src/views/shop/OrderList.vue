<template>
  <div class="order-page page-shell">
    <van-nav-bar title="我的订单" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <van-tabs v-model:active="activeTab" sticky offset-top="46px" :color="currentTheme.primary" :title-active-color="currentTheme.primary">
      <van-tab title="全部" />
      <van-tab title="待付款" />
      <van-tab title="待发货" />
      <van-tab title="待收货" />
      <van-tab title="已完成" />
    </van-tabs>

    <main class="order-body">
      <section class="order-overview">
        <div><span>订单总数</span><strong>{{ orderStore.list.length }}</strong></div>
        <div><span>待处理</span><strong>{{ pendingCount }}</strong></div>
        <div><span>已完成</span><strong>{{ completedCount }}</strong></div>
      </section>
      <section class="order-item premium-card" v-for="order in filteredOrders" :key="order.id">
        <div class="order-header">
          <span class="order-no"><van-icon name="orders-o" /> {{ order.orderNo }}</span>
          <span class="order-status" :class="statusClass(order.status)">{{ OrderStatusLabels[order.status] }}</span>
        </div>
        <div class="order-goods" v-for="item in order.items" :key="item.id">
          <img :src="getImage(order, item.skuId)" class="goods-img" :alt="item.skuName" />
          <div class="goods-info">
            <div class="goods-name">{{ item.skuName }}</div>
            <div class="goods-meta">数量 ×{{ item.quantity }}</div>
          </div>
          <div class="goods-price price">{{ formatMoney(item.totalPrice) }}</div>
        </div>
        <div class="order-footer">
          <span class="order-total">共{{ order.items.length }}件，合计 <span class="price">{{ formatMoney(order.payAmount) }}</span></span>
          <div class="order-actions">
            <van-button v-if="order.status === OrderStatus.PendingPayment" size="small" plain round @click="cancelOrder(order)">取消</van-button>
            <van-button v-if="order.status === OrderStatus.PendingPayment" size="small" :color="currentTheme.primary" round @click="openPay(order)">去支付</van-button>
            <van-button v-if="order.status === OrderStatus.Shipped" size="small" :color="currentTheme.primary" round @click="confirmReceived(order)">确认收货</van-button>
            <van-button v-if="order.status === OrderStatus.PaidPendingShip" size="small" round plain @click="remindShip(order)">催发货</van-button>
            <van-button v-if="order.status === OrderStatus.PaidPendingShip" size="small" round plain type="danger" @click="openRefund(order)">申请退款</van-button>
            <van-button v-if="order.status === OrderStatus.Completed" size="small" round plain @click="rebuy(order)">再次购买</van-button>
          </div>
        </div>
      </section>
      <van-empty v-if="!filteredOrders.length" description="暂无订单" />
    </main>

    <van-popup v-model:show="refundDialogVisible" position="center" round class="refund-popup">
      <div class="refund-form">
        <div class="refund-title">申请整单退款</div>
        <p class="refund-hint">当前仅支持已付款、未发货订单。提交后由商城审核，审核完成前订单与库存保持锁定。</p>
        <div class="refund-order">订单 {{ refundOrder?.orderNo }} · {{ formatMoney(refundOrder?.payAmount || 0) }}</div>
        <van-field v-model="refundReason" type="textarea" rows="3" maxlength="200" show-word-limit placeholder="请填写退款原因（至少 2 个字）" />
        <div class="refund-actions">
          <van-button round plain @click="refundDialogVisible = false">取消</van-button>
          <van-button round :color="currentTheme.primary" :loading="isRefunding" @click="submitRefund">提交申请</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showPayment" position="bottom" round closeable>
      <div class="pay-popup">
        <div class="popup-title">订单支付</div>
        <div class="pay-order-no">{{ selectedOrder?.orderNo }}</div>
        <div class="pay-summary">
          <span>待支付</span>
          <strong>{{ formatMoney(selectedOrder?.payAmount || 0) }}</strong>
        </div>
        <van-radio-group v-model="payType" direction="horizontal" class="pay-methods">
          <van-radio name="wechat">微信支付</van-radio>
          <van-radio name="alipay">支付宝</van-radio>
        </van-radio-group>
        <van-button block round :color="currentTheme.primary" :loading="isPaying" loading-text="支付中..." @click="confirmPay">确认支付</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { formatMoney, OrderStatusLabels, OrderStatus, type Order } from '@shop-os/shared'
import { useOrderStore } from '@/stores/orders'
import { useCartStore } from '@/stores/cart'
import { api } from '@/api'
import { currentTheme } from '@/utils/site'

const router = useRouter()
const route = useRoute()
const orderStore = useOrderStore()
const cartStore = useCartStore()
const activeTab = ref(Number(route.query.status || 0))
const showPayment = ref(false)
const isPaying = ref(false)
const selectedOrder = ref<Order | null>(null)
const refundOrder = ref<Order | null>(null)
const refundDialogVisible = ref(false)
const refundReason = ref('')
const isRefunding = ref(false)
const payType = ref<'wechat' | 'alipay'>('wechat')
const statusMap = [null, OrderStatus.PendingPayment, OrderStatus.PaidPendingShip, OrderStatus.Shipped, OrderStatus.Completed]

const filteredOrders = computed(() => {
  if (activeTab.value === 0) return orderStore.list
  const target = statusMap[activeTab.value]
  return orderStore.list.filter(o => o.status === target)
})
const pendingCount = computed(() => orderStore.list.filter(o => [OrderStatus.PendingPayment, OrderStatus.PaidPendingShip, OrderStatus.Shipped].includes(o.status)).length)
const completedCount = computed(() => orderStore.list.filter(o => o.status === OrderStatus.Completed).length)

const statusClass = (status: OrderStatus) => {
  const map: Record<number, string> = { 0: 'st-pending', 1: 'st-paid', 2: 'st-shipped', 3: 'st-done', 4: 'st-cancel', 5: 'st-refund' }
  return map[status] || ''
}

const getImage = (order: Order, _skuId: number) => {
  // 商品图来自后端订单明细（itemImage），无图时使用占位
  return (order as Order & { itemImage?: string }).itemImage || 'https://picsum.photos/seed/order/100/100'
}

const openPay = (order: Order) => {
  selectedOrder.value = order
  showPayment.value = true
}

/** 创建支付单：mock 模式自动模拟成功；real 模式等待真实收银台/网关回调 */
const confirmPay = async () => {
  if (!selectedOrder.value) return
  isPaying.value = true
  try {
    const payment = await api.createPayment({ orderId: selectedOrder.value.id, payType: payType.value })
    if (!payment.mock) {
      showToast(String(payment.credential?.message || '支付单已创建，请在收银台完成支付'))
      return
    }
    await api.simulatePayment(payment.paymentNo)
    showPayment.value = false
    showSuccessToast('支付成功，订单已进入待发货')
    activeTab.value = 2
    orderStore.loadOrders()
  } catch {
    showToast('支付失败，请稍后重试')
  } finally {
    isPaying.value = false
  }
}

const confirmReceived = (order: Order) => {
  showConfirmDialog({
    title: '确认收货',
    message: '确认已收到商品并完成订单？',
  }).then(() => {
    orderStore.confirmReceived(order.id)
    showSuccessToast('收货成功，订单已完成')
    activeTab.value = 4
  }).catch(() => {})
}

const openRefund = (order: Order) => {
  refundOrder.value = order
  refundReason.value = ''
  refundDialogVisible.value = true
}

const submitRefund = async () => {
  if (!refundOrder.value) return
  const reason = refundReason.value.trim()
  if (reason.length < 2) {
    showToast('请至少填写 2 个字的退款原因')
    return
  }
  isRefunding.value = true
  try {
    await api.requestOrderRefund(refundOrder.value.id, reason)
    refundDialogVisible.value = false
    showSuccessToast('退款申请已提交')
    await orderStore.loadOrders()
  } catch {
    showToast('申请未提交，请刷新订单状态后重试')
  } finally {
    isRefunding.value = false
  }
}

const cancelOrder = (order: Order) => {
  showConfirmDialog({
    title: '取消订单',
    message: '取消后该模拟订单将进入已取消状态。',
  }).then(() => {
    orderStore.cancelOrder(order.id)
    showSuccessToast('订单已取消')
  }).catch(() => {})
}

const remindShip = (order: Order) => {
  showSuccessToast(`已提醒商家发货：${order.orderNo.slice(-6)}`)
}

const rebuy = (order: Order) => {
  const items = orderStore.getRebuyItems(order)
  if (!items.length) {
    showToast('商品已下架，暂无法再次购买')
    return
  }
  items.forEach(({ sku, spu }) => cartStore.addItem(sku, spu.name, spu.mainImage, 1))
  showSuccessToast('已加入购物车')
  router.push('/cart')
}
</script>

<style scoped>
.order-page { min-height: 100vh; padding-top: 46px; }
.order-body { padding: 10px 12px 24px; }
.order-overview { display: grid; grid-template-columns: repeat(3, 1fr); padding: 13px 0; margin-bottom: 10px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: 0 4px 14px rgba(17,24,39,.045); }
.order-overview div { text-align: center; border-right: 1px solid var(--border-color); }
.order-overview div:last-child { border-right: 0; }
.order-overview span, .order-overview strong { display: block; }
.order-overview span { color: var(--text-secondary); font-size: 10px; }
.order-overview strong { margin-top: 4px; color: var(--text-primary); font-size: 17px; }
.order-item { padding: 14px; margin-bottom: 10px; }
.order-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--border-color); }
.order-no { display: flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: 11px; }
.order-no .van-icon { color: var(--color-primary); font-size: 14px; }
.order-status { padding: 4px 7px; border-radius: 6px; background: var(--bg-muted); font-size: 11px; font-weight: 800; }
.st-pending { color: #F5A623; }
.st-paid, .st-shipped { color: var(--color-primary); }
.st-done { color: #18A66A; }
.st-cancel { color: var(--text-secondary); }
.st-refund { color: #E5484D; }
.order-goods { display: flex; gap: 10px; padding: 12px 0; align-items: center; }
.goods-img { width: 58px; height: 58px; border-radius: 12px; object-fit: cover; }
.goods-info { flex: 1; min-width: 0; }
.goods-name { color: var(--text-primary); font-size: 13px; font-weight: 700; line-height: 1.4; }
.goods-meta { margin-top: 4px; color: var(--text-secondary); font-size: 12px; }
.goods-price { font-size: 14px; }
.order-footer { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 10px; padding-top: 10px; border-top: 1px solid var(--border-color); }
.order-total { color: var(--text-secondary); font-size: 13px; }
.order-actions { display: flex; gap: 8px; margin-left: auto; }
.order-actions :deep(.van-button) { min-width: 72px; border-radius: 7px; font-weight: 700; }
.refund-popup { width: min(360px, calc(100vw - 40px)); overflow: hidden; }
.refund-form { padding: 22px 20px 18px; }
.refund-title { color: #171A1F; font-size: 18px; font-weight: 700; }
.refund-hint { margin: 9px 0 12px; color: #7A8490; font-size: 12px; line-height: 1.65; }
.refund-order { margin-bottom: 12px; padding: 10px 12px; border-radius: 9px; color: #606B77; background: #F6F7F9; font-size: 12px; }
.refund-form :deep(.van-cell) { padding: 10px 12px; border: 1px solid #E6E9ED; border-radius: 10px; background: #fff; }
.refund-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.refund-actions .van-button { min-width: 92px; }
.pay-popup { padding: 20px 16px 18px; }
.popup-title { color: var(--text-primary); font-size: 17px; font-weight: 800; text-align: center; }
.pay-order-no { margin-top: 6px; color: var(--text-secondary); font-size: 12px; text-align: center; }
.pay-summary { display: flex; justify-content: space-between; align-items: center; padding: 14px; margin: 16px 0 12px; border-radius: 14px; background: var(--bg-muted); color: var(--text-secondary); }
.pay-summary strong { color: var(--text-primary); font-size: 23px; }
.pay-methods { margin-bottom: 16px; }
</style>
