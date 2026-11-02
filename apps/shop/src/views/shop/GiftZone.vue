<template>
  <div class="gift-page page-shell">
    <van-nav-bar title="入会专区" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="gift-body">
      <section class="intro-banner">
        <span>AGENT MEMBERSHIP</span>
        <h1>选择适合你的会员方案</h1>
        <p>一次入会，获得长期购物权益与推广资格。</p>
        <div class="intro-assurance">
          <span><van-icon name="shield-o" /> 权益透明</span>
          <span><van-icon name="passed" /> 即时生效</span>
          <span><van-icon name="service-o" /> 专属服务</span>
        </div>
      </section>

      <section class="package-card premium-card" v-for="pkg in packages" :key="pkg.id">
        <div class="package-header">
          <div>
            <span class="package-level"><i></i>{{ pkg.levelName }}</span>
            <div class="package-name">{{ pkg.name }}</div>
            <div class="package-subtitle">含实物礼包与会员专属权益</div>
          </div>
          <div class="package-price"><small>入会价</small><span class="price-lg">{{ formatMoney(pkg.price) }}</span></div>
        </div>
        <div class="package-benefits" v-if="pkg.items && pkg.items.length">
          <div class="benefit-item" v-for="item in pkg.items" :key="item.id">
            <van-icon name="success" />
            <span>{{ item.skuName }} × {{ item.quantity }}</span>
          </div>
        </div>
        <div class="package-rights">
          <div class="right-item"><div class="right-value">{{ discountOf(pkg) }}</div><div class="right-label">商城折扣</div></div>
          <div class="right-item"><div class="right-value">{{ creditOf(pkg) }}</div><div class="right-label">月度领货</div></div>
          <div class="right-item"><div class="right-value">{{ monthsOf(pkg) }}</div><div class="right-label">领货周期</div></div>
          <div class="right-item"><div class="right-value">{{ commissionText(pkg.level) }}</div><div class="right-label">分享佣金</div></div>
        </div>
        <van-button class="join-button" block :color="currentTheme.primary" icon="gem-o" @click="buyPackage(pkg)">选择此方案</van-button>
      </section>

      <section class="compare-card premium-card">
        <div class="section-heading">
          <div><span>BENEFIT MATRIX</span><h2>会员权益对比</h2></div>
          <van-icon name="chart-trending-o" />
        </div>
        <table class="compare-table">
          <thead>
            <tr>
              <th>权益</th>
              <th>普通</th>
              <th v-for="lv in levels" :key="lv.level">{{ lv.levelName }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in compareRows" :key="row.label">
              <td>{{ row.label }}</td>
              <td>{{ row.normal }}</td>
              <td v-for="lv in levels" :key="lv.level">{{ cellOf(lv, row.key) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <van-popup v-model:show="showPayment" position="bottom" round closeable>
      <div class="pay-popup">
        <div class="popup-title">支付入会礼包</div>
        <div class="pay-package">{{ selectedPackage?.name }}</div>
        <div class="pay-summary">
          <span>应付金额</span>
          <strong>{{ formatMoney(selectedPackage?.price || 0) }}</strong>
        </div>
        <van-radio-group v-model="payType" direction="horizontal" class="pay-methods">
          <van-radio name="wechat">微信支付</van-radio>
          <van-radio name="alipay">支付宝</van-radio>
        </van-radio-group>
        <van-button block round :color="currentTheme.primary" :loading="isPaying" loading-text="权益开通中..." @click="confirmPackagePay">确认支付并开通</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { api } from '@/api'
import { formatMoney, type GiftPackage } from '@shop-os/shared'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { currentTheme } from '@/utils/site'

interface LevelRow {
  level: number
  levelName: string
  levelSort: number
  entryAmount: number
  shopDiscount: number
  monthlyCredit: number
  creditMonths: number
}

interface CommissionRow {
  id: number
  packageLevel: number
  distributionLevel: number
  rate: number
}

const router = useRouter()
const orderStore = useOrderStore()
const userStore = useUserStore()
const packages = ref<GiftPackage[]>([])
const levels = ref<LevelRow[]>([])
const commissionRules = ref<CommissionRow[]>([])
const showPayment = ref(false)
const isPaying = ref(false)
const selectedPackage = ref<GiftPackage | null>(null)
const payType = ref<'wechat' | 'alipay'>('wechat')

/** 某等级礼包的佣金文本：如 10/3/1% */
const commissionText = (level: number) => {
  const rules = commissionRules.value
    .filter((r) => r.packageLevel === level)
    .sort((a, b) => a.distributionLevel - b.distributionLevel)
  if (!rules.length) return '-'
  return `${rules.map((r) => r.rate).join('/')}%`
}

const discountOf = (pkg: GiftPackage) => {
  const lv = levels.value.find((l) => l.level === pkg.level)
  return lv ? `${lv.shopDiscount / 10}折` : '10折'
}

const creditOf = (pkg: GiftPackage) => {
  const lv = levels.value.find((l) => l.level === pkg.level)
  return lv ? formatMoney(lv.monthlyCredit, 0) : '-'
}

const monthsOf = (pkg: GiftPackage) => {
  const lv = levels.value.find((l) => l.level === pkg.level)
  return lv ? `${lv.creditMonths}个月` : '-'
}

/** 对比表行：normal 为普通会员列，key 对应等级单元格取值 */
const compareRows = computed(() => [
  { label: '入门条件', key: 'entry', normal: '免费注册' },
  { label: '商城折扣', key: 'discount', normal: '原价' },
  { label: '月度领货', key: 'credit', normal: '-' },
  { label: '领货周期', key: 'months', normal: '-' },
  { label: '转卖资格', key: 'resell', normal: '-' },
  { label: '分享佣金', key: 'commission', normal: '-' },
])

const cellOf = (lv: LevelRow, key: string) => {
  switch (key) {
    case 'entry': return formatMoney(lv.entryAmount, 0)
    case 'discount': return `${lv.shopDiscount / 10}折`
    case 'credit': return `${formatMoney(lv.monthlyCredit, 0)}/月`
    case 'months': return `${lv.creditMonths}个月`
    case 'resell': return '可用'
    case 'commission': return commissionText(lv.level)
    default: return ''
  }
}

const buyPackage = (pkg: GiftPackage) => {
  const lv = levels.value.find((l) => l.level === pkg.level)
  showConfirmDialog({
    title: '确认入会',
    message: `购买「${pkg.name}」，支付 ${formatMoney(pkg.price)}，成为${lv ? lv.levelName : '代理商'}代理商？`,
  }).then(() => {
    selectedPackage.value = pkg
    showPayment.value = true
  }).catch(() => {})
}

const confirmPackagePay = async () => {
  if (!selectedPackage.value) return
  isPaying.value = true
  try {
    const order = await orderStore.createGiftPackageOrder(selectedPackage.value!, payType.value)
    const payment = await api.createPayment({ orderId: order.id, payType: payType.value })
    if (!payment.mock) {
      showToast(String(payment.credential?.message || '支付单已创建，请在收银台完成支付'))
      return
    }
    await api.simulatePayment(payment.paymentNo)
    // 会员等级与首月权益由后端在支付事务中自动开通；客户端只刷新展示态，避免支付成功后前端补调失败。
    await userStore.refreshMe()
    showPayment.value = false
    showSuccessToast('支付成功，代理商权益已开通，礼包进入待发货')
    setTimeout(() => router.push('/agent'), 800)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '支付失败，请稍后重试')
  } finally {
    isPaying.value = false
  }
}

onMounted(async () => {
  const [home, lvList, rules] = await Promise.all([
    api.getHomeData(),
    api.getLevels(),
    api.getCommissionRules(),
  ])
  packages.value = home.giftPackages
  levels.value = lvList
  commissionRules.value = rules
})
</script>

<style scoped>
.gift-page { min-height: 100vh; padding-top: 46px; }
.gift-body { padding: 10px 12px 24px; }
.intro-banner { padding: 20px 18px 16px; border-radius: 16px; color: #fff; background: linear-gradient(135deg, #171A1F, #2D3540); box-shadow: 0 14px 32px rgba(23,32,42,.14); margin-bottom: 10px; }
.intro-banner span, .package-level { color: var(--color-primary); font-size: 11px; font-weight: 800; }
.intro-banner h1 { margin-top: 7px; font-size: 23px; line-height: 1.2; }
.intro-banner p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.intro-assurance { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 16px; padding-top: 13px; border-top: 1px solid rgba(255,255,255,.12); }
.intro-assurance span { display: flex; align-items: center; gap: 4px; color: rgba(255,255,255,.78); font-size: 10px; font-weight: 600; }
.intro-assurance .van-icon { color: var(--color-primary); font-size: 13px; }
.package-card { padding: 15px; margin-bottom: 10px; border-width: 1px; }
.package-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.package-level { display: inline-flex; align-items: center; gap: 5px; padding: 4px 7px; border-radius: 6px; background: var(--color-primary-light); }
.package-level i { width: 5px; height: 5px; border-radius: 50%; background: var(--color-primary); }
.package-name { margin-top: 5px; color: var(--text-primary); font-size: 18px; font-weight: 800; }
.package-subtitle { margin-top: 4px; color: var(--text-secondary); font-size: 11px; }
.package-price { display: grid; justify-items: end; flex-shrink: 0; }
.package-price small { margin-bottom: 3px; color: var(--text-placeholder); font-size: 10px; }
.package-benefits { display: grid; gap: 8px; margin-bottom: 14px; }
.benefit-item { display: flex; align-items: center; gap: 7px; color: var(--text-secondary); font-size: 13px; }
.benefit-item .van-icon { color: var(--color-primary); }
.package-rights { display: grid; grid-template-columns: repeat(4, 1fr); margin-bottom: 14px; padding: 12px 4px; background: var(--bg-muted); border-radius: 10px; }
.right-item { text-align: center; border-right: 1px solid var(--border-color); }
.right-item:last-child { border-right: 0; }
.right-value { color: var(--text-primary); font-size: 14px; font-weight: 800; }
.right-label { margin-top: 3px; color: var(--text-secondary); font-size: 11px; }
.join-button { height: 42px; border-radius: 8px; font-weight: 800; }
.compare-card { padding: 15px; margin-bottom: 10px; overflow-x: auto; }
.section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-heading span { color: var(--color-primary-dark); font-size: 9px; font-weight: 800; }
.section-heading h2 { margin-top: 3px; color: var(--text-primary); font-size: 16px; }
.section-heading > .van-icon { color: var(--color-primary); font-size: 22px; }
.compare-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.compare-table th { padding: 10px 7px; background: var(--bg-muted); color: var(--text-secondary); font-weight: 800; white-space: nowrap; }
.compare-table td { padding: 9px 6px; text-align: center; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); }
.compare-table td:first-child, .compare-table th:first-child { position: sticky; left: 0; z-index: 1; text-align: left; color: var(--text-primary); font-weight: 800; background: var(--bg-card); }
.pay-popup { padding: 20px 16px 18px; }
.popup-title { color: var(--text-primary); font-size: 17px; font-weight: 800; text-align: center; }
.pay-package { margin-top: 6px; color: var(--text-secondary); font-size: 12px; text-align: center; }
.pay-summary { display: flex; justify-content: space-between; align-items: center; padding: 14px; margin: 16px 0 12px; border-radius: 14px; background: var(--bg-muted); color: var(--text-secondary); }
.pay-summary strong { color: var(--text-primary); font-size: 23px; }
.pay-methods { margin-bottom: 16px; }
</style>
