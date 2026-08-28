<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="我的收藏" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>FAVORITES</span><h1>我的收藏</h1><p>收藏商品会同步会员价与库存状态。</p></section>
      <div class="product-grid">
        <ProductCard v-for="item in favorites" :key="item.spuId" :product="toSPU(item)" :show-member-price="true" />
      </div>
      <van-empty v-if="!favorites.length" description="暂无收藏商品" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ProductSPU } from '@shop-os/shared'
import { api } from '@/api'
import ProductCard from '@/components/ProductCard.vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const favorites = ref<Awaited<ReturnType<typeof api.getFavorites>>>([])

/** 后端收藏行 → ProductCard 所需 ProductSPU */
const toSPU = (item: Awaited<ReturnType<typeof api.getFavorites>>[number]): ProductSPU => ({
  id: item.spuId, name: item.name, mainImage: item.mainImage, description: item.description,
  price: item.minPrice, minPrice: item.minPrice, originalPrice: item.minOriginalPrice, minOriginalPrice: item.minOriginalPrice,
  status: 1, isGiftPackage: false,
} as ProductSPU)

onMounted(async () => {
  if (!userStore.member) return
  favorites.value = await api.getFavorites()
})
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 24px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #171A1F, #171A1F); box-shadow: 0 18px 44px rgba(23,32,42,.16); }
.sub-hero span { color: var(--color-primary); font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }
</style>
