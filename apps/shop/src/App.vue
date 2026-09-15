<template>
  <router-view />
  <van-tabbar v-if="showGlobalTabbar" route fixed :placeholder="false" class="premium-tabbar">
    <van-tabbar-item to="/home" icon="wap-home-o">商城</van-tabbar-item>
    <van-tabbar-item to="/category" icon="apps-o">分类</van-tabbar-item>
    <van-tabbar-item to="/cart" icon="shopping-cart-o" :badge="cartBadge">购物车</van-tabbar-item>
    <van-tabbar-item to="/mine" icon="user-o">我的</van-tabbar-item>
  </van-tabbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const cartStore = useCartStore()
const authRoutes = new Set(['/login', '/register'])

const showGlobalTabbar = computed(() => !authRoutes.has(route.path) && route.meta.hideTabbar !== true)
const cartBadge = computed(() => cartStore.totalCount > 0 ? cartStore.totalCount : '')
</script>

<style>
.premium-tabbar {
  position: fixed;
  left: 50% !important;
  right: auto !important;
  bottom: 0 !important;
  z-index: 1000;
  width: min(430px, 100vw) !important;
  height: calc(58px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  transform: translateX(-50%);
  border: 0;
  border-top: 1px solid var(--border-color);
  border-radius: 0;
  overflow: hidden;
  background: var(--bg-card);
  box-shadow: 0 -8px 24px rgba(17, 24, 39, 0.07);
  backdrop-filter: blur(18px);
}

.premium-tabbar::after {
  display: none;
}

.premium-tabbar .van-tabbar-item {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 650;
}

.premium-tabbar .van-tabbar-item__icon {
  margin-bottom: 3px;
  font-size: 21px;
}

.premium-tabbar .van-tabbar-item--active {
  color: var(--color-primary);
  background: transparent;
}

.premium-tabbar .van-tabbar-item--active .van-tabbar-item__icon {
  transform: translateY(-1px);
}

.premium-tabbar .van-tabbar-item::before {
  content: '';
  position: absolute;
  top: 0;
  width: 20px;
  height: 2px;
  border-radius: 0 0 2px 2px;
  background: transparent;
}

.premium-tabbar .van-tabbar-item--active::before {
  background: var(--color-primary);
}

.page-shell {
  padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important;
}

.checkout-page,
.cart-page {
  padding-bottom: calc(136px + env(safe-area-inset-bottom)) !important;
}
</style>
