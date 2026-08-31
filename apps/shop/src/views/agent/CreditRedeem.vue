<template>
  <div class="redeem-page page-shell">
    <van-nav-bar title="领取商品自用" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <div class="redeem-body">
      <div class="quota-card premium-card">
        <div class="quota-label">本月剩余可兑换额度</div>
        <div class="quota-val">{{ formatMoney(remainAmount) }}</div>
        <div class="mode-hint" v-if="isLumpSum">当前为一次性领取模式，需选满剩余额度后再提交</div>
        <van-button
          v-if="pool.length" class="auto-btn" block round plain
          :color="currentTheme.primary" :loading="composing" :disabled="remainAmount <= 0"
          @click="onAutoCompose"
        >一键智能选购</van-button>
      </div>

      <div class="pool-grid" v-if="pool.length">
        <div class="pool-item premium-card" v-for="p in pool" :key="p.id">
          <div class="pool-img">
            <img :src="p.mainImage" :alt="p.name" loading="lazy" />
          </div>
          <div class="pool-info">
            <div class="pool-name">{{ p.name }}</div>
            <div class="sku-pills" v-if="p.skus.length > 1">
              <button
                v-for="sku in p.skus" :key="sku.id" type="button"
                :class="['sku-pill', { active: activeSkuId(p) === sku.id }]"
                :disabled="sku.stock <= 0"
                @click="setActiveSku(p, sku.id)"
              >{{ sku.skuName }}</button>
            </div>
            <div class="pool-price">{{ formatMoney(activeSku(p)?.price || 0) }} / 件</div>
            <van-stepper
              :model-value="qtyOf(p.id)"
              @update:model-value="(v) => setQty(p, Number(v))"
              :min="0"
              :max="activeSku(p)?.stock || 0"
              integer
            />
          </div>
        </div>
      </div>
      <van-empty v-else description="当前等级暂无可兑换的领货商品，请联系客服" />
    </div>

    <!-- 底部结算栏 -->
    <div class="redeem-bar" v-if="pool.length">
      <div class="bar-info">
        <div class="bar-label">已选 {{ selectedCount }} 件</div>
        <div class="bar-value">{{ formatMoney(cartTotal) }}</div>
      </div>
      <div class="bar-hint" :class="{ danger: underFilled }" v-if="hintText">{{ hintText }}</div>
      <van-button block round :color="currentTheme.primary" :disabled="!canSubmit" @click="showConfirm = true">去结算</van-button>
    </div>

    <!-- 确认兑换 -->
    <van-popup v-model:show="showConfirm" position="bottom" round closeable>
      <div class="confirm-sheet">
        <div class="sheet-title">确认兑换</div>

        <div class="confirm-list">
          <div class="confirm-item" v-for="line in cartLines" :key="line.skuId">
            <span>{{ line.name }} × {{ line.quantity }}</span>
            <span>{{ formatMoney(line.price * line.quantity) }}</span>
          </div>
        </div>
        <div class="cost-row">
          <span>合计消耗额度</span>
          <strong>{{ formatMoney(cartTotal) }}</strong>
        </div>

        <div class="excess-block" v-if="excess > 0.004">
          <div class="excess-row">
            <span>超出额度</span>
            <strong>{{ formatMoney(excess) }}</strong>
          </div>
          <div class="wallet-toggle" :class="{ disabled: walletBalance <= 0 }" @click="walletBalance > 0 && (useWallet = !useWallet)">
            <van-checkbox :model-value="useWallet" :disabled="walletBalance <= 0" />
            <span>使用佣金余额抵扣（可用 {{ formatMoney(walletBalance) }}）</span>
          </div>
          <div class="cash-row" v-if="cashDue > 0.004">
            <span>还需现金支付</span>
            <strong>{{ formatMoney(cashDue) }}</strong>
          </div>
        </div>

        <div class="address-row" @click="showAddressList = true">
          <van-icon name="location-o" size="18" :color="currentTheme.primaryDark" />
          <div class="address-info" v-if="selectedAddress">
            <div class="addr-name">{{ selectedAddress.name }} {{ selectedAddress.phone }}</div>
            <div class="addr-detail">{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}{{ selectedAddress.detail }}</div>
          </div>
          <div v-else class="address-empty">请选择收货地址</div>
          <van-icon name="arrow" />
        </div>

        <van-button
          block round :color="currentTheme.primary" class="confirm-btn"
          :loading="redeeming" :disabled="!selectedAddress"
          @click="confirmRedeem"
        >
          确认兑换
        </van-button>
      </div>
    </van-popup>

    <!-- 收货地址选择 -->
    <van-popup v-model:show="showAddressList" position="bottom" round>
      <div class="address-popup">
        <div class="popup-title">选择收货地址</div>
        <div class="addr-list-item" v-for="addr in addressStore.addresses" :key="addr.id" @click="selectAddress(addr.id)">
          <div class="addr-name">
            {{ addr.name }} {{ addr.phone }}
            <em v-if="addr.isDefault">默认</em>
          </div>
          <div class="addr-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}</div>
        </div>
        <button class="manage-address" type="button" @click="router.push('/mine/address')">管理或新增地址</button>
      </div>
    </van-popup>

    <!-- 支付现金差价 -->
    <van-popup v-model:show="showPayment" position="bottom" round closeable>
      <div class="pay-sheet">
        <div class="sheet-title">支付差价</div>
        <div class="pay-amount">{{ formatMoney(pendingCashAmount) }}</div>
        <van-radio-group v-model="payType" direction="horizontal" class="pay-type-group">
          <van-radio name="wechat">微信支付</van-radio>
          <van-radio name="alipay">支付宝</van-radio>
        </van-radio-group>
        <van-button
          block round :color="currentTheme.primary" class="confirm-btn"
          :loading="isPaying" @click="confirmPay"
        >确认支付</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import { formatMoney, type CreditPoolProduct } from '@shop-os/shared'
import { useAddressStore } from '@/stores/address'
import { useUserStore } from '@/stores/user'
import { api } from '@/api'
import { currentTheme } from '@/utils/site'

const router = useRouter()
const addressStore = useAddressStore()
const userStore = useUserStore()

const pool = ref<CreditPoolProduct[]>([])
const remainAmount = ref(0)
const creditId = ref(0)

/** 一次性模式：必须选满剩余额度才能提交；自由模式：允许任意部分额度 */
const isLumpSum = computed(() => userStore.claimMode === 'lump_sum')

/** 每个商品当前选中的 SKU（key: spuId） */
const activeSkuIds = reactive<Record<number, number>>({})
/** 每个商品已选数量（key: spuId） */
const quantities = reactive<Record<number, number>>({})

const activeSkuId = (p: CreditPoolProduct) => activeSkuIds[p.id] ?? (p.skus.find(s => s.stock > 0)?.id || p.skus[0]?.id)
const activeSku = (p: CreditPoolProduct) => p.skus.find(s => s.id === activeSkuId(p))
const setActiveSku = (p: CreditPoolProduct, skuId: number) => {
  activeSkuIds[p.id] = skuId
  quantities[p.id] = 0
}
const qtyOf = (spuId: number) => quantities[spuId] || 0
const setQty = (p: CreditPoolProduct, v: number) => {
  const max = activeSku(p)?.stock || 0
  quantities[p.id] = Math.max(0, Math.min(v, max))
}

/** 每个 SPU 的代表 SKU：库存 > 0 中价格最低的那个（更小单价能更精细地凑近目标金额） */
const cheapestSku = (p: CreditPoolProduct) => {
  const inStock = p.skus.filter(s => s.stock > 0)
  if (!inStock.length) return null
  return inStock.reduce((min, s) => (s.price < min.price ? s : min), inStock[0])
}

const composing = ref(false)

/**
 * 一键智能选购：有界背包 DP，在不超过剩余额度的前提下让选购总价尽量接近目标。
 * 每个 SPU 只能选一个 SKU（沿用现有数据模型的约束），代表 SKU 取最低价那个。
 * 金额换算成整数「分」做 DP 避免浮点误差；分数过大时放大计算单位，防止 DP 数组过大导致卡顿。
 */
const autoCompose = () => {
  const targetCents = Math.round(remainAmount.value * 100)
  if (targetCents <= 0 || !pool.value.length) return

  const unit = Math.max(1, Math.ceil(targetCents / 300000))
  const capacity = Math.floor(targetCents / unit)

  interface KnapItem { spuId: number; skuId: number; unitCost: number; maxQty: number }
  const items: KnapItem[] = []
  for (const p of pool.value) {
    const sku = cheapestSku(p)
    if (!sku) continue
    const unitCost = Math.round((sku.price * 100) / unit)
    if (unitCost <= 0 || unitCost > capacity) continue
    const maxQty = Math.min(sku.stock, Math.floor(capacity / unitCost))
    if (maxQty <= 0) continue
    items.push({ spuId: p.id, skuId: sku.id, unitCost, maxQty })
  }

  const picks = new Map<number, { skuId: number; qty: number }>()
  if (items.length) {
    // history[i] = 只考虑前 i 个商品时，容量 0..capacity 各自能凑到的最大总价
    const history: Int32Array[] = [new Int32Array(capacity + 1)]
    for (const item of items) {
      const prev = history[history.length - 1]
      const next = prev.slice()
      // 有界背包的二进制拆分优化：把「最多买 maxQty 件」拆成若干个「买 2^k 件」的 0/1 选项
      let remaining = item.maxQty
      let chunk = 1
      while (remaining > 0) {
        const take = Math.min(chunk, remaining)
        const cost = take * item.unitCost
        for (let c = capacity; c >= cost; c--) {
          const candidate = next[c - cost] + cost
          if (candidate > next[c]) next[c] = candidate
        }
        remaining -= take
        chunk *= 2
      }
      history.push(next)
    }

    // 回溯：从最终容量倒推每个商品实际选了几件
    let c = capacity
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]
      const before = history[i]
      const after = history[i + 1]
      for (let qty = Math.min(item.maxQty, Math.floor(c / item.unitCost)); qty >= 0; qty--) {
        const cost = qty * item.unitCost
        if (before[c - cost] + cost === after[c]) {
          if (qty > 0) picks.set(item.spuId, { skuId: item.skuId, qty })
          c -= cost
          break
        }
      }
    }
  }

  for (const p of pool.value) {
    const pick = picks.get(p.id)
    if (pick) {
      activeSkuIds[p.id] = pick.skuId
      quantities[p.id] = pick.qty
    } else {
      quantities[p.id] = 0
    }
  }
}

const onAutoCompose = async () => {
  composing.value = true
  await nextTick()
  try {
    autoCompose()
  } finally {
    composing.value = false
  }
}

interface CartLine { spuId: number; skuId: number; name: string; price: number; quantity: number }

const cartLines = computed<CartLine[]>(() => {
  const lines: CartLine[] = []
  for (const p of pool.value) {
    const sku = activeSku(p)
    const quantity = qtyOf(p.id)
    if (sku && quantity > 0) lines.push({ spuId: p.id, skuId: sku.id, name: p.name, price: sku.price, quantity })
  }
  return lines
})

const selectedCount = computed(() => cartLines.value.reduce((s, l) => s + l.quantity, 0))
const cartTotal = computed(() => Math.round(cartLines.value.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100)
const diffToTarget = computed(() => Math.round((remainAmount.value - cartTotal.value) * 100) / 100)
/** 未选满一次性模式所需额度时仍然阻塞提交；超出额度不再阻塞，走额度+佣金/现金混合支付 */
const underFilled = computed(() => isLumpSum.value && diffToTarget.value > 0.004)

/** 超出额度的部分：可选用佣金钱包余额抵扣，抵扣后仍不够的部分需要现金补差价 */
const excess = computed(() => Math.max(0, Math.round((cartTotal.value - remainAmount.value) * 100) / 100))
const walletBalance = computed(() => userStore.wallet?.balance || 0)
const useWallet = ref(false)
const walletApplied = computed(() => (useWallet.value && excess.value > 0) ? Math.min(excess.value, walletBalance.value) : 0)
const cashDue = computed(() => Math.round((excess.value - walletApplied.value) * 100) / 100)

const canSubmit = computed(() => {
  if (cartLines.value.length === 0) return false
  if (isLumpSum.value) return cartTotal.value >= remainAmount.value - 0.005
  return cartTotal.value > 0
})

const hintText = computed(() => {
  if (cartLines.value.length === 0) return ''
  if (underFilled.value) return `还差 ${formatMoney(diffToTarget.value)} 未选满，需一次性选满剩余额度`
  if (excess.value > 0.004) return `超出额度 ${formatMoney(excess.value)}，下一步可用佣金或现金补齐差价`
  return ''
})

const showConfirm = ref(false)
const showAddressList = ref(false)
const redeeming = ref(false)
const selectedAddressId = ref<number | null>(null)
const selectedAddress = computed(() => addressStore.addresses.find(a => a.id === selectedAddressId.value) || addressStore.defaultAddress)

const selectAddress = (id: number) => {
  selectedAddressId.value = id
  showAddressList.value = false
}

/** 兑换后若仍有现金差价，走这个弹窗；金额/单号由 confirmRedeem 返回结果填入 */
const showPayment = ref(false)
const pendingOrderId = ref(0)
const pendingCashAmount = ref(0)
const payType = ref<'wechat' | 'alipay'>('wechat')
const isPaying = ref(false)

const confirmRedeem = async () => {
  if (!selectedAddress.value || !canSubmit.value) return
  redeeming.value = true
  try {
    const addr = selectedAddress.value
    const result = await api.redeemCredit(creditId.value, {
      items: cartLines.value.map(l => ({ skuId: l.skuId, quantity: l.quantity })),
      useWalletAmount: walletApplied.value,
      receiverName: addr.name,
      receiverPhone: addr.phone,
      receiverAddress: `${addr.province}${addr.city}${addr.district}${addr.detail}`,
    })
    remainAmount.value = result.remainAmount
    showConfirm.value = false
    if (result.cashShortfall > 0.004) {
      pendingOrderId.value = result.orderId
      pendingCashAmount.value = result.cashShortfall
      showPayment.value = true
    } else {
      showSuccessToast('兑换成功，等待发货')
      setTimeout(() => router.replace('/orders'), 800)
    }
  } catch (e) {
    showToast(e instanceof Error ? e.message : '兑换失败，请稍后重试')
  } finally {
    redeeming.value = false
  }
}

/** 支付现金差价：和 Checkout.vue 里的模拟支付走同一套 createPayment → simulatePayment 流程 */
const confirmPay = async () => {
  isPaying.value = true
  try {
    const payment = await api.createPayment({ orderId: pendingOrderId.value, payType: payType.value })
    if (!payment.mock) {
      showToast(String(payment.credential?.message || '支付单已创建，请在收银台完成支付'))
      return
    }
    await api.simulatePayment(payment.paymentNo)
    showPayment.value = false
    showSuccessToast('支付成功，兑换完成')
    setTimeout(() => router.replace('/orders'), 800)
  } catch {
    showToast('支付失败，请稍后重试')
  } finally {
    isPaying.value = false
  }
}

onMounted(async () => {
  if (!userStore.member) return
  await addressStore.load()
  selectedAddressId.value = addressStore.defaultAddress?.id ?? null
  const [credits, poolData] = await Promise.all([api.getMonthlyCredit(userStore.member.id), api.getCreditPool(), userStore.refreshMe()])
  const activeCredit = credits[0]
  if (activeCredit) {
    creditId.value = activeCredit.id
    remainAmount.value = activeCredit.remainAmount
  }
  pool.value = poolData
})
</script>

<style scoped>
.redeem-page { padding-top: 46px; min-height: 100vh; padding-bottom: 108px; }
.redeem-body { padding: 12px 14px 24px; }
.quota-card { padding: 16px; margin-bottom: 12px; text-align: center; }
.quota-label { font-size: 13px; color: var(--text-secondary); }
.quota-val { margin-top: 6px; font-size: 24px; font-weight: 800; color: var(--color-primary-dark); }
.mode-hint { margin-top: 8px; font-size: 12px; color: var(--text-placeholder); }
.auto-btn { margin-top: 12px; height: 38px; font-weight: 700; }
.pool-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.pool-item { padding: 0; overflow: hidden; }
.pool-img { width: 100%; aspect-ratio: 1; background: var(--bg-muted); }
.pool-img img { width: 100%; height: 100%; object-fit: cover; }
.pool-info { padding: 9px 10px 12px; }
.pool-name { font-size: 13px; font-weight: 650; color: var(--text-primary); line-height: 1.4; min-height: 36px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.sku-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.sku-pill { padding: 3px 9px; border-radius: 999px; border: 1px solid var(--border-color); background: var(--bg-muted); color: var(--text-primary); font-size: 11px; }
.sku-pill.active { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary-dark); font-weight: 700; }
.sku-pill:disabled { opacity: 0.4; }
.pool-price { margin-top: 6px; font-size: 14px; font-weight: 800; color: var(--color-primary-dark); }
.pool-info :deep(.van-stepper) { margin-top: 8px; }

.redeem-bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(14px + env(safe-area-inset-bottom));
  width: min(406px, calc(100vw - 24px));
  padding: 12px 14px calc(10px + env(safe-area-inset-bottom)) 14px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-card);
  box-shadow: 0 14px 34px rgba(17, 24, 39, 0.13);
}
.bar-info { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.bar-label { font-size: 13px; color: var(--text-secondary); }
.bar-value { font-size: 18px; font-weight: 800; color: var(--text-primary); }
.bar-value.danger { color: #E5484D; }
.bar-hint { font-size: 12px; color: #F5A623; margin-bottom: 8px; }
.bar-hint.danger { color: #E5484D; }

.confirm-sheet { padding: 20px 16px calc(18px + env(safe-area-inset-bottom)); }
.sheet-title { font-size: 16px; font-weight: 800; color: var(--text-primary); margin-bottom: 14px; }
.confirm-list { max-height: 30vh; overflow-y: auto; }
.confirm-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: var(--text-secondary); }
.cost-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; margin-top: 4px; border-top: 1px solid var(--border-color); font-size: 14px; color: var(--text-secondary); }
.cost-row strong { color: var(--color-primary-dark); font-size: 18px; }
.excess-block { padding: 12px; margin-bottom: 12px; border-radius: 12px; background: var(--bg-muted); }
.excess-row, .cash-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-secondary); }
.excess-row strong, .cash-row strong { color: #F5A623; font-size: 15px; }
.cash-row { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); }
.wallet-toggle { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 13px; color: var(--text-primary); }
.wallet-toggle.disabled { color: var(--text-placeholder); }
.address-row { display: flex; align-items: center; gap: 10px; padding: 12px; margin: 6px 0 16px; border-radius: 12px; background: var(--bg-muted); }
.address-info { flex: 1; min-width: 0; }
.addr-name { color: var(--text-primary); font-size: 14px; font-weight: 700; }
.addr-detail { margin-top: 3px; color: var(--text-secondary); font-size: 12px; line-height: 1.4; }
.address-empty { flex: 1; color: var(--text-secondary); font-size: 13px; }
.confirm-btn { height: 46px; font-weight: 700; }

.address-popup { padding: 16px; }
.popup-title { font-size: 16px; font-weight: 800; margin-bottom: 12px; text-align: center; }
.addr-list-item { padding: 12px 0; border-bottom: 1px solid var(--border-color); }
.addr-list-item .addr-name { display: flex; align-items: center; gap: 8px; }
.addr-list-item em { padding: 2px 7px; border-radius: 999px; background: var(--color-primary-light); color: var(--color-primary-dark); font-style: normal; font-size: 11px; font-weight: 700; }
.manage-address { width: 100%; height: 40px; margin-top: 12px; border: 1px solid rgba(23,32,42,.14); border-radius: 999px; background: var(--bg-card); color: var(--text-primary); font-weight: 800; }

.pay-sheet { padding: 20px 16px calc(18px + env(safe-area-inset-bottom)); }
.pay-amount { margin: 16px 0; text-align: center; font-size: 26px; font-weight: 800; color: var(--color-primary-dark); }
.pay-type-group { display: flex; justify-content: center; gap: 24px; margin-bottom: 18px; }
</style>
