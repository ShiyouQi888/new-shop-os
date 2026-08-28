<template>
  <div v-if="userStore.member" class="mine-page page-shell">
    <section class="user-header">
      <div class="user-info" @click="onUserClick">
        <van-image round width="64" height="64" :src="userStore.member.avatar" />
        <div class="user-detail">
          <div class="user-name">
            {{ userStore.member.nickname }}
            <LevelBadge v-if="userStore.isAgent" :level="userStore.level" />
          </div>
          <div class="user-phone">{{ userStore.member.phone }}</div>
          <div class="upgrade-hint">{{ userStore.isAgent ? '分享权益已生效' : '购买大礼包成为代理商' }}</div>
        </div>
        <div class="auth-actions">
          <button class="auth-link" type="button" @click.stop="router.push('/login')">切换</button>
          <button class="auth-link logout-link" type="button" @click.stop="onLogout">退出</button>
        </div>
      </div>

      <div class="identity-metrics">
        <div>
          <strong>{{ userStore.shopDiscount / 10 }}折</strong>
          <span>购物折扣</span>
        </div>
        <div>
          <strong>{{ formatMoney(userStore.monthlyCredit) }}</strong>
          <span>月度额度</span>
        </div>
        <div>
          <strong>{{ userStore.member.inviteCode }}</strong>
          <span>邀请码</span>
        </div>
      </div>
    </section>

    <section v-if="userStore.isAgent" class="agent-entry" @click="router.push('/agent')">
      <div class="entry-left">
        <van-icon name="medal-o" size="24" :color="currentTheme.primary" />
        <div>
          <div class="entry-title">会员工作台</div>
          <div class="entry-desc">可提现 {{ formatMoney(userStore.wallet?.balance || 0) }}，管理团队与收益</div>
        </div>
      </div>
      <van-icon name="arrow" />
    </section>
    <section v-else class="agent-entry" @click="router.push('/agent/credit')">
      <div class="entry-left">
        <van-icon name="gift-o" size="24" :color="currentTheme.primary" />
        <div>
          <div class="entry-title">月度领货</div>
          <div class="entry-desc">购物消费累加额度，{{ formatMoney(userStore.monthlyCredit) }} 可兑换商品</div>
        </div>
      </div>
      <van-icon name="arrow" />
    </section>

    <section class="section-card">
      <div class="section-header">
        <span class="premium-section-title">我的订单</span>
        <button type="button" class="section-more" @click="router.push('/orders')">全部订单</button>
      </div>
      <div class="order-status-grid">
        <button class="status-item" type="button" v-for="s in orderStatusItems" :key="s.label" @click="goOrders(s.value)">
          <van-icon :name="s.icon" size="24" :badge="s.badge" />
          <span>{{ s.label }}</span>
        </button>
      </div>
    </section>

    <section v-if="userStore.isAgent" class="wallet-card">
      <div class="wallet-item">
        <div class="wallet-value">{{ formatMoney(userStore.wallet?.balance || 0) }}</div>
        <div class="wallet-label">可提现</div>
      </div>
      <div class="wallet-item">
        <div class="wallet-value">{{ formatMoney(userStore.wallet?.frozen || 0) }}</div>
        <div class="wallet-label">待结算</div>
      </div>
      <div class="wallet-item">
        <div class="wallet-value">{{ formatMoney(userStore.wallet?.totalIncome || 0) }}</div>
        <div class="wallet-label">累计收入</div>
      </div>
    </section>

    <section class="section-card tools-card">
      <van-cell-group inset>
        <van-cell title="收货地址" icon="location-o" is-link @click="router.push('/mine/address')" />
        <van-cell title="我的收藏" icon="star-o" is-link @click="router.push('/mine/favorites')" />
        <van-cell title="浏览历史" icon="clock-o" is-link @click="router.push('/mine/history')" />
        <van-cell title="消息通知" icon="bell" is-link :value="unreadCount > 0 ? String(unreadCount) : ''" @click="router.push('/mine/notifications')" />
        <van-cell title="我的工单" icon="records-o" is-link @click="router.push('/mine/work-orders')" />
        <van-cell title="客服与帮助" icon="service-o" is-link @click="router.push('/mine/help')" />
        <van-cell title="规则中心" icon="description" is-link @click="router.push('/mine/rules')" />
      </van-cell-group>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast } from 'vant'
import { useUserStore } from '@/stores/user'
import { api } from '@/api'
import { formatMoney } from '@shop-os/shared'
import LevelBadge from '@/components/LevelBadge.vue'
import { currentTheme } from '@/utils/site'

const router = useRouter()
const userStore = useUserStore()
const unreadCount = ref(0)

onMounted(async () => {
  if (!userStore.member) return
  try {
    const data = await api.getNotifications()
    unreadCount.value = data.unread
  } catch { /* 忽略 */ }
})

const orderStatusItems = [
  { label: '待付款', icon: 'balance-o', value: 1, badge: '' },
  { label: '待发货', icon: 'logistics', value: 2, badge: '' },
  { label: '待收货', icon: 'send-gift-o', value: 3, badge: '' },
  { label: '已完成', icon: 'passed', value: 4, badge: '' },
  { label: '售后', icon: 'replay', value: 5, badge: '' },
]

const onUserClick = () => {
  if (!userStore.isAgent) router.push('/gift-zone')
}

const goOrders = (status: number) => router.push({ path: '/orders', query: { status } })

const onLogout = () => {
  showConfirmDialog({
    title: '退出登录',
    message: '退出后需要重新登录才能查看订单、地址和分享权益。',
    confirmButtonText: '退出',
  }).then(() => {
    userStore.logout()
    showSuccessToast('已退出登录')
    router.replace('/login')
  }).catch(() => {})
}
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  padding: 12px 12px 84px;
}
.user-header {
  padding: 18px 14px 14px;
  border-radius: 18px;
  color: #fff;
  background:
    linear-gradient(135deg, rgba(23, 32, 42, 0.94), rgba(54, 61, 72, 0.86)),
    url('https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80') center/cover;
  box-shadow: 0 16px 40px rgba(23, 32, 42, 0.18);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-detail {
  flex: 1;
  min-width: 0;
}
.user-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 17px;
  font-weight: 750;
}
.user-phone {
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
}
.upgrade-hint {
  margin-top: 5px;
  color: var(--color-primary-border);
  font-size: 12px;
}
.auth-link {
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 12px;
}
.auth-actions {
  display: grid;
  gap: 8px;
  flex-shrink: 0;
}
.logout-link {
  border-color: rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.18);
}
.identity-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
}
.identity-metrics div {
  padding: 10px 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
}
.identity-metrics strong,
.identity-metrics span {
  display: block;
  text-align: center;
}
.identity-metrics strong {
  font-size: 15px;
  color: var(--color-primary-border);
}
.identity-metrics span {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}
.agent-entry,
.section-card,
.wallet-card {
  margin-top: 10px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-card);
  box-shadow: 0 8px 22px rgba(17, 24, 39, 0.052);
}
.agent-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px;
}
.entry-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.entry-title {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 750;
}
.entry-desc {
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 12px;
}
.section-card {
  overflow: hidden;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 14px 7px;
}
.section-more {
  border: 0;
  background: transparent;
  color: var(--color-primary-dark);
  font-size: 12px;
  font-weight: 700;
}
.order-status-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 7px 0 12px;
}
.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
}
.wallet-card {
  display: flex;
  padding: 14px 0;
}
.wallet-item {
  flex: 1;
  text-align: center;
}
.wallet-value {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 800;
}
.wallet-label {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 11px;
}
.tools-card {
  padding: 6px 0;
}
</style>
