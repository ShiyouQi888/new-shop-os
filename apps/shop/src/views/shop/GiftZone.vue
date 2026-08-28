<template>
  <div class="gift-page page-shell">
    <van-nav-bar title="入会专区" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="gift-body">
      <section class="intro-banner">
        <span>AGENT MEMBERSHIP</span>
        <h1>成为代理商，开启长期权益</h1>
        <p>购买大礼包入会，获得月度领货、会员折扣、转卖变现与分享佣金资格。</p>
      </section>

      <section class="package-card premium-card" v-for="pkg in packages" :key="pkg.id">
        <div class="package-header">
          <div>
            <span class="package-level">{{ pkg.levelName }}</span>
            <div class="package-name">{{ pkg.name }}</div>
          </div>
          <div class="package-price"><span class="price-lg">{{ formatMoney(pkg.price) }}</span></div>
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
        <van-button block round :color="currentTheme.primary" @click="buyPackage(pkg)">立即购买入会</van-button>
      </section>

      <section class="compare-card premium-card">
        <div class="compare-title">会员等级权益对比</div>
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
    // 支付成功后才开通对应等级权益
    await userStore.upgradeToAgent(selectedPackage.value.level)
    showPayment.value = false
    showSuccessToast('支付成功，代理商权益已开通')
    setTimeout(() => router.push('/agent'), 800)
  } catch {
    showToast('支付失败，请稍后重试')
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
.gift-body { padding: 12px 14px 24px; }
.intro-banner { padding: 24px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #171A1F, #171A1F); box-shadow: 0 18px 44px rgba(23,32,42,.16); margin-bottom: 12px; }
.intro-banner span, .package-level { color: var(--color-primary); font-size: 11px; font-weight: 800; }
.intro-banner h1 { margin-top: 8px; font-size: 25px; line-height: 1.2; }
.intro-banner p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.package-card { padding: 16px; margin-bottom: 12px; border-width: 1px; }
.package-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.package-name { margin-top: 5px; color: #171A1F; font-size: 18px; font-weight: 800; }
.package-benefits { display: grid; gap: 8px; margin-bottom: 14px; }
.benefit-item { display: flex; align-items: center; gap: 7px; color: #626A73; font-size: 13px; }
.benefit-item .van-icon { color: var(--color-primary); }
.package-rights { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; padding: 12px; background: #F8F9FB; border-radius: 12px; }
.right-item { text-align: center; }
.right-value { color: #171A1F; font-size: 14px; font-weight: 800; }
.right-label { margin-top: 3px; color: #626A73; font-size: 11px; }
.compare-card { padding: 16px; margin-bottom: 12px; overflow-x: auto; }
.compare-title { color: #171A1F; font-size: 16px; font-weight: 800; margin-bottom: 12px; }
.compare-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.compare-table th { padding: 9px 6px; background: #F8F9FB; color: #626A73; font-weight: 800; }
.compare-table td { padding: 9px 6px; text-align: center; border-bottom: 1px solid #E7E9ED; color: #626A73; }
.compare-table td:first-child { text-align: left; color: #171A1F; font-weight: 800; }
.pay-popup { padding: 20px 16px 18px; }
.popup-title { color: #171A1F; font-size: 17px; font-weight: 800; text-align: center; }
.pay-package { margin-top: 6px; color: #626A73; font-size: 12px; text-align: center; }
.pay-summary { display: flex; justify-content: space-between; align-items: center; padding: 14px; margin: 16px 0 12px; border-radius: 14px; background: #F8F9FB; color: #626A73; }
.pay-summary strong { color: #171A1F; font-size: 23px; }
.pay-methods { margin-bottom: 16px; }
</style>
