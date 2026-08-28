<template>
  <div class="redeem-page page-shell">
    <van-nav-bar title="领取商品自用" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <div class="redeem-body">
      <div class="quota-card premium-card">
        <div class="quota-label">本月剩余可兑换额度</div>
        <div class="quota-val">{{ formatMoney(remainAmount) }}</div>
        <div class="mode-hint" v-if="isLumpSum">当前为一次性领取模式，需选满剩余额度后再提交</div>
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
        <div class="bar-value" :class="{ danger: overBudget }">{{ formatMoney(cartTotal) }}</div>
      </div>
      <div class="bar-hint" :class="{ danger: overBudget }" v-if="hintText">{{ hintText }}</div>
      <van-button block round color="#FF6B35" :disabled="!canSubmit" @click="showConfirm = true">去结算</van-button>
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

        <div class="address-row" @click="showAddressList = true">
          <van-icon name="location-o" size="18" color="#E85222" />
          <div class="address-info" v-if="selectedAddress">
            <div class="addr-name">{{ selectedAddress.name }} {{ selectedAddress.phone }}</div>
            <div class="addr-detail">{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}{{ selectedAddress.detail }}</div>
          </div>
          <div v-else class="address-empty">请选择收货地址</div>
          <van-icon name="arrow" />
        </div>

        <van-button
          block round color="#FF6B35" class="confirm-btn"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import { formatMoney, type CreditPoolProduct } from '@shop-os/shared'
import { useAddressStore } from '@/stores/address'
import { useUserStore } from '@/stores/user'
import { api } from '@/api'

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
const overBudget = computed(() => diffToTarget.value < -0.004)

const canSubmit = computed(() => {
  if (cartLines.value.length === 0) return false
  if (isLumpSum.value) return Math.abs(diffToTarget.value) < 0.005
  return cartTotal.value > 0 && !overBudget.value
})

const hintText = computed(() => {
  if (cartLines.value.length === 0) return ''
  if (overBudget.value) return `已超出额度 ${formatMoney(-diffToTarget.value)}，请减少选购数量`
  if (isLumpSum.value && diffToTarget.value > 0.004) return `还差 ${formatMoney(diffToTarget.value)} 未选满，需一次性选满剩余额度`
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

const confirmRedeem = async () => {
  if (!selectedAddress.value || !canSubmit.value) return
  redeeming.value = true
  try {
    const addr = selectedAddress.value
    const result = await api.redeemCredit(creditId.value, {
      items: cartLines.value.map(l => ({ skuId: l.skuId, quantity: l.quantity })),
      receiverName: addr.name,
      receiverPhone: addr.phone,
      receiverAddress: `${addr.province}${addr.city}${addr.district}${addr.detail}`,
    })
    remainAmount.value = result.remainAmount
    showConfirm.value = false
    showSuccessToast('兑换成功，等待发货')
    setTimeout(() => router.replace('/orders'), 800)
  } catch (e) {
    showToast(e instanceof Error ? e.message : '兑换失败，请稍后重试')
  } finally {
    redeeming.value = false
  }
}

onMounted(async () => {
  if (!userStore.member) return
  await addressStore.load()
  selectedAddressId.value = addressStore.defaultAddress?.id ?? null
  const [credits, poolData] = await Promise.all([api.getMonthlyCredit(userStore.member.id), api.getCreditPool()])
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
.quota-label { font-size: 13px; color: #626A73; }
.quota-val { margin-top: 6px; font-size: 24px; font-weight: 800; color: #E85222; }
.mode-hint { margin-top: 8px; font-size: 12px; color: #9AA1AA; }
.pool-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.pool-item { padding: 0; overflow: hidden; }
.pool-img { width: 100%; aspect-ratio: 1; background: #F8F9FB; }
.pool-img img { width: 100%; height: 100%; object-fit: cover; }
.pool-info { padding: 9px 10px 12px; }
.pool-name { font-size: 13px; font-weight: 650; color: #171A1F; line-height: 1.4; min-height: 36px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.sku-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.sku-pill { padding: 3px 9px; border-radius: 999px; border: 1px solid #E7E9ED; background: #F8F9FB; color: #171A1F; font-size: 11px; }
.sku-pill.active { border-color: #FF6B35; background: #FFF1EB; color: #E85222; font-weight: 700; }
.sku-pill:disabled { opacity: 0.4; }
.pool-price { margin-top: 6px; font-size: 14px; font-weight: 800; color: #E85222; }
.pool-info :deep(.van-stepper) { margin-top: 8px; }

.redeem-bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(14px + env(safe-area-inset-bottom));
  width: min(406px, calc(100vw - 24px));
  padding: 12px 14px calc(10px + env(safe-area-inset-bottom)) 14px;
  border: 1px solid rgba(231, 233, 237, 0.9);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(17, 24, 39, 0.13);
}
.bar-info { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.bar-label { font-size: 13px; color: #626A73; }
.bar-value { font-size: 18px; font-weight: 800; color: #171A1F; }
.bar-value.danger { color: #E5484D; }
.bar-hint { font-size: 12px; color: #F5A623; margin-bottom: 8px; }
.bar-hint.danger { color: #E5484D; }

.confirm-sheet { padding: 20px 16px calc(18px + env(safe-area-inset-bottom)); }
.sheet-title { font-size: 16px; font-weight: 800; color: #171A1F; margin-bottom: 14px; }
.confirm-list { max-height: 30vh; overflow-y: auto; }
.confirm-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #626A73; }
.cost-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; margin-top: 4px; border-top: 1px solid #E7E9ED; font-size: 14px; color: #626A73; }
.cost-row strong { color: #E85222; font-size: 18px; }
.address-row { display: flex; align-items: center; gap: 10px; padding: 12px; margin: 6px 0 16px; border-radius: 12px; background: #F8F9FB; }
.address-info { flex: 1; min-width: 0; }
.addr-name { color: #171A1F; font-size: 14px; font-weight: 700; }
.addr-detail { margin-top: 3px; color: #626A73; font-size: 12px; line-height: 1.4; }
.address-empty { flex: 1; color: #626A73; font-size: 13px; }
.confirm-btn { height: 46px; font-weight: 700; }

.address-popup { padding: 16px; }
.popup-title { font-size: 16px; font-weight: 800; margin-bottom: 12px; text-align: center; }
.addr-list-item { padding: 12px 0; border-bottom: 1px solid #E7E9ED; }
.addr-list-item .addr-name { display: flex; align-items: center; gap: 8px; }
.addr-list-item em { padding: 2px 7px; border-radius: 999px; background: #FFF1EB; color: #E85222; font-style: normal; font-size: 11px; font-weight: 700; }
.manage-address { width: 100%; height: 40px; margin-top: 12px; border: 1px solid rgba(23,32,42,.14); border-radius: 999px; background: #fff; color: #171A1F; font-weight: 800; }
</style>
