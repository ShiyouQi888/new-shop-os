<template>
  <div class="detail-page page-shell" v-if="data">
    <van-nav-bar title="商品详情" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <main class="detail-body">
      <section class="gallery-section">
        <van-swipe class="detail-swipe" indicator-color="#FF6B35">
          <van-swipe-item v-for="(img, idx) in data.spu.images" :key="idx">
            <img :src="img" class="detail-img" :alt="`${data.spu.name} 图片 ${idx + 1}`" />
          </van-swipe-item>
        </van-swipe>
        <div class="gallery-badge">
          <van-icon :name="data.spu.isGiftPackage ? 'gem-o' : 'shop-o'" />
          <span>{{ data.spu.isGiftPackage ? '入会权益礼包' : data.spu.isMonthlyProduct ? '月度领货商品' : '精选商品' }}</span>
        </div>
      </section>

      <section class="product-panel premium-card">
        <div class="brand-row">
          <span>{{ data.spu.brand }}</span>
          <span>库存 {{ currentSku?.stock || 0 }}</span>
        </div>
        <h1>{{ data.spu.name }}</h1>
        <div class="price-row">
          <div class="price-main price-lg">{{ formatMoney(memberPrice) }}</div>
          <div v-if="memberPrice < skuPrice" class="price-old">{{ formatMoney(skuPrice) }}</div>
        </div>
        <div class="member-price-tag" v-if="savingAmount > 0">
          <van-icon name="medal-o" />
          <span>{{ levelLabel }} 专享价，已省 ¥{{ savingAmount.toFixed(2) }}</span>
        </div>
      </section>

      <section v-if="data.spu.isGiftPackage" class="benefit-box">
        <div class="section-heading">
          <span class="section-kicker">AGENT BENEFITS</span>
          <h2>入会权益</h2>
        </div>
        <div class="benefit-list">
          <div class="benefit-item">
            <van-icon name="passed" />
            <span>一次性获得价值 {{ formatMoney(skuPrice) }} 的精选商品</span>
          </div>
          <div class="benefit-item">
            <van-icon name="balance-list-o" />
            <span>每月领货额度 ¥{{ monthlyCredit }}/月，共 10 个月</span>
          </div>
          <div class="benefit-item">
            <van-icon name="discount" />
            <span>商城购物享 {{ giftDiscount }} 折优惠</span>
          </div>
          <div class="benefit-item">
            <van-icon name="cluster-o" />
            <span>开通分享佣金推广资格</span>
          </div>
        </div>
      </section>

      <section class="option-card premium-card" v-if="data.skus.length > 1">
        <div class="section-heading">
          <span class="section-kicker">SKU</span>
          <h2>选择规格</h2>
        </div>
        <div class="sku-list">
          <button
            v-for="sku in data.skus"
            :key="sku.id"
            type="button"
            :class="['sku-item', { active: selectedSkuId === sku.id }]"
            @click="selectedSkuId = sku.id"
          >
            {{ sku.skuName }}
          </button>
        </div>
      </section>

      <section class="qty-section premium-card">
        <div>
          <span class="section-kicker">QUANTITY</span>
          <h2>购买数量</h2>
        </div>
        <van-stepper v-model="quantity" :min="1" :max="currentSku?.stock || 99" />
      </section>

      <section class="desc-section premium-card">
        <div class="section-heading">
          <span class="section-kicker">DETAILS</span>
          <h2>商品详情</h2>
        </div>
        <p>{{ data.spu.description }}</p>
        <div class="service-grid">
          <span><van-icon name="certificate" /> 正品保障</span>
          <span><van-icon name="logistics" /> 快速履约</span>
          <span><van-icon name="service-o" /> 专属客服</span>
        </div>
      </section>
    </main>

    <van-action-bar class="detail-action-bar">
      <van-action-bar-icon icon="chat-o" text="客服" @click="contactService" />
      <van-action-bar-icon :icon="isFavorited ? 'star' : 'star-o'" :color="isFavorited ? '#FF6B35' : ''" :text="isFavorited ? '已收藏' : '收藏'" @click="toggleFavorite" />
      <template v-if="data.spu.isGiftPackage">
        <van-action-bar-button class="buy-action" color="#FF6B35" text="立即购买" @click="buyGiftPackage" />
      </template>
      <template v-else>
        <van-action-bar-button class="cart-action" color="#FFF1EB" text="加入购物车" @click="addToCart" />
        <van-action-bar-button class="buy-action" color="#FF6B35" text="立即购买" @click="buyNow" />
      </template>
    </van-action-bar>
  </div>

  <van-loading v-else class="page-loading" type="spinner" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import { api } from '@/api'
import { formatMoney, calcDiscountPrice, MemberLevelLabels } from '@shop-os/shared'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const data = ref<Awaited<ReturnType<typeof api.getProduct>> | null>(null)
const selectedSkuId = ref(0)
const quantity = ref(1)

const currentSku = computed(() => data.value?.skus.find(s => s.id === selectedSkuId.value) || data.value?.skus[0])

const skuPrice = computed(() => currentSku.value?.price || 0)

const memberPrice = computed(() => {
  if (!data.value || !currentSku.value) return 0
  const sku = currentSku.value
  if (data.value.spu.excludeDiscount) return sku.price
  return calcDiscountPrice(sku.price, userStore.shopDiscount)
})

const savingAmount = computed(() => Number(Math.max(skuPrice.value - memberPrice.value, 0).toFixed(2)))

const giftDiscount = computed(() => skuPrice.value === 9800 ? 8 : 9)

const monthlyCredit = computed(() => {
  if (!currentSku.value) return 0
  return skuPrice.value === 9800 ? 980 : 580
})

const levelLabel = computed(() => MemberLevelLabels[userStore.level])

const addToCart = async () => {
  if (!currentSku.value || !data.value) return
  if (!userStore.member) {
    showToast('请先登录')
    router.push('/login')
    return
  }
  await cartStore.addItem(currentSku.value, data.value.spu.name, data.value.spu.mainImage, quantity.value)
  showSuccessToast(`已加入购物车 ×${quantity.value}`)
}

const buyNow = async () => {
  if (!currentSku.value || !data.value) return
  if (!userStore.member) {
    showToast('请先登录')
    router.push('/login')
    return
  }
  await cartStore.addItem(currentSku.value, data.value.spu.name, data.value.spu.mainImage, quantity.value)
  await cartStore.selectOnly(currentSku.value.id)
  router.push('/checkout')
}

const buyGiftPackage = () => {
  router.push('/gift-zone')
}

const contactService = () => {
  showToast('专属客服已接入，请稍后查看消息通知')
}

const isFavorited = ref(false)

const toggleFavorite = async () => {
  if (!userStore.member) {
    showToast('请先登录')
    router.push('/login')
    return
  }
  try {
    if (isFavorited.value) {
      await api.removeFavorite(Number(route.params.id))
      isFavorited.value = false
      showSuccessToast('已取消收藏')
    } else {
      await api.addFavorite(Number(route.params.id))
      isFavorited.value = true
      showSuccessToast('已收藏，可在「我的收藏」查看')
    }
  } catch {
    showToast('操作失败，请稍后重试')
  }
}

onMounted(async () => {
  const id = Number(route.params.id)
  data.value = await api.getProduct(id)
  if (data.value && data.value.skus.length > 0) {
    selectedSkuId.value = data.value.skus[0].id
  }
  // 记录浏览历史（登录时）
  if (userStore.member) {
    api.addHistory(id).catch(() => {})
    try {
      const favs = await api.getFavorites()
      isFavorited.value = favs.some(f => f.spuId === id)
    } catch { /* ignore */ }
  }
})

watch(selectedSkuId, () => { quantity.value = 1 })
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding-top: 46px;
  padding-bottom: 78px;
}
.detail-body {
  padding: 0 14px 20px;
}
.gallery-section {
  position: relative;
  margin: 12px -2px 12px;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 18px 44px rgba(23, 32, 42, 0.12);
}
.detail-img {
  width: 100%;
  height: 344px;
  object-fit: cover;
}
.gallery-badge {
  position: absolute;
  left: 14px;
  bottom: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(23, 32, 42, 0.78);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.product-panel,
.option-card,
.qty-section,
.desc-section {
  padding: 16px;
  margin-bottom: 12px;
}
.brand-row,
.price-row,
.member-price-tag,
.section-heading,
.qty-section,
.benefit-item,
.service-grid span {
  display: flex;
  align-items: center;
}
.brand-row {
  justify-content: space-between;
  color: #E85222;
  font-size: 12px;
  font-weight: 800;
}
h1 {
  margin-top: 9px;
  color: #171A1F;
  font-size: 22px;
  line-height: 1.28;
}
.price-row {
  gap: 10px;
  margin-top: 12px;
}
.price-old {
  color: #9AA1AA;
  text-decoration: line-through;
}
.member-price-tag {
  gap: 6px;
  width: fit-content;
  margin-top: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #FFF1EB;
  color: #E85222;
  font-size: 12px;
  font-weight: 700;
}
.benefit-box {
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, #FFFFFF 0%, #FFF1EB 100%);
  border: 1px solid rgba(255, 107, 53, 0.2);
}
.section-heading {
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-kicker {
  color: #E85222;
  font-size: 10px;
  font-weight: 800;
}
h2 {
  margin-top: 3px;
  color: #171A1F;
  font-size: 17px;
  line-height: 1.2;
}
.benefit-list {
  display: grid;
  gap: 10px;
}
.benefit-item {
  gap: 8px;
  color: #626A73;
  font-size: 13px;
  line-height: 1.45;
}
.benefit-item .van-icon {
  color: #FF6B35;
  flex-shrink: 0;
}
.sku-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sku-item {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #E7E9ED;
  border-radius: 999px;
  background: #fff;
  color: #626A73;
  font-size: 13px;
  font-weight: 700;
}
.sku-item.active {
  border-color: #FF6B35;
  background: #FF6B35;
  color: #fff;
}
.qty-section {
  justify-content: space-between;
}
.desc-section p {
  color: #626A73;
  font-size: 14px;
  line-height: 1.7;
}
.service-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}
.service-grid span {
  justify-content: center;
  gap: 5px;
  min-height: 34px;
  border-radius: 10px;
  background: #F8F9FB;
  color: #626A73;
  font-size: 11px;
  font-weight: 700;
}
.page-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>

<style>
.detail-action-bar {
  left: 12px;
  right: 12px;
  bottom: calc(74px + env(safe-area-inset-bottom));
  width: auto;
  border: 1px solid rgba(231, 233, 237, 0.9);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 14px 34px rgba(17, 24, 39, 0.13);
}
.detail-action-bar::after {
  display: none;
}
.detail-action-bar .van-action-bar-button {
  font-weight: 800;
}
.detail-action-bar .cart-action {
  color: #E85222 !important;
}
.detail-action-bar .cart-action .van-button__text {
  color: #E85222 !important;
}
.detail-action-bar .buy-action,
.detail-action-bar .buy-action .van-button__text {
  color: #fff !important;
}
</style>
