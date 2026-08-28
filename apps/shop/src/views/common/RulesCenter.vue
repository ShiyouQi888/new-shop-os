<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="规则中心" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>POLICY</span><h1>规则中心</h1><p>平台权益、交易与分享规则说明。</p></section>
      <section class="rule-card" v-for="item in rules" :key="item.id">
        <div><van-icon :name="iconOf(item.category)" /><strong>{{ item.title }}</strong></div>
        <p>{{ item.content }}</p>
      </section>
      <van-empty v-if="!rules.length" description="暂无规则内容" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'

const router = useRouter()
const rules = ref<Array<{ id: number; title: string; category: string; content: string }>>([])

const iconOf = (category: string) => {
  const map: Record<string, string> = {
    order: 'logistics', member: 'gem-o', join: 'gift-o',
    commission: 'gold-coin-o', aftersale: 'service-o',
  }
  return map[category] || 'shield-o'
}

onMounted(async () => {
  try {
    rules.value = await api.getRulesList()
  } catch {
    /* 网络异常保持空态 */
  }
})
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 24px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #171A1F, #171A1F); box-shadow: 0 18px 44px rgba(23,32,42,.16); }
.sub-hero span { color: var(--color-primary); font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.rule-card { margin-top: 10px; padding: 16px; border: 1px solid rgba(231, 233, 237,.86); border-radius: 14px; background: rgba(255,255,255,.96); box-shadow: 0 8px 24px rgba(17,24,39,.06); }
.rule-card div { display: flex; align-items: center; gap: 8px; color: #171A1F; font-size: 15px; font-weight: 800; }
.rule-card .van-icon { color: var(--color-primary-dark); }
.rule-card p { margin-top: 8px; color: #626A73; line-height: 1.6; }
</style>
