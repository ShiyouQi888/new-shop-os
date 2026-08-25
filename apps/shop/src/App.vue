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

const showGlobalTabbar = computed(() => !authRoutes.has(route.path))
const cartBadge = computed(() => cartStore.totalCount > 0 ? cartStore.totalCount : '')
</script>

<style>
.premium-tabbar {
  position: fixed;
  left: 50% !important;
  right: auto !important;
  bottom: calc(8px + env(safe-area-inset-bottom)) !important;
  z-index: 1000;
  width: min(398px, calc(100vw - 24px)) !important;
  height: 58px;
  transform: translateX(-50%);
  border: 1px solid rgba(231, 233, 237, 0.82);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(17, 24, 39, 0.16);
  backdrop-filter: blur(18px);
}

.premium-tabbar::after {
  display: none;
}

.premium-tabbar .van-tabbar-item {
  color: #626A73;
  font-size: 11px;
  font-weight: 650;
}

.premium-tabbar .van-tabbar-item__icon {
  margin-bottom: 3px;
  font-size: 21px;
}

.premium-tabbar .van-tabbar-item--active {
  color: #FF6B35;
  background: transparent;
}

.premium-tabbar .van-tabbar-item--active .van-tabbar-item__icon {
  transform: translateY(-1px);
}

.page-shell {
  padding-bottom: calc(84px + env(safe-area-inset-bottom)) !important;
}

.detail-page,
.checkout-page,
.cart-page {
  padding-bottom: calc(146px + env(safe-area-inset-bottom)) !important;
}
</style>
