<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="我的收藏" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>FAVORITES</span><h1>我的收藏</h1><p>收藏商品会同步会员价与库存状态。</p></section>
      <div class="product-grid">
        <ProductCard v-for="item in favorites" :key="item.id" :product="item" :show-member-price="true" />
      </div>
      <van-empty v-if="!favorites.length" description="暂无收藏商品" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { mockProducts } from '@shop-os/shared'
import ProductCard from '@/components/ProductCard.vue'

const router = useRouter()
const favorites = computed(() => mockProducts.filter(p => !p.isGiftPackage).slice(0, 4))
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 24px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #17202a, #343d49); box-shadow: 0 18px 44px rgba(23,32,42,.16); }
.sub-hero span { color: #d8b06a; font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
</style>
