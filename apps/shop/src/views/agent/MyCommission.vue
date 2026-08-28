<template>
  <div class="commission-page page-shell">
    <van-nav-bar title="我的佣金" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <!-- 佣金概览 -->
    <div class="overview-card premium-card">
      <div class="overview-row">
        <div class="ov-item">
          <div class="ov-val price-lg">{{ formatMoney(stats.available) }}</div>
          <div class="ov-label">可提现</div>
        </div>
        <van-button :color="currentTheme.primary" size="small" round @click="showWithdraw = true">申请提现</van-button>
      </div>
      <div class="overview-stats">
        <div class="os-item">
          <div class="os-val">{{ formatMoney(stats.total) }}</div>
          <div class="os-label">累计佣金</div>
        </div>
        <div class="os-item">
          <div class="os-val">{{ formatMoney(stats.pending) }}</div>
          <div class="os-label">待结算</div>
        </div>
        <div class="os-item">
          <div class="os-val">{{ formatMoney(stats.withdrawn) }}</div>
          <div class="os-label">已提现</div>
        </div>
      </div>
    </div>

    <!-- 佣金明细（按分销开关动态渲染层级 tab） -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46px">
      <van-tab title="全部" />
      <van-tab v-for="l in activeLevels" :key="l" :title="l === 1 ? '一级' : l === 2 ? '二级' : '三级'" />
    </van-tabs>

    <div class="commission-list">
      <div class="commission-item premium-card" v-for="item in filteredList" :key="item.id">
        <div class="ci-left">
          <div class="ci-level" :class="`level-${item.distributionLevel}`">
            {{ ['一', '二', '三'][item.distributionLevel - 1] }}级
          </div>
          <div class="ci-info">
            <div class="ci-amount price">+{{ formatMoney(item.amount) }}</div>
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
          <span class="price">{{ formatMoney(stats.available) }}</span>
        </div>
        <van-field v-model="withdrawAmount" type="number" label="提现金额" placeholder="请输入提现金额" />
        <van-cell title="收款方式" :border="false">
          <template #value>
            <van-radio-group v-model="withdrawPayType" direction="horizontal" class="pay-type-group">
              <van-radio name="bank" :disabled="!payout.bankCard">银行卡</van-radio>
              <van-radio name="alipay" :disabled="!payout.alipayAccount">支付宝</van-radio>
            </van-radio-group>
          </template>
        </van-cell>
        <div class="withdraw-account-tip" v-if="accountText">
          <van-icon name="card" />
          <span>{{ accountText }}</span>
        </div>
        <div class="withdraw-tip">
          最低提现 ¥10，<button type="button" @click="router.push('/agent/withdraw-account')">管理收款账号</button>
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
import { CommissionStatusLabels, formatMoney, type Commission, type CommissionStatus } from '@shop-os/shared'
import { useUserStore } from '@/stores/user'
import { currentTheme } from '@/utils/site'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref(0)
const showWithdraw = ref(false)
const withdrawAmount = ref('')
const list = ref<Commission[]>([])
const stats = ref({ total: 0, available: 0, pending: 0, withdrawn: 0 })
/** 分销生效层级（受开关控制） */
const activeLevels = ref<number[]>([1, 2, 3])

const filteredList = computed(() => {
  if (activeTab.value === 0) return list.value
  const level = activeLevels.value[activeTab.value - 1]
  if (!level) return []
  return list.value.filter(c => c.distributionLevel === level)
})

/** 开关变化后修正越界 tab（如停留在二级/三级，后台改为只开一级） */
const clampTab = () => {
  if (activeTab.value > activeLevels.value.length) {
    activeTab.value = 0
  }
}

const statusClass = (status: CommissionStatus) => {
  const map: Record<number, string> = { 0: 'st-pending', 1: 'st-available', 2: 'st-withdrawn', 3: 'st-frozen', 4: 'st-rollback' }
  return map[status] || ''
}

const onWithdraw = async () => {
  if (!userStore.member) return
  const amount = parseFloat(withdrawAmount.value)
  if (!amount || amount < 10) {
    showToast('最低提现金额 ¥10')
    return
  }
  if (amount > stats.value.available) {
    showToast('提现金额超过可提现余额')
    return
  }
  if (withdrawPayType.value === 'bank' && !payout.value.bankCard) {
    showToast('请先绑定银行卡')
    return
  }
  if (withdrawPayType.value === 'alipay' && !payout.value.alipayAccount) {
    showToast('请先绑定支付宝')
    return
  }
  try {
    await api.applyWithdrawal({
      amount: Number(amount.toFixed(2)),
      payType: withdrawPayType.value === 'alipay' ? 1 : 0,
    })
    showSuccessToast('提现申请已提交，等待审核')
    showWithdraw.value = false
    withdrawAmount.value = ''
    // 刷新余额与记录
    const agentStats = await api.getAgentStats(userStore.member)
    stats.value = agentStats.commission
  } catch (e) {
    showToast(e instanceof Error ? e.message : '提现失败，请稍后重试')
  }
}

const payout = ref<{ bankName: string; bankCard: string; alipayAccount: string }>({ bankName: '', bankCard: '', alipayAccount: '' })
const withdrawPayType = ref<'bank' | 'alipay'>('bank')

const accountText = computed(() => {
  if (withdrawPayType.value === 'alipay') {
    return payout.value.alipayAccount ? `支付宝：${payout.value.alipayAccount}` : '尚未绑定支付宝'
  }
  return payout.value.bankCard ? `${payout.value.bankName || '银行卡'}：${payout.value.bankCard}` : '尚未绑定银行卡'
})

onMounted(async () => {
  if (!userStore.member) return
  const agentStats = await api.getAgentStats(userStore.member)
  stats.value = agentStats.commission
  list.value = await api.getCommissions(userStore.member.id)
  try {
    const dist = await api.getDistributionConfig()
    activeLevels.value = dist.activeLevels.length ? dist.activeLevels : [1, 2, 3]
    clampTab()
  } catch { /* 默认全层级 */ }
  try {
    const acc = await api.getPayoutAccount()
    payout.value = { bankName: acc.bankName, bankCard: acc.bankCard, alipayAccount: acc.alipayAccount }
    // 默认优先选择已绑定的方式
    withdrawPayType.value = acc.bankCard ? 'bank' : acc.alipayAccount ? 'alipay' : 'bank'
  } catch { /* 未绑定 */ }
})
</script>

<style scoped>
.commission-page { padding-top: 46px; min-height: 100vh; }
.overview-card { padding: 16px; margin: 12px 14px; }
.overview-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.ov-val { font-size: 24px; }
.ov-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.overview-stats { display: flex; }
.os-item { flex: 1; text-align: center; }
.os-val { font-size: 16px; font-weight: 800; color: var(--text-primary); }
.os-label { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.commission-list { padding: 0 14px 12px; }
.commission-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; }
.ci-left { display: flex; gap: 12px; align-items: center; }
.ci-level { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #fff; flex-shrink: 0; }
.level-1 { background: var(--color-primary); }
.level-2 { background: var(--color-primary-dark); }
.level-3 { background: #626A73; }
.ci-amount { font-size: 16px; }
.ci-meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.ci-time { font-size: 11px; color: var(--text-placeholder); margin-top: 2px; }
.ci-status { font-size: 12px; font-weight: 500; }
.st-pending { color: #F5A623; }
.st-available { color: #18A66A; }
.st-withdrawn { color: var(--text-secondary); }
.st-frozen { color: #E5484D; }
.st-rollback { color: var(--text-secondary); }
.withdraw-popup { padding: 16px; }
.popup-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px; }
.withdraw-balance { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-muted); border-radius: 8px; margin-bottom: 12px; font-size: 14px; }
.withdraw-tip { font-size: 12px; color: var(--text-secondary); margin-top: 8px; }
.withdraw-tip button {
  border: 0;
  background: transparent;
  color: var(--color-primary-dark);
  font-weight: 700;
}
.pay-type-group :deep(.van-radio) {
  margin-left: 12px;
}
.pay-type-group :deep(.van-radio__label) {
  font-size: 13px;
}
.withdraw-account-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--color-primary-light);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-primary-dark);
}
</style>
