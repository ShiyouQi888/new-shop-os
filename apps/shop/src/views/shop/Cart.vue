<template>
  <div class="cart-page page-shell">
    <van-nav-bar title="购物车" fixed safe-area-inset-top />

    <main class="cart-body" v-if="cartStore.items.length">
      <section class="cart-hero">
        <span>CART</span>
        <h1>{{ cartStore.totalCount }} 件商品待结算</h1>
        <p>已同步当前会员价，结算前可调整数量与选择状态。</p>
      </section>

      <van-checkbox-group v-model="selectedIds">
        <section class="cart-item premium-card" v-for="item in cartStore.items" :key="item.skuId">
          <van-checkbox :name="item.skuId" shape="round" v-model="item.selected" />
          <img :src="item.mainImage" class="cart-img" :alt="item.skuName" @click="goDetail(item.spuId)" />
          <div class="cart-info">
            <div class="cart-name">{{ item.skuName }}</div>
            <div class="cart-price-row">
              <span class="price">{{ formatMoney(item.memberPrice) }}</span>
              <span v-if="item.memberPrice < item.price" class="price-old">{{ formatMoney(item.price) }}</span>
            </div>
            <div class="cart-actions">
              <van-stepper v-model="item.quantity" :min="1" :max="99" @change="updateQuantity(item.skuId, item.quantity)" />
              <button type="button" class="icon-button" aria-label="删除商品" @click="removeItem(item.skuId)">
                <van-icon name="delete-o" size="18" />
              </button>
            </div>
          </div>
        </section>
      </van-checkbox-group>
    </main>

    <van-empty v-else description="购物车是空的">
      <van-button :color="currentTheme.primary" size="small" round @click="router.push('/home')">去逛逛</van-button>
    </van-empty>

    <van-submit-bar
      v-if="cartStore.items.length"
      class="cart-submit-bar"
      :price="cartStore.memberTotalPrice * 100"
      button-text="去结算"
      :button-color="currentTheme.primary"
      @submit="onCheckout"
    >
      <van-checkbox v-model="selectAll" shape="round">全选</van-checkbox>
    </van-submit-bar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { formatMoney } from '@shop-os/shared'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { api } from '@/api'
import { currentTheme } from '@/utils/site'

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()
const selectedIds = ref(cartStore.items.filter(i => i.selected).map(i => i.skuId))

onMounted(async () => {
  if (!userStore.member) {
    showToast('请先登录')
    router.replace('/login')
    return
  }
  await cartStore.load()
  selectedIds.value = cartStore.items.filter(i => i.selected).map(i => i.skuId)
})

const selectAll = computed({
  get: () => cartStore.items.length > 0 && cartStore.items.every(i => i.selected),
  set: (val) => cartStore.toggleSelectAll(val),
})

watch(selectedIds, async (ids) => {
  // checkbox-group 已更新本地选中 → 仅同步后端
  const changed = cartStore.items.filter(i => (i.selected && !ids.includes(i.skuId)) || (!i.selected && ids.includes(i.skuId)))
  for (const item of changed) {
    item.selected = ids.includes(item.skuId)
    await api.updateCartItem(item.skuId, { selected: item.selected })
  }
})

const goDetail = (spuId: number) => router.push(`/product/${spuId}`)

const updateQuantity = async (skuId: number, quantity: number) => {
  await cartStore.updateQuantity(skuId, quantity)
  showToast('数量已更新')
}

const removeItem = (skuId: number) => {
  showConfirmDialog({
    title: '移除商品',
    message: '确认从购物车移除这件商品？',
  }).then(async () => {
    await cartStore.removeItem(skuId)
    selectedIds.value = cartStore.items.filter(i => i.selected).map(i => i.skuId)
    showSuccessToast('已移除')
  }).catch(() => {})
}

const onCheckout = () => {
  if (cartStore.selectedItems.length === 0) {
    showToast('请先选择要结算的商品')
    return
  }
  router.push('/checkout')
}
</script>

<style scoped>
.cart-page { min-height: 100vh; padding-top: 46px; padding-bottom: 132px; }
.cart-body { padding: 12px 14px 24px; }
.cart-hero { padding: 20px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #171A1F, #171A1F); box-shadow: 0 18px 44px rgba(23,32,42,.16); margin-bottom: 12px; }
.cart-hero span { color: var(--color-primary); font-size: 11px; font-weight: 800; }
.cart-hero h1 { margin-top: 8px; font-size: 24px; }
.cart-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.cart-item { display: flex; align-items: center; gap: 10px; padding: 12px; margin-bottom: 10px; }
.cart-img { width: 82px; height: 82px; border-radius: 12px; object-fit: cover; cursor: pointer; }
.cart-info { flex: 1; min-width: 0; }
.cart-name { color: var(--text-primary); font-size: 14px; font-weight: 750; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 6px; }
.cart-price-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; }
.price-old { font-size: 12px; color: var(--text-placeholder); text-decoration: line-through; }
.cart-actions { display: flex; justify-content: space-between; align-items: center; }
.icon-button { width: 32px; height: 32px; border: 0; border-radius: 999px; background: var(--bg-muted); color: var(--text-secondary); }
</style>

<style>
.cart-submit-bar { bottom: calc(74px + env(safe-area-inset-bottom)); left: 12px; right: 12px; width: auto; border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; box-shadow: 0 14px 34px rgba(17, 24, 39, 0.12); }
.cart-submit-bar::after { display: none; }
.cart-submit-bar .van-submit-bar__bar { height: 54px; padding: 0 10px 0 14px; }
.cart-submit-bar .van-submit-bar__button { height: 38px; border-radius: 999px; font-weight: 700; }
</style>
