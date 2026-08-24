<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="浏览历史" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>HISTORY</span><h1>浏览历史</h1><p>快速回到最近看过的商品。</p></section>
      <section class="history-card" v-for="item in historyItems" :key="item.id" @click="router.push(`/product/${item.id}`)">
        <img :src="item.mainImage" :alt="item.name" />
        <div><strong>{{ item.name }}</strong><span>{{ item.brand }} · 最近浏览</span></div>
        <van-icon name="arrow" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { mockProducts } from '@shop-os/shared'

const router = useRouter()
const historyItems = computed(() => mockProducts.filter(p => !p.isGiftPackage).slice(0, 5))
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 24px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #17202a, #343d49); box-shadow: 0 18px 44px rgba(23,32,42,.16); }
.sub-hero span { color: #d8b06a; font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.history-card { display: flex; align-items: center; gap: 12px; margin-top: 10px; padding: 12px; border: 1px solid rgba(226,232,240,.86); border-radius: 14px; background: rgba(255,255,255,.96); box-shadow: 0 8px 24px rgba(17,24,39,.06); }
.history-card img { width: 58px; height: 58px; border-radius: 12px; object-fit: cover; }
.history-card div { flex: 1; min-width: 0; }
.history-card strong { display: block; color: #17202a; font-size: 14px; }
.history-card span { display: block; margin-top: 5px; color: #7b8794; font-size: 12px; }
</style>
