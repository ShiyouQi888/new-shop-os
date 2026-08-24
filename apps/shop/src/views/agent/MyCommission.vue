<template>
  <div class="commission-page page-shell">
    <van-nav-bar title="我的佣金" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <!-- 佣金概览 -->
    <div class="overview-card premium-card">
      <div class="overview-row">
        <div class="ov-item">
          <div class="ov-val price-lg">¥{{ stats.available.toFixed(2) }}</div>
          <div class="ov-label">可提现</div>
        </div>
        <van-button color="#17202a" size="small" round @click="showWithdraw = true">申请提现</van-button>
      </div>
      <div class="overview-stats">
        <div class="os-item">
          <div class="os-val">¥{{ stats.total.toFixed(2) }}</div>
          <div class="os-label">累计佣金</div>
        </div>
        <div class="os-item">
          <div class="os-val">¥{{ stats.pending.toFixed(2) }}</div>
          <div class="os-label">待结算</div>
        </div>
        <div class="os-item">
          <div class="os-val">¥{{ stats.withdrawn.toFixed(2) }}</div>
          <div class="os-label">已提现</div>
        </div>
      </div>
    </div>

    <!-- 佣金明细 -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46px">
      <van-tab title="全部" />
      <van-tab title="一级" />
      <van-tab title="二级" />
      <van-tab title="三级" />
    </van-tabs>

    <div class="commission-list">
      <div class="commission-item premium-card" v-for="item in filteredList" :key="item.id">
        <div class="ci-left">
          <div class="ci-level" :class="`level-${item.distributionLevel}`">
            {{ ['一', '二', '三'][item.distributionLevel - 1] }}级
          </div>
          <div class="ci-info">
            <div class="ci-amount price">+¥{{ item.amount.toFixed(2) }}</div>
            <div class="ci-meta">来自会员#{{ item.sourceMemberId }} · {{ item.rate }}% 佣金</div>
            <div class="ci-time">{{ item.createTime }}</div>
          </div>
        </div>
        <div class="ci-status" :class="statusClass(item.status)">{{ CommissionStatusLabels[item.status] }}</div>
      </div>
      <van-empty v-if="!filteredList.length" description="暂无佣金记录" />
    </div>

    <!-- 提现弹窗 -->
    <van-popup v-model:show="showWithdraw" round position="bottom">
      <div class="withdraw-popup">
        <div class="popup-title">申请提现</div>
        <div class="withdraw-balance">
          <span>可提现余额</span>
          <span class="price">¥{{ stats.available.toFixed(2) }}</span>
        </div>
        <van-field v-model="withdrawAmount" type="number" label="提现金额" placeholder="请输入提现金额" />
        <div class="withdraw-tip">
          默认提现到已绑定账号，最低¥10。
          <button type="button" @click="router.push('/agent/withdraw-account')">管理账号</button>
        </div>
        <van-button type="primary" block round style="margin-top: 16px" @click="onWithdraw">确认提现</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import { api } from '@/api'
import { CommissionStatusLabels, type Commission, type CommissionStatus } from '@shop-os/shared'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref(0)
const showWithdraw = ref(false)
const withdrawAmount = ref('')
const list = ref<Commission[]>([])
const stats = ref({ total: 0, available: 0, pending: 0, withdrawn: 0 })

const filteredList = computed(() => {
  if (activeTab.value === 0) return list.value
  return list.value.filter(c => c.distributionLevel === activeTab.value)
})

const statusClass = (status: CommissionStatus) => {
  const map: Record<number, string> = { 0: 'st-pending', 1: 'st-available', 2: 'st-withdrawn', 3: 'st-frozen', 4: 'st-rollback' }
  return map[status] || ''
}

const onWithdraw = () => {
  const amount = parseFloat(withdrawAmount.value)
  if (!amount || amount < 10) {
    showToast('最低提现金额 ¥10')
    return
  }
  if (amount > stats.value.available) {
    showToast('提现金额超过可提现余额')
    return
  }
  showSuccessToast('提现申请已提交，等待审核')
  showWithdraw.value = false
  withdrawAmount.value = ''
}

onMounted(async () => {
  const agentStats = await api.getAgentStats(userStore.member)
  stats.value = agentStats.commission
  list.value = await api.getCommissions(userStore.member.id)
})
</script>

<style scoped>
.commission-page { padding-top: 46px; min-height: 100vh; }
.overview-card { padding: 16px; margin: 12px 14px; }
.overview-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.ov-val { font-size: 24px; }
.ov-label { font-size: 13px; color: #7b8794; margin-top: 4px; }
.overview-stats { display: flex; }
.os-item { flex: 1; text-align: center; }
.os-val { font-size: 16px; font-weight: 800; color: #17202a; }
.os-label { font-size: 12px; color: #7b8794; margin-top: 2px; }
.commission-list { padding: 0 14px 12px; }
.commission-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; }
.ci-left { display: flex; gap: 12px; align-items: center; }
.ci-level { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #fff; flex-shrink: 0; }
.level-1 { background: #17202a; }
.level-2 { background: #8f6f3f; }
.level-3 { background: #7b8794; }
.ci-amount { font-size: 16px; }
.ci-meta { font-size: 12px; color: #7b8794; margin-top: 2px; }
.ci-time { font-size: 11px; color: #a8b1bc; margin-top: 2px; }
.ci-status { font-size: 12px; font-weight: 500; }
.st-pending { color: #fbbd08; }
.st-available { color: #39b54a; }
.st-withdrawn { color: #7b8794; }
.st-frozen { color: #b42318; }
.st-rollback { color: #7b8794; }
.withdraw-popup { padding: 16px; }
.popup-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px; }
.withdraw-balance { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafc; border-radius: 8px; margin-bottom: 12px; font-size: 14px; }
.withdraw-tip { font-size: 12px; color: #7b8794; margin-top: 8px; }
.withdraw-tip button {
  border: 0;
  background: transparent;
  color: #8f6f3f;
  font-weight: 700;
}
</style>
