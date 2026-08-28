<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="浏览历史" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>HISTORY</span><h1>浏览历史</h1><p>快速回到最近看过的商品。</p></section>
      <section class="history-card" v-for="item in historyItems" :key="item.id" @click="router.push(`/product/${item.spuId}`)">
        <img :src="item.mainImage" :alt="item.name" />
        <div><strong>{{ item.name }}</strong><span>{{ item.createTime.slice(5, 16) }} · 最近浏览</span></div>
        <van-icon name="arrow" />
      </section>
      <van-empty v-if="!historyItems.length" description="暂无浏览记录" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const historyItems = ref<Awaited<ReturnType<typeof api.getHistory>>>([])

onMounted(async () => {
  if (!userStore.member) return
  historyItems.value = await api.getHistory()
})
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 24px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #171A1F, #171A1F); box-shadow: 0 18px 44px rgba(23,32,42,.16); }
.sub-hero span { color: var(--color-primary); font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.history-card { display: flex; align-items: center; gap: 12px; margin-top: 10px; padding: 12px; border: 1px solid var(--border-color); border-radius: 14px; background: var(--bg-card); box-shadow: 0 8px 24px rgba(17,24,39,.06); }
.history-card img { width: 58px; height: 58px; border-radius: 12px; object-fit: cover; }
.history-card div { flex: 1; min-width: 0; }
.history-card strong { display: block; color: var(--text-primary); font-size: 14px; }
.history-card span { display: block; margin-top: 5px; color: var(--text-secondary); font-size: 12px; }
</style>
