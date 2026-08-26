<template>
  <div class="promote-page page-shell">
    <van-nav-bar title="推广中心" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <main class="promote-body">
    <div v-if="!enabled" class="promote-disabled premium-card">
      <van-icon name="closed-eye" />
      <div>
        <strong>分享推广功能已暂停</strong>
        <p>平台暂未开放分享推广，佣金与邀请功能暂不可用。</p>
      </div>
    </div>

    <section class="promote-hero">
      <div>
        <p class="eyebrow">PRIVATE GROWTH</p>
        <h1>专属推广资产</h1>
        <p>统一的邀请码、海报与佣金路径，适合社群、私域和线下客户场景。</p>
      </div>
      <van-icon name="share-o" />
    </section>

    <div class="poster-card premium-card">
      <!-- 后台配置的海报（固定或随机千人千面）：已叠加专属二维码，点击查看大图 -->
      <div class="poster-preview" v-if="currentPoster">
        <van-image
          :src="composedPosterUrl || currentPoster.image"
          fit="contain"
          class="poster-img"
          :alt="currentPoster.title"
          :preview-src-list="[composedPosterUrl || currentPoster.image]"
          preview-teleported
        />
        <div class="poster-mode-tip" v-if="posterTitle">{{ posterTitle }}</div>
      </div>
      <!-- 无海报配置时的默认模拟海报 -->
      <div class="poster-preview" v-else>
        <div class="poster-inner" @click="savePoster">
          <div class="poster-top">
            <img class="poster-brand-logo" src="/logo-dark.png" alt="橙选" />
            <div class="poster-slogan">加入代理商 开启分享之路</div>
          </div>
          <div class="poster-content">
            <van-image round width="60" height="60" :src="userStore.member.avatar" />
            <div class="poster-name">{{ userStore.member.nickname }} 邀请你加入</div>
            <div class="poster-benefits">
              <div class="pb-item">大礼包入会</div>
              <div class="pb-item">月度领货权益</div>
              <div class="pb-item">分享佣金</div>
              <div class="pb-item">站内转卖变现</div>
            </div>
          </div>
          <div class="poster-qr">
            <div class="qr-box" v-if="qrDataUrl">
              <img :src="qrDataUrl" alt="推广二维码" class="qr-img" />
            </div>
            <div class="qr-box" v-else>
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
          <div class="stat-val">{{ promoteStats.directCount }}</div>
          <div class="stat-label">直属下级</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">{{ promoteStats.teamCount }}</div>
          <div class="stat-label">团队人数</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">{{ promoteStats.orderCount }}</div>
          <div class="stat-label">成交订单</div>
        </div>
        <div class="stat-item">
          <div class="stat-val price">{{ formatMoney(promoteStats.commissionTotal, 0) }}</div>
          <div class="stat-label">累计佣金</div>
        </div>
      </div>
      <div class="commission-stats">
        <div class="cs-row">
          <span>一级佣金</span>
          <span class="price">{{ formatMoney(levelCommission(1)) }}</span>
        </div>
        <div class="cs-row">
          <span>二级佣金</span>
          <span class="price">{{ formatMoney(levelCommission(2)) }}</span>
        </div>
        <div class="cs-row">
          <span>三级佣金</span>
          <span class="price">{{ formatMoney(levelCommission(3)) }}</span>
        </div>
      </div>
    </div>

    <div class="guide-card premium-card">
      <div class="card-title">推广新手指南</div>
      <div class="guide-item" v-for="(g, i) in guideList" :key="g.id" @click="router.push('/mine/help')">
        <div class="guide-num">{{ i + 1 }}</div>
        <div class="guide-text">{{ g.title }}</div>
      </div>
      <div class="guide-empty" v-if="!guideList.length">暂无推广指南</div>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import { generateQRSvgDataUrl } from '@/utils/qrcode'
import { useUserStore } from '@/stores/user'
import { api } from '@/api'
import { BASE_URL } from '@/api/http'

const router = useRouter()
const userStore = useUserStore()
const enabled = ref(true)

/** 后端服务源（用于把 /uploads 相对路径补全为可跨域加载的绝对地址） */
const API_ORIGIN = BASE_URL.replace(/\/api\/v1\/?$/, '')
const resolveImage = (url: string) => {
  if (!url || /^(https?:|data:|blob:)/.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? url : '/' + url}`
}
type PosterLayout = { qrX: number; qrY: number; qrSize: number }
type PromotePoster = { id: number; title: string; image: string } & PosterLayout

const defaultPosterLayout: PosterLayout = { qrX: 38, qrY: 72, qrSize: 24 }
const normalizePoster = (poster: PromotePoster): PromotePoster => ({
  ...poster,
  qrX: Number.isFinite(Number(poster.qrX)) ? Number(poster.qrX) : defaultPosterLayout.qrX,
  qrY: Number.isFinite(Number(poster.qrY)) ? Number(poster.qrY) : defaultPosterLayout.qrY,
  qrSize: Number.isFinite(Number(poster.qrSize)) ? Number(poster.qrSize) : defaultPosterLayout.qrSize,
})

/** 当前展示的海报：固定优先，否则随机（千人千面） */
const currentPoster = ref<PromotePoster | null>(null)
const posterTitle = ref('')
/** 推广链接二维码（dataURL，携带邀请码） */
const qrDataUrl = ref('')
/** 合成后的海报图（底图 + 后台配置位置的专属二维码） */
const composedPosterUrl = ref('')

/** 推广链接域名（来自后端站点配置 site.domain） */
const domain = ref('')
/** 推广链接（动态拼接，携带邀请码） */
const link = computed(() => `${domain.value || 'http://localhost:5174'}/r/${userStore.member.inviteCode}`)

/** 推广数据统计（来自后端真实数据） */
const promoteStats = ref<{ directCount: number; teamCount: number; orderCount: number; commissionTotal: number }>({
  directCount: 0, teamCount: 0, orderCount: 0, commissionTotal: 0,
})
/** 推广新手指南（来自后端帮助文档） */
const guideList = ref<Array<{ id: number; title: string }>>([])

/** 当前会员的真实佣金（按分享层级汇总，数据来自后端） */
const commissions = ref<Array<{ distributionLevel: number; amount: number }>>([])

const levelCommission = (level: number) => {
  return commissions.value
    .filter(c => c.distributionLevel === level)
    .reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)
}

/** 生成推广二维码 SVG（内容为带邀请码的推广链接，无 canvas 依赖） */
const generateQR = () => {
  try {
    qrDataUrl.value = generateQRSvgDataUrl(link.value)
  } catch {
    qrDataUrl.value = ''
  }
}

/** 将专属二维码叠加到后台配置位置，返回合成图 dataURL */
const composePoster = (poster: PromotePoster): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = img.naturalWidth || 750
      const h = img.naturalHeight || 1000
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas unsupported'))
      ctx.drawImage(img, 0, 0, w, h)
      const layout = normalizePoster(poster)
      // 二维码位置来自后台配置，白底衬垫保证可扫
      const qrSize = Math.round(w * Math.min(0.6, Math.max(0.08, layout.qrSize / 100)))
      const pad = Math.round(qrSize * 0.16)
      const qrX = Math.round(Math.min(w - qrSize - pad, Math.max(pad, w * (layout.qrX / 100))))
      const qrY = Math.round(Math.min(h - qrSize - pad, Math.max(pad, h * (layout.qrY / 100))))
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2)
      const qrImg = new Image()
      qrImg.onload = () => {
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
        resolve(canvas.toDataURL('image/png'))
      }
      qrImg.onerror = () => reject(new Error('qr load failed'))
      qrImg.src = qrDataUrl.value
    }
    img.onerror = () => reject(new Error('poster load failed'))
    img.src = poster.image.startsWith('http') ? poster.image : `${location.origin}${poster.image}`
  })
}

/** 从后端加载海报：固定一张 → 固定展示；否则随机抽取一张（千人千面），并叠加专属二维码 */
const loadPoster = async () => {
  try {
    const data = await api.getPosters()
    let picked: PromotePoster | null = null
    if (data.fixed) {
      picked = normalizePoster({ ...data.fixed, image: resolveImage(data.fixed.image) })
      posterTitle.value = `固定海报${data.fixed.title ? '·' + data.fixed.title : ''}`
    } else if (data.randomList.length) {
      const idx = Math.floor(Math.random() * data.randomList.length)
      picked = data.randomList[idx]
      picked = normalizePoster({ ...picked, image: resolveImage(picked.image) })
      posterTitle.value = picked.title ? `随机海报·${picked.title}` : '随机海报'
    }
    if (picked) {
      currentPoster.value = picked
      // 叠加专属二维码；失败则回退原图
      try {
        composedPosterUrl.value = qrDataUrl.value ? await composePoster(picked) : picked.image
      } catch {
        composedPosterUrl.value = picked.image
      }
      return
    }
    currentPoster.value = null
    composedPosterUrl.value = ''
    posterTitle.value = ''
  } catch {
    currentPoster.value = null
    composedPosterUrl.value = ''
    posterTitle.value = ''
  }
}

onMounted(async () => {
  try {
    const dist = await api.getDistributionConfig()
    enabled.value = dist.enabled
  } catch { /* 默认开启 */ }
  // 加载推广配置（站点域名）→ 生成二维码 → 加载海报（合成需要二维码）
  try {
    const cfg = await api.getPromoteConfig()
    domain.value = cfg.domain || ''
  } catch { /* 域名兜底 localhost */ }
  generateQR()
  await loadPoster()
  // 推广数据统计（真实数据）
  try {
    promoteStats.value = await api.getPromoteStats()
  } catch { /* 保持 0 */ }
  // 推广新手指南（来自帮助文档）
  try {
    const helps = await api.getHelpList()
    guideList.value = helps.filter(h => h.category === 'promote').map(h => ({ id: h.id, title: h.title }))
  } catch { /* 保持空 */ }
  try {
    commissions.value = await api.getCommissions(userStore.member.id)
  } catch {
    /* 未登录或网络异常时保持空 */
  }
})

const copyLink = () => {
  navigator.clipboard.writeText(link.value)
  showSuccessToast('链接已复制')
}
const copyCode = () => {
  navigator.clipboard.writeText(userStore.member.inviteCode)
  showSuccessToast('邀请码已复制')
}

/** 保存海报：有后台海报图则下载原图；默认海报则下载当前展示内容（二维码已内嵌） */
const savePoster = () => {
  if (!enabled.value) return
  try {
    if (currentPoster.value?.image) {
      // 下载已叠加二维码的合成海报
      const a = document.createElement('a')
      a.href = composedPosterUrl.value || currentPoster.value.image
      a.download = `海报-${currentPoster.value.title || '推广'}.png`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } else {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 560
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas unsupported')
      // 背景
      const bg = ctx.createLinearGradient(0, 0, 0, 560)
      bg.addColorStop(0, '#FFF1EB')
      bg.addColorStop(1, '#FFD5C5')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, 400, 560)
      // 品牌区
      ctx.fillStyle = '#171A1F'
      ctx.fillRect(0, 0, 400, 140)
      ctx.fillStyle = '#FF6B35'
      ctx.font = 'bold 34px sans-serif'
      ctx.fillText('橙选', 28, 62)
      ctx.fillStyle = 'rgba(255,255,255,.62)'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('CHENGXUAN', 30, 84)
      ctx.fillStyle = 'rgba(255,255,255,.85)'
      ctx.font = '18px sans-serif'
      ctx.fillText('加入代理商 开启分享之路', 28, 100)
      // 二维码
      const img = new Image()
      img.onload = () => {
        const size = 200
        const x = (400 - size) / 2
        ctx.fillStyle = '#fff'
        ctx.fillRect(x, 170, size, size)
        ctx.drawImage(img, x, 170, size, size)
        ctx.fillStyle = '#171A1F'
        ctx.font = 'bold 20px sans-serif'
        ctx.fillText(`${userStore.member.nickname} 邀请你加入`, 28, 420)
        ctx.fillStyle = '#E85222'
        ctx.font = '14px sans-serif'
        ctx.fillText(`邀请码 ${userStore.member.inviteCode}`, 28, 460)
        ctx.fillStyle = '#626A73'
        ctx.font = '13px sans-serif'
        ctx.fillText('扫码注册，大礼包入会 · 月度领货 · 分享佣金', 28, 500)
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = `推广海报-${userStore.member.nickname}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
      img.onerror = () => showSuccessToast('海报生成失败，请重试')
      img.src = qrDataUrl.value
      return
    }
    showSuccessToast('海报已保存')
  } catch {
    showSuccessToast('海报生成失败，请重试')
  }
}
</script>

<style scoped>
.promote-page {
  padding-top: 46px;
  padding-bottom: 24px;
}
.promote-disabled {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 14px 0;
  padding: 16px;
  border-color: rgba(255, 107, 53, 0.3);
  background: #FFF1EB;
}
.promote-disabled .van-icon {
  color: #F5A623;
  font-size: 26px;
}
.promote-disabled strong {
  color: #E85222;
  font-size: 14px;
}
.promote-disabled p {
  margin-top: 4px;
  color: #626A73;
  font-size: 12px;
  line-height: 1.5;
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
  background: linear-gradient(135deg, var(--color-gold), #FFF1EB);
  border-radius: 16px;
  padding: 1px;
  margin-bottom: 12px;
}

.poster-img {
  width: 100%;
  max-height: 460px;
  border-radius: 15px;
  display: block;
  margin: 0 auto;
  background: #fff;
  cursor: pointer;
}
.poster-mode-tip {
  padding: 8px 12px;
  font-size: 12px;
  color: #E85222;
  text-align: center;
}

.poster-inner {
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 107, 53,.18), transparent 36%),
    #fff;
  border-radius: 15px;
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 420px;
  cursor: pointer;
}
.poster-inner:active {
  opacity: 0.85;
}

.poster-brand-logo {
  width: 142px;
  height: 54px;
  object-fit: contain;
  display: inline-block;
}
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
.qr-box { width: 84px; height: 84px; border: 1px solid rgba(255, 107, 53,.45); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--color-gold); background: #fff; }
.qr-img { width: 72px; height: 72px; display: block; }
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
.guide-num { width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 107, 53,.14); color: var(--color-gold); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.guide-text { font-size: 13px; color: var(--color-text); }
.guide-empty { padding: 12px 0; font-size: 13px; color: var(--color-muted); text-align: center; }
</style>
