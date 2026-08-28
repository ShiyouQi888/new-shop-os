<template>
  <div class="agent-home page-shell" v-if="stats">
    <van-nav-bar title="会员工作台" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <main class="agent-body">
      <section class="identity-card">
        <div class="identity-top">
          <div class="profile">
            <van-image round width="54" height="54" :src="stats.member.avatar" />
            <div>
              <div class="id-name">{{ stats.member.nickname }}</div>
              <div class="id-meta">
                <LevelBadge :level="stats.member.level" />
                <span>邀请码 {{ stats.member.inviteCode }}</span>
              </div>
            </div>
          </div>
          <button class="outline-action" type="button" @click="router.push('/agent/promote')">
            <van-icon name="share-o" />
            <span>推广</span>
          </button>
        </div>

        <div class="asset-row">
          <div>
            <span>可提现余额</span>
            <strong>{{ formatMoney(stats.commission.available) }}</strong>
          </div>
          <van-button class="withdraw-action" round color="#ffffff" size="small" @click="router.push('/agent/commission')">
            申请提现
          </van-button>
        </div>

        <div class="rights-row">
          <span>{{ stats.member.level === 2 ? 8 : 9 }}折商城</span>
          <span>月领 {{ formatMoney(userStore.monthlyCredit) }}</span>
          <span>权益周期 10 个月</span>
        </div>
      </section>

      <section class="metric-grid" aria-label="经营指标">
        <button class="metric-card" type="button" @click="router.push('/agent/commission')">
          <span>累计佣金</span>
          <strong>{{ formatMoney(stats.commission.total, 0) }}</strong>
        </button>
        <button class="metric-card" type="button" @click="router.push('/agent/credit')">
          <span>本月待领</span>
          <strong>{{ formatMoney(stats.monthlyCredit?.remainAmount || 0) }}</strong>
        </button>
        <button class="metric-card" type="button" @click="router.push('/agent/team')">
          <span>团队人数</span>
          <strong>{{ stats.team.total }}</strong>
        </button>
        <button class="metric-card" type="button" @click="router.push('/agent/resell')">
          <span>转卖中</span>
          <strong>{{ stats.resellActive }}</strong>
        </button>
      </section>

      <section class="withdraw-card premium-card" @click="router.push('/agent/withdraw-account')">
        <div class="section-heading">
          <div>
            <span class="section-kicker">PAYOUT ACCOUNT</span>
            <h2>提现账号</h2>
          </div>
          <van-icon name="arrow" :color="currentTheme.primaryDark" />
        </div>
        <div class="account-preview">
          <div class="account-chip primary">
            <van-icon name="card" />
            <span>招商银行 · ****1234</span>
          </div>
          <div class="account-chip">
            <van-icon name="paid" />
            <span>支付宝 · 138****1111</span>
          </div>
        </div>
      </section>

      <section class="section-card premium-card">
        <div class="section-heading">
          <div>
            <span class="section-kicker">OPERATIONS</span>
            <h2>经营工具</h2>
          </div>
        </div>
        <div class="quick-grid">
          <button class="quick-cell" type="button" v-for="item in quickItems" :key="item.label" @click="router.push(item.to)">
            <span class="quick-icon" :class="item.tone">
              <van-icon :name="item.icon" size="22" />
            </span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </section>

      <section class="todo-card premium-card">
        <div class="section-heading">
          <div>
            <span class="section-kicker">ATTENTION</span>
            <h2>待办提醒</h2>
          </div>
        </div>
        <div class="todo-item">
          <van-icon name="clock-o" color="#F5A623" />
          <span>本月领货权益将在 {{ expireDate }} 到期，请及时领取</span>
        </div>
        <div class="todo-item">
          <van-icon name="balance-o" color="#18A66A" />
          <span>佣金 {{ formatMoney(stats.commission.available, 0) }} 可提现，提现前请确认账号</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'
import { formatMoney } from '@shop-os/shared'
import LevelBadge from '@/components/LevelBadge.vue'
import { currentTheme } from '@/utils/site'

const router = useRouter()
const userStore = useUserStore()
const stats = ref<Awaited<ReturnType<typeof api.getAgentStats>> | null>(null)

const quickItems = [
  { label: '月度领货', icon: 'gift-o', tone: 'tone-gold', to: '/agent/credit' },
  { label: '发起转卖', icon: 'exchange', tone: 'tone-blue', to: '/agent/resell' },
  { label: '推广海报', icon: 'share-o', tone: 'tone-green', to: '/agent/promote' },
  { label: '我的团队', icon: 'friends-o', tone: 'tone-ink', to: '/agent/team' },
  { label: '佣金明细', icon: 'balance-o', tone: 'tone-amber', to: '/agent/commission' },
  { label: '商城购物', icon: 'shop-o', tone: 'tone-slate', to: '/home' },
]

const expireDate = computed(() => {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getMonth() + 1}月${last.getDate()}日`
})

onMounted(async () => {
  if (!userStore.member) return
  stats.value = await api.getAgentStats(userStore.member)
})
</script>

<style>
.agent-home {
  padding-top: 46px;
  min-height: 100vh;
}
.agent-home .agent-body {
  padding: 12px 14px 24px;
}
.agent-home .identity-card {
  padding: 18px;
  border-radius: 20px;
  color: #fff;
  background:
    linear-gradient(135deg, rgba(23, 32, 42, 0.96), rgba(48, 56, 66, 0.82)),
    url('https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=900&q=80') center/cover;
  box-shadow: 0 22px 54px rgba(23, 32, 42, 0.2);
}
.agent-home .identity-top,
.agent-home .profile,
.agent-home .id-meta,
.agent-home .asset-row,
.agent-home .rights-row,
.agent-home .section-heading {
  display: flex;
  align-items: center;
}
.agent-home .identity-top,
.agent-home .asset-row,
.agent-home .section-heading {
  justify-content: space-between;
}
.agent-home .profile {
  gap: 12px;
  min-width: 0;
}
.agent-home .id-name {
  font-size: 18px;
  font-weight: 800;
}
.agent-home .id-meta {
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}
.agent-home .outline-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 11px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.agent-home .asset-row {
  margin-top: 24px;
}
.agent-home .asset-row span,
.agent-home .metric-card span {
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
}
.agent-home .asset-row strong {
  display: block;
  margin-top: 4px;
  font-size: 30px;
  line-height: 1;
}
.agent-home .withdraw-action {
  min-width: 88px;
  border: 1px solid rgba(255, 255, 255, 0.72) !important;
  color: #171A1F !important;
  font-weight: 800;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}
.agent-home .withdraw-action .van-button__text {
  color: #171A1F !important;
}
.agent-home .rights-row {
  gap: 8px;
  margin-top: 18px;
  overflow-x: auto;
}
.agent-home .rights-row span {
  flex: 1;
  min-width: max-content;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.78);
  text-align: center;
  font-size: 11px;
  font-weight: 650;
}
.agent-home .metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.agent-home .metric-card {
  padding: 15px 14px;
  border: 1px solid rgba(231, 233, 237, 0.86);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(17, 24, 39, 0.06);
  text-align: left;
}
.agent-home .metric-card span {
  color: #626A73;
}
.agent-home .metric-card strong {
  display: block;
  margin-top: 7px;
  color: #171A1F;
  font-size: 22px;
  line-height: 1;
}
.agent-home .withdraw-card,
.agent-home .section-card,
.agent-home .todo-card {
  margin-top: 12px;
  padding: 16px;
}
.agent-home .section-kicker {
  color: var(--color-primary-dark);
  font-size: 10px;
  font-weight: 800;
}
.agent-home h2 {
  margin-top: 3px;
  color: #171A1F;
  font-size: 17px;
  line-height: 1.2;
}
.agent-home .account-preview {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}
.agent-home .account-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  background: #F8F9FB;
  color: #626A73;
  font-size: 13px;
  font-weight: 650;
}
.agent-home .account-chip.primary {
  color: var(--color-primary-dark);
  background: var(--color-primary-light);
}
.agent-home .quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.agent-home .quick-cell {
  min-height: 82px;
  border: 1px solid rgba(231, 233, 237, 0.78);
  border-radius: 14px;
  background: #fff;
  color: #626A73;
  font-size: 12px;
  font-weight: 700;
}
.agent-home .quick-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin: 0 auto 8px;
  border-radius: 12px;
}
.agent-home .tone-gold { color: var(--color-primary); background: var(--color-primary-light); }
.agent-home .tone-blue { color: #626A73; background: #F8F9FB; }
.agent-home .tone-green { color: #18A66A; background: #EAF8F2; }
.agent-home .tone-ink { color: #171A1F; background: #F8F9FB; }
.agent-home .tone-amber { color: #F5A623; background: var(--color-primary-light); }
.agent-home .tone-slate { color: #626A73; background: #F8F9FB; }
.agent-home .todo-card {
  margin-bottom: 8px;
}
.agent-home .todo-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-top: 12px;
  color: #626A73;
  font-size: 13px;
  line-height: 1.5;
}
</style>
