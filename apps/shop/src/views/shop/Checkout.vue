<template>
  <div class="checkout-page page-shell">
    <van-nav-bar title="订单结算" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <main class="checkout-body">
      <section class="checkout-hero">
        <span>CHECKOUT</span>
        <h1>确认订单</h1>
        <p>请核对收货地址、商品明细与支付方式。</p>
      </section>

      <section class="address-card premium-card" @click="showAddressList = true">
        <van-icon name="location-o" size="20" color="#E85222" />
        <div class="address-info" v-if="selectedAddress">
          <div class="addr-name">{{ selectedAddress.name }} {{ selectedAddress.phone }}</div>
          <div class="addr-detail">{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}{{ selectedAddress.detail }}</div>
        </div>
        <div v-else class="address-empty">请选择收货地址</div>
        <van-icon name="arrow" />
      </section>

      <section class="goods-card premium-card">
        <div class="card-title">商品清单</div>
        <div class="goods-item" v-for="item in cartStore.selectedItems" :key="item.skuId">
          <img :src="item.mainImage" class="goods-img" :alt="item.skuName" />
          <div class="goods-info">
            <div class="goods-name">{{ item.skuName }}</div>
            <div class="goods-price-row">
              <span class="price">{{ formatMoney(item.memberPrice) }}</span>
              <span v-if="item.memberPrice < item.price" class="price-old">¥{{ item.price }}</span>
              <span class="goods-qty">×{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="discount-card premium-card">
        <div class="card-title">费用明细</div>
        <div class="discount-row"><span>商品总额</span><span>¥{{ cartStore.totalPrice.toFixed(2) }}</span></div>
        <div class="discount-row discount"><span>{{ levelLabel }}折扣</span><span>-¥{{ cartStore.discountAmount.toFixed(2) }}</span></div>
        <div class="discount-row"><span>运费</span><span>¥{{ shippingFee.toFixed(2) }}</span></div>
        <van-cell title="优惠券" is-link value="暂无可用" />
      </section>

      <section class="pay-card premium-card">
        <div class="card-title">支付方式</div>
        <van-radio-group v-model="payType" direction="horizontal">
          <van-radio name="wechat">微信支付</van-radio>
          <van-radio name="alipay">支付宝</van-radio>
        </van-radio-group>
      </section>
    </main>

    <van-submit-bar class="checkout-submit-bar" :price="payAmount * 100" button-text="提交并支付" :button-color="'#FF6B35'" @submit="onSubmit" />

    <van-popup v-model:show="showAddressList" position="bottom" round>
      <div class="address-popup">
        <div class="popup-title">选择收货地址</div>
        <div class="addr-list-item" v-for="addr in addressStore.addresses" :key="addr.id" @click="selectAddress(addr.id)">
          <div class="addr-name">
            {{ addr.name }} {{ addr.phone }}
            <em v-if="addr.isDefault">默认</em>
          </div>
          <div class="addr-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}</div>
        </div>
        <button class="manage-address" type="button" @click="router.push('/mine/address')">管理或新增地址</button>
      </div>
    </van-popup>

    <van-popup v-model:show="showPayment" position="bottom" round closeable>
      <div class="pay-popup">
        <div class="popup-title">确认支付</div>
        <div class="pay-summary">
          <span>支付金额</span>
          <strong>{{ formatMoney(pendingOrder?.payAmount || payAmount) }}</strong>
        </div>
        <div class="pay-method">
          <van-icon :name="payType === 'alipay' ? 'alipay' : 'wechat-pay'" size="24" />
          <div>
            <div>{{ payTypeLabel }}</div>
            <p>模拟支付环境，不会产生真实扣款。</p>
          </div>
        </div>
        <van-button block round color="#FF6B35" :loading="isPaying" loading-text="支付中..." @click="confirmPay">确认支付</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import { formatMoney, MemberLevelLabels, type Order } from '@shop-os/shared'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import { useAddressStore } from '@/stores/address'
import { api } from '@/api'

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()
const orderStore = useOrderStore()
const addressStore = useAddressStore()
const selectedAddressId = ref(addressStore.defaultAddress?.id ?? null)
const showAddressList = ref(false)
const showPayment = ref(false)
const isPaying = ref(false)
const pendingOrder = ref<Order | null>(null)
const payType = ref<'wechat' | 'alipay'>('wechat')

onMounted(async () => {
  await addressStore.load()
  if (!selectedAddressId.value && addressStore.defaultAddress) selectedAddressId.value = addressStore.defaultAddress.id
})

const levelLabel = computed(() => MemberLevelLabels[userStore.level])
const shippingFee = computed(() => cartStore.memberTotalPrice >= 99 ? 0 : 10)
const payAmount = computed(() => cartStore.memberTotalPrice + shippingFee.value)
const payTypeLabel = computed(() => payType.value === 'alipay' ? '支付宝' : '微信支付')
const selectedAddress = computed(() => {
  return addressStore.addresses.find(item => item.id === selectedAddressId.value) || addressStore.defaultAddress
})

const selectAddress = (id: number) => {
  selectedAddressId.value = id
  showAddressList.value = false
  showSuccessToast('收货地址已更新')
}

const onSubmit = async () => {
  if (!selectedAddress.value) {
    showToast('请选择收货地址')
    return
  }
  if (cartStore.selectedItems.length === 0) {
    showToast('请选择要结算的商品')
    router.replace('/cart')
    return
  }

  pendingOrder.value = await orderStore.createRetailOrder({
    items: cartStore.selectedItems.map(item => ({ ...item })),
    totalAmount: Number(cartStore.totalPrice.toFixed(2)),
    discountAmount: Number(cartStore.discountAmount.toFixed(2)),
    shippingFee: shippingFee.value,
    payAmount: Number(payAmount.value.toFixed(2)),
    payType: payType.value,
    address: selectedAddress.value,
  })
  showPayment.value = true
  showSuccessToast('订单已创建，等待支付')
}

/** 创建支付单：mock 模式自动模拟成功；real 模式等待真实收银台/网关回调 */
const confirmPay = async () => {
  if (!pendingOrder.value) return
  isPaying.value = true
  try {
    const payment = await api.createPayment({ orderId: pendingOrder.value.id, payType: payType.value })
    if (!payment.mock) {
      showToast(String(payment.credential?.message || '支付单已创建，请在收银台完成支付'))
      return
    }
    await api.simulatePayment(payment.paymentNo)
    showPayment.value = false
    await cartStore.clearSelected()
    showSuccessToast('支付成功，商家将尽快发货')
    setTimeout(() => router.replace('/orders'), 800)
  } catch {
    showToast('支付失败，请稍后重试')
  } finally {
    isPaying.value = false
  }
}
</script>

<style scoped>
.checkout-page { min-height: 100vh; padding-top: 46px; padding-bottom: 82px; }
.checkout-body { padding: 12px 14px 24px; }
.checkout-hero { padding: 20px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #171A1F, #171A1F); box-shadow: 0 18px 44px rgba(23,32,42,.16); margin-bottom: 12px; }
.checkout-hero span { color: #FF6B35; font-size: 11px; font-weight: 800; }
.checkout-hero h1 { margin-top: 8px; font-size: 24px; }
.checkout-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.address-card { display: flex; align-items: center; gap: 10px; padding: 16px; margin-bottom: 12px; }
.address-info { flex: 1; }
.addr-name { color: #171A1F; font-size: 15px; font-weight: 800; }
.addr-detail { margin-top: 5px; color: #626A73; font-size: 13px; line-height: 1.45; }
.address-empty { flex: 1; color: #626A73; }
.goods-card, .discount-card, .pay-card { padding: 16px; margin-bottom: 12px; }
.card-title { color: #171A1F; font-size: 16px; font-weight: 800; margin-bottom: 12px; }
.goods-item { display: flex; gap: 10px; padding: 9px 0; }
.goods-img { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; }
.goods-info { flex: 1; min-width: 0; }
.goods-name { color: #171A1F; font-size: 13px; font-weight: 700; line-height: 1.4; }
.goods-price-row { display: flex; align-items: baseline; gap: 6px; margin-top: 6px; }
.price-old { font-size: 12px; color: #9AA1AA; text-decoration: line-through; }
.goods-qty { margin-left: auto; color: #626A73; font-size: 13px; }
.discount-row { display: flex; justify-content: space-between; padding: 7px 0; color: #626A73; font-size: 14px; }
.discount-row.discount span:last-child { color: #18A66A; font-weight: 800; }
.address-popup { padding: 16px; }
.popup-title { font-size: 16px; font-weight: 800; margin-bottom: 12px; text-align: center; }
.addr-list-item { padding: 12px 0; border-bottom: 1px solid #E7E9ED; }
.addr-list-item .addr-name { display: flex; align-items: center; gap: 8px; }
.addr-list-item em { padding: 2px 7px; border-radius: 999px; background: #FFF1EB; color: #E85222; font-style: normal; font-size: 11px; font-weight: 700; }
.manage-address { width: 100%; height: 40px; margin-top: 12px; border: 1px solid rgba(23,32,42,.14); border-radius: 999px; background: #fff; color: #171A1F; font-weight: 800; }
.pay-popup { padding: 20px 16px 18px; }
.pay-summary { display: flex; align-items: center; justify-content: space-between; padding: 14px; margin-bottom: 12px; border-radius: 14px; background: #F8F9FB; color: #626A73; }
.pay-summary strong { color: #171A1F; font-size: 24px; }
.pay-method { display: flex; align-items: center; gap: 10px; padding: 14px; margin-bottom: 16px; border: 1px solid rgba(231, 233, 237,.9); border-radius: 14px; color: #171A1F; font-weight: 800; }
.pay-method p { margin-top: 3px; color: #626A73; font-size: 12px; font-weight: 400; }
</style>

<style>
.checkout-submit-bar { left: 12px; right: 12px; bottom: calc(74px + env(safe-area-inset-bottom)); width: auto; border: 1px solid rgba(231, 233, 237,.9); border-radius: 16px; overflow: hidden; box-shadow: 0 14px 34px rgba(17,24,39,.13); }
.checkout-submit-bar::after { display: none; }
.checkout-submit-bar .van-submit-bar__bar { height: 54px; padding: 0 10px 0 14px; }
.checkout-submit-bar .van-submit-bar__button { height: 38px; border-radius: 999px; font-weight: 800; }
</style>
