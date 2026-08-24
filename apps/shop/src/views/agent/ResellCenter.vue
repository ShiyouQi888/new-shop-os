<template>
  <div class="resell-page page-shell">
    <van-nav-bar title="转卖中心" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <!-- 转卖预估 -->
    <div class="estimate-card premium-card">
      <div class="card-title">转卖预估</div>
      <div class="estimate-form">
        <div class="est-item">
          <span>商品价值</span>
          <van-stepper v-model="goodsValue" :step="50" :min="50" />
        </div>
        <div class="est-result">
          <div class="est-line">
            <span>商品价值</span>
            <span>¥{{ goodsValue.toFixed(2) }}</span>
          </div>
          <div class="est-line danger">
            <span>服务费 (20%)</span>
            <span>-¥{{ serviceFee.toFixed(2) }}</span>
          </div>
          <div class="est-line danger">
            <span>快递费</span>
            <span>-¥{{ shippingFee.toFixed(2) }}</span>
          </div>
          <van-divider margin="8px 0" />
          <div class="est-line result">
            <span>预计到账</span>
            <span class="result-price">¥{{ settleAmount.toFixed(2) }}</span>
          </div>
        </div>
        <van-button block round color="#17202a" :loading="submitting" loading-text="提交中..." @click="confirmResell">
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
          <div class="rec-amount price">+¥{{ item.settleAmount.toFixed(2) }}</div>
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
import { ResellStatus, ResellStatusLabels, type ResellOrder } from '@shop-os/shared'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref(0)
const goodsValue = ref(980)
const list = ref<ResellOrder[]>([])
const submitting = ref(false)
const serviceFee = computed(() => Number((goodsValue.value * 0.2).toFixed(2)))
const shippingFee = 10
const settleAmount = computed(() => Number(Math.max(goodsValue.value - serviceFee.value - shippingFee, 0).toFixed(2)))

const filteredList = computed(() => {
  if (activeTab.value === 0) return list.value
  if (activeTab.value === 1) return list.value.filter(r => r.status < 2)
  return list.value.filter(r => r.status === 3)
})

const statusClass = (status: ResellStatus) => {
  const map: Record<number, string> = { 0: 'st-wait', 1: 'st-match', 2: 'st-matched', 3: 'st-done', 4: 'st-cancel' }
  return map[status] || ''
}

const nowText = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const generateResellNo = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  return `RS${date}${String(Date.now()).slice(-5)}`
}

const confirmResell = () => {
  if (!userStore.member) {
    showToast('请先登录')
    router.replace('/login')
    return
  }
  if (settleAmount.value <= 0) {
    showToast('预计到账需大于 0')
    return
  }

  showConfirmDialog({
    title: '确认转卖',
    message: `提交后系统将按 ¥${goodsValue.value.toFixed(2)} 商品价值进入匹配，预计到账 ¥${settleAmount.value.toFixed(2)}。`,
    confirmButtonText: '发起转卖',
  }).then(() => {
    submitting.value = true
    setTimeout(() => {
      const order: ResellOrder = {
        id: Date.now(),
        resellNo: generateResellNo(),
        memberId: userStore.member!.id,
        creditId: 0,
        skuId: 0,
        skuName: '月度领货转卖商品',
        quantity: 1,
        goodsValue: goodsValue.value,
        serviceFee: serviceFee.value,
        shippingFee,
        settleAmount: settleAmount.value,
        status: ResellStatus.PendingMatch,
        matchOrderId: null,
        matchTime: null,
        settleTime: null,
        cancelTime: null,
        createTime: nowText(),
      }
      list.value.unshift(order)
      activeTab.value = 1
      submitting.value = false
      showSuccessToast('转卖申请已提交，等待系统匹配')
    }, 500)
  }).catch(() => {})
}

onMounted(async () => {
  if (!userStore.member) return
  list.value = await api.getResellOrders(userStore.member.id)
})
</script>

<style scoped>
.resell-page { padding-top: 46px; min-height: 100vh; padding-bottom: 20px; }
.estimate-card, .rules-card, .records-card { padding: 16px; margin: 12px 14px; }
.card-title { color: #17202a; font-size: 15px; font-weight: 800; margin-bottom: 12px; }
.estimate-form { display: flex; flex-direction: column; gap: 12px; }
.est-item { display: flex; justify-content: space-between; align-items: center; }
.est-result { background: #f3f5f7; border-radius: 12px; padding: 16px; }
.est-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #4d5967; }
.est-line.danger span:last-child { color: #b42318; }
.est-line.result { font-weight: 600; font-size: 15px; }
.result-price { color: #17202a; font-size: 20px; font-weight: 800; }
.rule-item { font-size: 13px; color: #4d5967; padding: 4px 0; }
.record-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
.record-item:last-child { border-bottom: none; }
.rec-name { font-size: 14px; font-weight: 500; }
.rec-meta { font-size: 11px; color: #7b8794; margin-top: 2px; }
.rec-amount { font-size: 15px; }
.rec-status { font-size: 12px; margin-top: 4px; text-align: right; }
.st-wait { color: #fbbd08; }
.st-match { color: #409eff; }
.st-matched { color: #409eff; }
.st-done { color: #39b54a; }
.st-cancel { color: #7b8794; }
</style>
