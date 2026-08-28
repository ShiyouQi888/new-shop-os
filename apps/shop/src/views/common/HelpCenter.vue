<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="客服与帮助" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>SUPPORT</span><h1>客服与帮助</h1><p>常见问题与服务入口。</p></section>
      <van-cell-group inset class="support-card" v-if="helpItems.length">
        <van-cell
          v-for="item in helpItems"
          :key="item.id"
          :title="item.title"
          :icon="iconOf(item.category)"
          is-link
          @click="openHelp(item)"
        />
      </van-cell-group>
      <van-empty v-else description="暂无帮助内容" />
      <van-button block round type="primary" class="primary-action" icon="service-o" @click="contactService">提交客服工单</van-button>
    </main>

    <!-- 帮助详情弹层 -->
    <van-popup v-model:show="detailVisible" round position="bottom" :style="{ maxHeight: '70%' }">
      <div class="help-detail">
        <div class="help-detail-title">{{ current?.title }}</div>
        <div class="help-detail-body">{{ current?.content }}</div>
        <van-button block round plain :color="currentTheme.primary" class="detail-close" @click="detailVisible = false">知道了</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { api } from '@/api'
import { currentTheme } from '@/utils/site'

const router = useRouter()
const helpItems = ref<Array<{ id: number; title: string; category: string }>>([])
const detailVisible = ref(false)
const current = ref<{ title: string; content: string } | null>(null)
const loadingId = ref(0)

/** 分类 → 图标 */
const iconOf = (category: string) => {
  const map: Record<string, string> = {
    order: 'logistics', member: 'gem-o', join: 'gift-o',
    commission: 'gold-coin-o', aftersale: 'service-o',
  }
  return map[category] || 'question-o'
}

const openHelp = async (item: { id: number; title: string }) => {
  loadingId.value = item.id
  try {
    const detail = await api.getHelpDetail(item.id)
    current.value = { title: detail.title, content: detail.content }
    detailVisible.value = true
  } finally {
    loadingId.value = 0
  }
}

const contactService = () => {
  showToast('请尽量描述清楚问题，客服会在后台处理')
  router.push('/mine/work-orders')
}

onMounted(async () => {
  try {
    helpItems.value = await api.getHelpList()
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
.support-card { margin-top: 12px; overflow: hidden; border: 1px solid rgba(231, 233, 237,.86); border-radius: 14px; box-shadow: 0 8px 24px rgba(17,24,39,.06); }
.primary-action { margin-top: 16px; height: 44px; font-weight: 800; }
.help-detail { padding: 22px 18px calc(18px + env(safe-area-inset-bottom)); }
.help-detail-title { font-size: 18px; font-weight: 800; color: #171A1F; }
.help-detail-body { margin-top: 14px; font-size: 14px; line-height: 1.9; color: #626A73; white-space: pre-wrap; }
.detail-close { margin-top: 20px; height: 42px; font-weight: 700; }
</style>
