<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="消息通知" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>NOTIFICATIONS</span><h1>消息通知</h1><p>订单、佣金、权益提醒集中查看。</p></section>
      <section class="notice-card" v-for="item in notices" :key="item.title">
        <van-icon :name="item.icon" />
        <div><strong>{{ item.title }}</strong><p>{{ item.desc }}</p></div>
        <span>{{ item.time }}</span>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const notices = [
  { icon: 'logistics', title: '订单已发货', desc: '你的零售订单已交由顺丰速运配送。', time: '今天' },
  { icon: 'balance-o', title: '佣金可提现', desc: '本期佣金已完成结算，可申请提现。', time: '昨天' },
  { icon: 'gift-o', title: '月度领货提醒', desc: '本月领货额度将在月底到期。', time: '08-24' },
]
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 24px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #17202a, #343d49); box-shadow: 0 18px 44px rgba(23,32,42,.16); }
.sub-hero span { color: #d8b06a; font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.notice-card { display: flex; gap: 12px; margin-top: 10px; padding: 14px; border: 1px solid rgba(226,232,240,.86); border-radius: 14px; background: rgba(255,255,255,.96); box-shadow: 0 8px 24px rgba(17,24,39,.06); }
.notice-card > .van-icon { color: #8f6f3f; margin-top: 2px; }
.notice-card div { flex: 1; }
.notice-card strong { color: #17202a; font-size: 14px; }
.notice-card p { margin-top: 5px; color: #637083; line-height: 1.5; }
.notice-card > span { color: #a8b1bc; font-size: 11px; }
</style>
