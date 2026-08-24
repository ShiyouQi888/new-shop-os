<template>
  <div class="promote-page page-shell">
    <van-nav-bar title="推广中心" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <main class="promote-body">
    <section class="promote-hero">
      <div>
        <p class="eyebrow">PRIVATE GROWTH</p>
        <h1>专属推广资产</h1>
        <p>统一的邀请码、海报与佣金路径，适合社群、私域和线下客户场景。</p>
      </div>
      <van-icon name="share-o" />
    </section>

    <div class="poster-card premium-card">
      <div class="poster-preview">
        <div class="poster-inner">
          <div class="poster-top">
            <div class="poster-brand">Shop-OS</div>
            <div class="poster-slogan">加入代理商 开启分销之路</div>
          </div>
          <div class="poster-content">
            <van-image round width="60" height="60" :src="userStore.member.avatar" />
            <div class="poster-name">{{ userStore.member.nickname }} 邀请你加入</div>
            <div class="poster-benefits">
              <div class="pb-item">大礼包入会</div>
              <div class="pb-item">月度领货权益</div>
              <div class="pb-item">三级分销佣金</div>
              <div class="pb-item">站内转卖变现</div>
            </div>
          </div>
          <div class="poster-qr">
            <div class="qr-box">
              <van-icon name="qr" size="48" />
            </div>
            <div class="qr-text">扫码注册</div>
          </div>
        </div>
      </div>
      <div class="poster-actions">
        <van-button class="outline-btn" plain size="small" icon="share-o" @click="copyLink">复制推广链接</van-button>
        <van-button class="outline-btn" plain size="small" icon="save" @click="savePoster">保存海报</van-button>
      </div>
    </div>

    <div class="invite-card premium-card">
      <div class="invite-row">
        <div class="invite-label">专属邀请码</div>
        <div class="invite-code">{{ userStore.member.inviteCode }}</div>
        <van-button class="copy-btn" size="small" @click="copyCode">复制</van-button>
      </div>
    </div>

    <div class="stats-card premium-card">
      <div class="card-title">推广数据</div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-val">128</div>
          <div class="stat-label">点击数</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">15</div>
          <div class="stat-label">注册数</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">6</div>
          <div class="stat-label">成交数</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">40%</div>
          <div class="stat-label">转化率</div>
        </div>
      </div>
      <div class="commission-stats">
        <div class="cs-row">
          <span>一级佣金</span>
          <span class="price">¥{{ levelCommission(1) }}</span>
        </div>
        <div class="cs-row">
          <span>二级佣金</span>
          <span class="price">¥{{ levelCommission(2) }}</span>
        </div>
        <div class="cs-row">
          <span>三级佣金</span>
          <span class="price">¥{{ levelCommission(3) }}</span>
        </div>
        <div class="cs-row total">
          <span>累计佣金</span>
          <span class="price">¥{{ totalCommission }}</span>
        </div>
      </div>
    </div>

    <div class="guide-card premium-card">
      <div class="card-title">推广新手指南</div>
      <div class="guide-item">
        <div class="guide-num">1</div>
        <div class="guide-text">分享专属推广链接或海报给好友</div>
      </div>
      <div class="guide-item">
        <div class="guide-num">2</div>
        <div class="guide-text">好友通过你的链接注册并购买大礼包</div>
      </div>
      <div class="guide-item">
        <div class="guide-num">3</div>
        <div class="guide-text">好友确认收货后7天，佣金自动到账</div>
      </div>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import { useUserStore } from '@/stores/user'
import { mockCommissions } from '@shop-os/shared'

const router = useRouter()
const userStore = useUserStore()

const link = `https://shop-os.com/r/${userStore.member.inviteCode}`

const levelCommission = (level: number) => {
  return mockCommissions.filter(c => c.distributionLevel === level)
    .reduce((sum, c) => sum + c.amount, 0).toFixed(2)
}
const totalCommission = computed(() => {
  return mockCommissions.reduce((sum, c) => sum + c.amount, 0).toFixed(2)
})

const copyLink = () => {
  navigator.clipboard.writeText(link)
  showSuccessToast('链接已复制')
}
const copyCode = () => {
  navigator.clipboard.writeText(userStore.member.inviteCode)
  showSuccessToast('邀请码已复制')
}

const savePoster = () => {
  showSuccessToast('推广海报已保存到模拟相册')
}
</script>

<style scoped>
.promote-page {
  padding-top: 46px;
  padding-bottom: 24px;
}

.promote-body {
  padding: 12px 14px 24px;
}

.promote-hero {
  min-height: 142px;
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  color: #fff;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, .96), rgba(45, 52, 65, .88)),
    url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80') center/cover;
  overflow: hidden;
  box-shadow: var(--shadow-premium);
}

.promote-hero h1 {
  margin: 4px 0 8px;
  font-size: 24px;
  line-height: 1.2;
}

.promote-hero p {
  max-width: 270px;
  margin: 0;
  color: rgba(255,255,255,.78);
  font-size: 12px;
  line-height: 1.7;
}

.promote-hero .eyebrow {
  color: var(--color-gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

.promote-hero .van-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,.14);
  border: 1px solid rgba(255,255,255,.18);
  font-size: 22px;
}

.poster-card {
  padding: 14px;
  margin-bottom: 12px;
}

.poster-preview {
  background: linear-gradient(135deg, var(--color-gold), #ede1cd);
  border-radius: 16px;
  padding: 1px;
  margin-bottom: 12px;
}

.poster-inner {
  background:
    radial-gradient(circle at 50% 0%, rgba(184,138,68,.18), transparent 36%),
    #fff;
  border-radius: 15px;
  padding: 20px;
  text-align: center;
}

.poster-brand { font-size: 22px; font-weight: 800; color: var(--color-ink); }
.poster-slogan { font-size: 12px; color: var(--color-muted); margin-top: 4px; }
.poster-content { margin: 16px 0; }
.poster-name { font-size: 14px; font-weight: 700; margin: 8px 0 12px; color: var(--color-ink); }
.poster-benefits { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 12px; }
.pb-item {
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--color-surface);
  font-size: 11px;
  color: var(--color-muted);
}
.poster-qr { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.qr-box { width: 84px; height: 84px; border: 1px solid rgba(184,138,68,.45); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--color-gold); background: #fff; }
.qr-text { font-size: 12px; color: var(--color-muted); }
.poster-actions { display: flex; gap: 10px; justify-content: center; }
.outline-btn {
  color: var(--color-ink);
  border-color: rgba(21,31,46,.22);
  border-radius: 999px;
  font-weight: 700;
}
.invite-card { padding: 16px; margin-bottom: 12px; }
.invite-row { display: flex; align-items: center; justify-content: space-between; }
.invite-label { font-size: 13px; color: var(--color-muted); }
.invite-code { font-size: 18px; font-weight: 800; color: var(--color-gold); letter-spacing: 2px; }
.copy-btn {
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: var(--color-ink);
  font-weight: 700;
}
.stats-card { padding: 16px; margin-bottom: 12px; }
.card-title { font-size: 15px; font-weight: 800; margin-bottom: 12px; color: var(--color-ink); }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); margin-bottom: 16px; }
.stat-item { text-align: center; }
.stat-val { font-size: 20px; font-weight: 800; color: var(--color-ink); }
.stat-label { font-size: 11px; color: var(--color-muted); margin-top: 2px; }
.commission-stats { border-top: 1px solid var(--color-border); padding-top: 12px; }
.cs-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; color: var(--color-muted); }
.cs-row .price { color: var(--color-ink); font-weight: 800; }
.cs-row.total { font-weight: 800; border-top: 1px solid var(--color-border); margin-top: 4px; padding-top: 12px; color: var(--color-ink); }
.guide-card { padding: 16px; }
.guide-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.guide-num { width: 24px; height: 24px; border-radius: 50%; background: rgba(184,138,68,.14); color: var(--color-gold); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.guide-text { font-size: 13px; color: var(--color-text); }
</style>
