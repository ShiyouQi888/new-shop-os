<template>
  <div class="order-page page-shell">
    <van-nav-bar title="我的订单" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <van-tabs v-model:active="activeTab" sticky offset-top="46px" color="#17202a" title-active-color="#17202a">
      <van-tab title="全部" />
      <van-tab title="待付款" />
      <van-tab title="待发货" />
      <van-tab title="待收货" />
      <van-tab title="已完成" />
    </van-tabs>

    <main class="order-body">
      <section class="order-item premium-card" v-for="order in filteredOrders" :key="order.id">
        <div class="order-header">
          <span class="order-no">{{ order.orderNo }}</span>
          <span class="order-status" :class="statusClass(order.status)">{{ OrderStatusLabels[order.status] }}</span>
        </div>
        <div class="order-goods" v-for="item in order.items" :key="item.id">
          <img :src="getImage(item.skuId)" class="goods-img" :alt="item.skuName" />
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
            <van-button v-if="order.status === OrderStatus.PendingPayment" size="small" color="#17202a" round @click="openPay(order)">去支付</van-button>
            <van-button v-if="order.status === OrderStatus.Shipped" size="small" color="#17202a" round @click="confirmReceived(order)">确认收货</van-button>
            <van-button v-if="order.status === OrderStatus.PaidPendingShip" size="small" round plain @click="remindShip(order)">催发货</van-button>
            <van-button v-if="order.status === OrderStatus.Completed" size="small" round plain @click="rebuy(order)">再次购买</van-button>
          </div>
        </div>
      </section>
      <van-empty v-if="!filteredOrders.length" description="暂无订单" />
    </main>

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
        <van-button block round color="#17202a" :loading="isPaying" loading-text="支付中..." @click="confirmPay">确认支付</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { formatMoney, OrderStatusLabels, OrderStatus, type Order, mockSkus } from '@shop-os/shared'
import { useOrderStore } from '@/stores/orders'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const route = useRoute()
const orderStore = useOrderStore()
const cartStore = useCartStore()
const activeTab = ref(Number(route.query.status || 0))
const showPayment = ref(false)
const isPaying = ref(false)
const selectedOrder = ref<Order | null>(null)
const payType = ref<'wechat' | 'alipay'>('wechat')
const statusMap = [null, OrderStatus.PendingPayment, OrderStatus.PaidPendingShip, OrderStatus.Shipped, OrderStatus.Completed]

const filteredOrders = computed(() => {
  if (activeTab.value === 0) return orderStore.list
  const target = statusMap[activeTab.value]
  return orderStore.list.filter(o => o.status === target)
})

const statusClass = (status: OrderStatus) => {
  const map: Record<number, string> = { 0: 'st-pending', 1: 'st-paid', 2: 'st-shipped', 3: 'st-done', 4: 'st-cancel', 5: 'st-refund' }
  return map[status] || ''
}

const getImage = (skuId: number) => {
  const sku = mockSkus.find(s => s.id === skuId)
  return sku ? `https://picsum.photos/seed/p${sku.spuId}/100/100` : ''
}

const openPay = (order: Order) => {
  selectedOrder.value = order
  showPayment.value = true
}

const confirmPay = () => {
  if (!selectedOrder.value) return
  isPaying.value = true
  setTimeout(() => {
    const paid = orderStore.payOrder(selectedOrder.value!.id, payType.value)
    isPaying.value = false
    showPayment.value = false
    if (paid) {
      showSuccessToast('支付成功，订单已进入待发货')
      activeTab.value = 2
    } else {
      showToast('订单无法支付，请检查订单状态')
    }
  }, 700)
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
.order-body { padding: 12px 14px 24px; }
.order-item { padding: 14px; margin-bottom: 12px; }
.order-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
.order-no { color: #7b8794; font-size: 12px; }
.order-status { font-size: 13px; font-weight: 800; }
.st-pending { color: #b7791f; }
.st-paid, .st-shipped { color: #2563eb; }
.st-done { color: #177245; }
.st-cancel { color: #7b8794; }
.st-refund { color: #b42318; }
.order-goods { display: flex; gap: 10px; padding: 12px 0; align-items: center; }
.goods-img { width: 58px; height: 58px; border-radius: 12px; object-fit: cover; }
.goods-info { flex: 1; min-width: 0; }
.goods-name { color: #17202a; font-size: 13px; font-weight: 700; line-height: 1.4; }
.goods-meta { margin-top: 4px; color: #7b8794; font-size: 12px; }
.goods-price { font-size: 14px; }
.order-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.order-total { color: #4d5967; font-size: 13px; }
.order-actions { display: flex; gap: 8px; flex-shrink: 0; }
.pay-popup { padding: 20px 16px 18px; }
.popup-title { color: #17202a; font-size: 17px; font-weight: 800; text-align: center; }
.pay-order-no { margin-top: 6px; color: #7b8794; font-size: 12px; text-align: center; }
.pay-summary { display: flex; justify-content: space-between; align-items: center; padding: 14px; margin: 16px 0 12px; border-radius: 14px; background: #f3f5f7; color: #637083; }
.pay-summary strong { color: #17202a; font-size: 23px; }
.pay-methods { margin-bottom: 16px; }
</style>
