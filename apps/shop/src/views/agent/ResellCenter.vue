<template>
  <div class="resell-page page-shell">
    <van-nav-bar title="转卖中心" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <!-- 转卖预估 -->
    <div class="estimate-card premium-card">
      <div class="card-title">转卖预估</div>
      <div class="estimate-form">
        <div class="est-item">
          <span>可用额度</span>
          <strong class="credit-value">{{ creditLabel }}</strong>
        </div>
        <div class="est-item">
          <span>商品价值</span>
          <strong class="fixed-value">{{ formatMoney(goodsValue) }}</strong>
        </div>
        <div class="mode-hint">转卖固定为一次性转卖全部可转卖额度，不支持部分转卖</div>
        <div class="mode-hint" v-if="selectedCredit && selectedCredit.remainAmount > selectedCredit.resellableAmount">
          该月另有 {{ formatMoney(selectedCredit.remainAmount - selectedCredit.resellableAmount) }} 额度不支持转卖，仅能用于领取商品
        </div>
        <div class="est-result">
          <div class="est-line">
            <span>商品价值</span>
            <span>{{ formatMoney(goodsValue) }}</span>
          </div>
          <div class="est-line danger">
            <span>服务费 (20%)</span>
            <span>-{{ formatMoney(serviceFee) }}</span>
          </div>
          <div class="est-line danger">
            <span>快递费</span>
            <span>-{{ formatMoney(shippingFee) }}</span>
          </div>
          <van-divider margin="8px 0" />
          <div class="est-line result">
            <span>预计到账</span>
            <span class="result-price">{{ formatMoney(settleAmount) }}</span>
          </div>
        </div>
        <van-button block round :color="currentTheme.primary" :loading="submitting" loading-text="提交中..." @click="confirmResell">
          确认发起转卖
        </van-button>
      </div>
    </div>

    <!-- 转卖规则 -->
    <div class="rules-card premium-card">
      <div class="card-title">转卖规则</div>
      <div class="rule-item">• 服务费率 20%，从转卖款中扣除</div>
      <div class="rule-item">• 快递费 ¥10，由卖家承担</div>
      <div class="rule-item">• 匹配超时 30 天，系统兜底处理</div>
      <div class="rule-item">• 未匹配前可随时取消</div>
    </div>

    <!-- 转卖记录 -->
    <div class="records-card premium-card">
      <div class="card-title">转卖记录</div>
      <van-tabs v-model:active="activeTab" shrink>
        <van-tab title="全部" />
        <van-tab title="待匹配" />
        <van-tab title="已完成" />
      </van-tabs>
      <div class="record-item" v-for="item in filteredList" :key="item.id">
        <div class="rec-left">
          <div class="rec-name">{{ item.skuName }}</div>
          <div class="rec-meta">{{ item.resellNo }}</div>
        </div>
        <div class="rec-right">
          <div class="rec-amount price">+{{ formatMoney(item.settleAmount) }}</div>
          <div class="rec-status" :class="statusClass(item.status)">{{ ResellStatusLabels[item.status] }}</div>
        </div>
      </div>
      <van-empty v-if="!filteredList.length" description="暂无转卖记录" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { api } from '@/api'
import { ResellStatus, ResellStatusLabels, formatMoney, type ResellOrder } from '@shop-os/shared'
import { useUserStore } from '@/stores/user'
import { currentTheme } from '@/utils/site'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref(0)
const credits = ref<Array<{ id: number; month: string; remainAmount: number; resellableAmount: number; status: number }>>([])
const list = ref<ResellOrder[]>([])
const submitting = ref(false)
// 消费返还所得额度不支持转卖，仅 resellableAmount（入会礼包发放部分）可转卖；固定取最近一笔可转卖额度，无需手动选择
const usableCredits = computed(() => credits.value.filter(c => c.resellableAmount > 0 && [0, 1].includes(Number(c.status))))
const selectedCredit = computed(() => usableCredits.value[0] || null)
// 转卖固定为一次性转卖全部可转卖额度，商品价值直接等于可转卖额度，不允许调整
const goodsValue = computed(() => Number(selectedCredit.value?.resellableAmount ?? 0))
const serviceFee = computed(() => Number((goodsValue.value * 0.2).toFixed(2)))
const shippingFee = 10
const settleAmount = computed(() => Number(Math.max(goodsValue.value - serviceFee.value - shippingFee, 0).toFixed(2)))
const creditLabel = computed(() => selectedCredit.value
  ? `${selectedCredit.value.month} 可转卖 ${formatMoney(selectedCredit.value.resellableAmount)}`
  : '暂无可转卖额度')

const filteredList = computed(() => {
  if (activeTab.value === 0) return list.value
  if (activeTab.value === 1) return list.value.filter(r => r.status < 2)
  return list.value.filter(r => r.status === 3)
})

const statusClass = (status: ResellStatus) => {
  const map: Record<number, string> = { 0: 'st-wait', 1: 'st-match', 2: 'st-matched', 3: 'st-done', 4: 'st-cancel' }
  return map[status] || ''
}

const confirmResell = async () => {
  if (!userStore.member) {
    showToast('请先登录')
    router.replace('/login')
    return
  }
  if (!selectedCredit.value || settleAmount.value <= 0) {
    showToast('可转卖额度不足')
    return
  }

  try {
    await showConfirmDialog({
      title: '确认转卖',
      message: `提交后系统将按 ${formatMoney(goodsValue.value)} 商品价值进入匹配，预计到账 ${formatMoney(settleAmount.value)}。`,
      confirmButtonText: '发起转卖',
    })
  } catch {
    return
  }

  submitting.value = true
  try {
    await api.createResell({
      creditId: selectedCredit.value.id,
      skuName: '月度领货转卖商品',
    })
    await loadPageData()
    activeTab.value = 1
    showSuccessToast('转卖申请已提交，等待系统匹配')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!userStore.member) return
  await loadPageData()
})

const loadPageData = async () => {
  if (!userStore.member) return
  const [creditRows, resellRows] = await Promise.all([
    api.getMonthlyCredit(userStore.member.id),
    api.getResellOrders(userStore.member.id),
  ])
  credits.value = creditRows.map(c => ({
    id: c.id,
    month: c.month,
    remainAmount: Number(c.remainAmount ?? 0),
    resellableAmount: Number(c.resellableAmount ?? 0),
    status: Number(c.status ?? 0),
  }))
  list.value = resellRows
}
</script>

<style scoped>
.resell-page { padding-top: 46px; min-height: 100vh; padding-bottom: 20px; }
.estimate-card, .rules-card, .records-card { padding: 16px; margin: 12px 14px; }
.card-title { color: #171A1F; font-size: 15px; font-weight: 800; margin-bottom: 12px; }
.estimate-form { display: flex; flex-direction: column; gap: 12px; }
.est-item { display: flex; justify-content: space-between; align-items: center; }
.fixed-value { color: #171A1F; font-size: 16px; }
.mode-hint { margin-top: -6px; font-size: 12px; color: #9AA1AA; }
.credit-value { color: #171A1F; font-size: 14px; font-weight: 700; }
.est-result { background: #F8F9FB; border-radius: 12px; padding: 16px; }
.est-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #626A73; }
.est-line.danger span:last-child { color: #E5484D; }
.est-line.result { font-weight: 600; font-size: 15px; }
.result-price { color: #171A1F; font-size: 20px; font-weight: 800; }
.rule-item { font-size: 13px; color: #626A73; padding: 4px 0; }
.record-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #E7E9ED; }
.record-item:last-child { border-bottom: none; }
.rec-name { font-size: 14px; font-weight: 500; }
.rec-meta { font-size: 11px; color: #626A73; margin-top: 2px; }
.rec-amount { font-size: 15px; }
.rec-status { font-size: 12px; margin-top: 4px; text-align: right; }
.st-wait { color: #F5A623; }
.st-match { color: var(--color-primary); }
.st-matched { color: var(--color-primary); }
.st-done { color: #18A66A; }
.st-cancel { color: #626A73; }
</style>
