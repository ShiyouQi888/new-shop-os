<template>
  <div class="credit-page page-shell">
    <van-nav-bar title="月度领货" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <div class="credit-body" v-if="credits.length">
      <!-- 本月领货权益 -->
      <div class="current-card premium-card">
        <div class="current-header">
          <div>
            <div class="current-month">{{ currentCredit?.month }} 领货权益</div>
            <div class="current-desc">截止 {{ formatDate(currentCredit?.expireTime) }}</div>
          </div>
          <LevelBadge :level="currentCredit?.memberLevel || 1" />
        </div>
        <van-progress :percentage="usagePercent" color="#b88a44" stroke-width="10" />
        <div class="current-stats">
          <div class="cs-item">
            <div class="cs-val price-lg">{{ formatMoney(currentCredit?.remainAmount || 0) }}</div>
            <div class="cs-label">剩余额度</div>
          </div>
          <div class="cs-item">
            <div class="cs-val">¥{{ currentCredit?.usedAmount || 0 }}</div>
            <div class="cs-label">已使用</div>
          </div>
          <div class="cs-item">
            <div class="cs-val">¥{{ currentCredit?.creditAmount || 0 }}</div>
            <div class="cs-label">本月总额度</div>
          </div>
        </div>
      </div>

      <!-- 领货操作 -->
      <div class="action-row">
        <van-button color="#17202a" block round @click="goPickProducts">领取商品自用</van-button>
        <van-button plain color="#8f6f3f" block round @click="goResell">一键转卖变现</van-button>
      </div>

      <!-- 领货进度 -->
      <div class="progress-card premium-card">
        <div class="card-title">领货权益进度</div>
        <div class="progress-info">
          <span>已领 {{ usedMonths }}/{{ totalMonths }} 个月</span>
          <span>剩余 {{ totalMonths - usedMonths }} 个月</span>
        </div>
        <div class="months-bar">
          <div v-for="i in totalMonths" :key="i" :class="['month-dot', { used: i <= usedMonths, current: i === usedMonths + 1 }]">
            {{ i }}
          </div>
        </div>
      </div>

      <!-- 领货记录 -->
      <div class="history-card premium-card">
        <div class="card-title">领货记录</div>
        <div v-for="credit in credits" :key="credit.id" class="history-item">
          <div class="hist-left">
            <div class="hist-month">{{ credit.month }}</div>
            <div class="hist-status">{{ CreditStatusLabels[credit.status] }}</div>
          </div>
          <div class="hist-right">
            <div class="hist-amount">¥{{ credit.usedAmount }} / ¥{{ credit.creditAmount }}</div>
            <div class="hist-desc">剩余 ¥{{ credit.remainAmount }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'
import { formatMoney, formatDate, CreditStatusLabels, type MonthlyCredit } from '@shop-os/shared'
import LevelBadge from '@/components/LevelBadge.vue'

const router = useRouter()
const userStore = useUserStore()
const credits = ref<MonthlyCredit[]>([])

const currentCredit = computed(() => credits.value[0])
const usagePercent = computed(() => {
  if (!currentCredit.value) return 0
  const total = currentCredit.value.creditAmount
  return total > 0 ? Math.round(currentCredit.value.usedAmount / total * 100) : 0
})
const totalMonths = 10
const usedMonths = computed(() => credits.value.length)

const goPickProducts = () => {
  router.push({ path: '/category', query: { monthly: 1 } })
}
const goResell = () => router.push('/agent/resell')

onMounted(async () => {
  credits.value = await api.getMonthlyCredit(userStore.member.id)
})
</script>

<style scoped>
.credit-page { padding-top: 46px; min-height: 100vh; }
.credit-body { padding: 12px 14px 24px; }
.current-card { padding: 16px; margin-bottom: 12px; }
.current-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.current-month { color: #17202a; font-size: 18px; font-weight: 800; }
.current-desc { font-size: 12px; color: #7b8794; margin-top: 4px; }
.current-stats { display: flex; justify-content: space-around; margin-top: 16px; }
.cs-item { text-align: center; }
.cs-val { font-size: 18px; font-weight: 800; color: #17202a; }
.cs-label { font-size: 12px; color: #7b8794; margin-top: 4px; }
.action-row { display: flex; gap: 10px; margin-bottom: 12px; }
.progress-card { padding: 16px; margin-bottom: 12px; }
.card-title { color: #17202a; font-size: 15px; font-weight: 800; margin-bottom: 12px; }
.progress-info { display: flex; justify-content: space-between; font-size: 13px; color: #4d5967; margin-bottom: 12px; }
.months-bar { display: flex; gap: 6px; flex-wrap: wrap; }
.month-dot {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px;
  background: #f3f5f7; color: #a8b1bc;
}
.month-dot.used { background: #177245; color: #fff; }
.month-dot.current { background: #17202a; color: #fff; }
.history-card { padding: 16px; }
.history-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
.history-item:last-child { border-bottom: none; }
.hist-month { color: #17202a; font-size: 14px; font-weight: 700; }
.hist-status { font-size: 12px; color: #7b8794; margin-top: 2px; }
.hist-amount { color: #17202a; font-size: 14px; font-weight: 700; text-align: right; }
.hist-desc { font-size: 12px; color: #7b8794; text-align: right; margin-top: 2px; }
</style>
