<template>
  <div class="gift-page page-shell">
    <van-nav-bar title="入会专区" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="gift-body">
      <section class="intro-banner">
        <span>AGENT MEMBERSHIP</span>
        <h1>成为代理商，开启长期权益</h1>
        <p>购买大礼包入会，获得月度领货、会员折扣、转卖变现与三级佣金资格。</p>
      </section>

      <section class="package-card premium-card" v-for="pkg in packages" :key="pkg.id" :class="pkg.level === 2 ? 'gold-package' : 'silver-package'">
        <div class="package-header">
          <div>
            <span class="package-level">{{ pkg.level === 2 ? 'GOLD PLAN' : 'SILVER PLAN' }}</span>
            <div class="package-name">{{ pkg.name }}</div>
          </div>
          <div class="package-price"><span class="price-lg">{{ formatMoney(pkg.price) }}</span></div>
        </div>
        <div class="package-benefits">
          <div class="benefit-item" v-for="item in pkg.items" :key="item.id">
            <van-icon name="success" />
            <span>{{ item.skuName }} × {{ item.quantity }}</span>
          </div>
        </div>
        <div class="package-rights">
          <div class="right-item"><div class="right-value">{{ pkg.level === 2 ? 8 : 9 }}折</div><div class="right-label">商城折扣</div></div>
          <div class="right-item"><div class="right-value">¥{{ pkg.level === 2 ? 980 : 580 }}</div><div class="right-label">月度领货</div></div>
          <div class="right-item"><div class="right-value">10个月</div><div class="right-label">领货周期</div></div>
          <div class="right-item"><div class="right-value">{{ pkg.level === 2 ? '15/5/2%' : '10/3/1%' }}</div><div class="right-label">三级佣金</div></div>
        </div>
        <van-button block round color="#17202a" @click="buyPackage(pkg)">立即购买入会</van-button>
      </section>

      <section class="compare-card premium-card">
        <div class="compare-title">会员等级权益对比</div>
        <table class="compare-table">
          <thead><tr><th>权益</th><th>普通</th><th>银卡</th><th>金卡</th></tr></thead>
          <tbody>
            <tr v-for="row in compareRows" :key="row.label">
              <td>{{ row.label }}</td><td>{{ row.normal }}</td><td>{{ row.silver }}</td><td>{{ row.gold }}</td>
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
        <van-button block round color="#17202a" :loading="isPaying" loading-text="权益开通中..." @click="confirmPackagePay">确认支付并开通</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast } from 'vant'
import { api } from '@/api'
import { formatMoney, type GiftPackage } from '@shop-os/shared'
import { useOrderStore } from '@/stores/orders'

const router = useRouter()
const orderStore = useOrderStore()
const packages = ref<GiftPackage[]>([])
const showPayment = ref(false)
const isPaying = ref(false)
const selectedPackage = ref<GiftPackage | null>(null)
const payType = ref<'wechat' | 'alipay'>('wechat')
const compareRows = [
  { label: '入门条件', normal: '免费注册', silver: '¥5,800', gold: '¥9,800' },
  { label: '商城折扣', normal: '原价', silver: '9折', gold: '8折' },
  { label: '月度领货', normal: '-', silver: '¥580/月', gold: '¥980/月' },
  { label: '领货周期', normal: '-', silver: '10个月', gold: '10个月' },
  { label: '转卖资格', normal: '-', silver: '可用', gold: '可用' },
  { label: '佣金规则', normal: '-', silver: '10/3/1%', gold: '15/5/2%' },
]

const buyPackage = (pkg: GiftPackage) => {
  showConfirmDialog({
    title: '确认入会',
    message: `购买「${pkg.name}」，支付 ${formatMoney(pkg.price)}，成为${pkg.level === 2 ? '金卡' : '银卡'}代理商？`,
  }).then(() => {
    selectedPackage.value = pkg
    showPayment.value = true
  }).catch(() => {})
}

const confirmPackagePay = () => {
  if (!selectedPackage.value) return
  isPaying.value = true
  setTimeout(() => {
    orderStore.createGiftPackageOrder(selectedPackage.value!, payType.value)
    isPaying.value = false
    showPayment.value = false
    showSuccessToast('支付成功，代理商权益已开通')
    setTimeout(() => router.push('/agent'), 800)
  }, 800)
}

onMounted(async () => {
  const data = await api.getHomeData()
  packages.value = data.giftPackages
})
</script>

<style scoped>
.gift-page { min-height: 100vh; padding-top: 46px; }
.gift-body { padding: 12px 14px 24px; }
.intro-banner { padding: 24px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #17202a, #343d49); box-shadow: 0 18px 44px rgba(23,32,42,.16); margin-bottom: 12px; }
.intro-banner span, .package-level { color: #d8b06a; font-size: 11px; font-weight: 800; }
.intro-banner h1 { margin-top: 8px; font-size: 25px; line-height: 1.2; }
.intro-banner p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.package-card { padding: 16px; margin-bottom: 12px; border-width: 1px; }
.gold-package { background: linear-gradient(180deg, #fffaf1 0%, #fff 34%); border-color: rgba(184,138,68,.28); }
.silver-package { border-color: rgba(141,150,163,.28); }
.package-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.package-name { margin-top: 5px; color: #17202a; font-size: 18px; font-weight: 800; }
.package-benefits { display: grid; gap: 8px; margin-bottom: 14px; }
.benefit-item { display: flex; align-items: center; gap: 7px; color: #4d5967; font-size: 13px; }
.benefit-item .van-icon { color: #b88a44; }
.package-rights { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; padding: 12px; background: #f3f5f7; border-radius: 12px; }
.right-item { text-align: center; }
.right-value { color: #17202a; font-size: 14px; font-weight: 800; }
.right-label { margin-top: 3px; color: #7b8794; font-size: 11px; }
.compare-card { padding: 16px; margin-bottom: 12px; overflow-x: auto; }
.compare-title { color: #17202a; font-size: 16px; font-weight: 800; margin-bottom: 12px; }
.compare-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.compare-table th { padding: 9px 6px; background: #f3f5f7; color: #637083; font-weight: 800; }
.compare-table td { padding: 9px 6px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #4d5967; }
.compare-table td:first-child { text-align: left; color: #17202a; font-weight: 800; }
.pay-popup { padding: 20px 16px 18px; }
.popup-title { color: #17202a; font-size: 17px; font-weight: 800; text-align: center; }
.pay-package { margin-top: 6px; color: #7b8794; font-size: 12px; text-align: center; }
.pay-summary { display: flex; justify-content: space-between; align-items: center; padding: 14px; margin: 16px 0 12px; border-radius: 14px; background: #f3f5f7; color: #637083; }
.pay-summary strong { color: #17202a; font-size: 23px; }
.pay-methods { margin-bottom: 16px; }
</style>
