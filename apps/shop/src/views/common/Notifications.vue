<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="消息通知" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>NOTIFICATIONS</span><h1>消息通知</h1><p>订单、佣金、权益提醒集中查看。</p></section>

      <div class="notice-actions" v-if="notices.length">
        <button type="button" @click="readAll">全部标为已读</button>
      </div>

      <section class="notice-card" v-for="item in notices" :key="item.id" :class="{ unread: !item.isRead }">
        <van-icon :name="iconOf(item.type)" />
        <div><strong>{{ item.title }}</strong><p>{{ item.content }}</p></div>
        <span>{{ item.createTime.slice(5, 16) }}</span>
      </section>

      <van-empty v-if="!notices.length" description="暂无消息通知" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const notices = ref<Array<{ id: number; type: string; title: string; content: string; isRead: number; createTime: string }>>([])

const iconOf = (type: string) => {
  const map: Record<string, string> = { order: 'logistics', commission: 'balance-o', credit: 'gift-o', system: 'info-o' }
  return map[type] || 'info-o'
}

const load = async () => {
  const data = await api.getNotifications()
  notices.value = data.list
}

const readAll = async () => {
  await api.readAllNotifications()
  showSuccessToast('已全部标记为已读')
  load()
}

onMounted(() => {
  if (userStore.member) load()
})
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 24px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #171A1F, #171A1F); box-shadow: 0 18px 44px rgba(23,32,42,.16); }
.sub-hero span { color: #FF6B35; font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.notice-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
.notice-actions button { border: none; background: none; color: #E85222; font-size: 12px; }
.notice-card { display: flex; gap: 12px; margin-top: 10px; padding: 14px; border: 1px solid rgba(231, 233, 237,.86); border-radius: 14px; background: rgba(255,255,255,.96); box-shadow: 0 8px 24px rgba(17,24,39,.06); }
.notice-card.unread { border-color: rgba(255, 107, 53,.35); }
.notice-card > .van-icon { color: #E85222; margin-top: 2px; }
.notice-card div { flex: 1; }
.notice-card strong { color: #171A1F; font-size: 14px; }
.notice-card p { margin-top: 5px; color: #626A73; line-height: 1.5; }
.notice-card > span { color: #9AA1AA; font-size: 11px; white-space: nowrap; }
</style>
