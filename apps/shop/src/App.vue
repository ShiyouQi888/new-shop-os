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
  bottom: calc(10px + env(safe-area-inset-bottom)) !important;
  z-index: 1000;
  width: min(390px, calc(100vw - 28px));
  height: 54px;
  transform: translateX(-50%);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 34px rgba(17, 24, 39, 0.13);
  backdrop-filter: blur(14px);
}

.premium-tabbar::after {
  display: none;
}

.page-shell {
  padding-bottom: calc(92px + env(safe-area-inset-bottom)) !important;
}

.detail-page,
.checkout-page,
.cart-page {
  padding-bottom: calc(154px + env(safe-area-inset-bottom)) !important;
}
</style>
