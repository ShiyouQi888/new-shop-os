<template>
  <div class="redeem-page page-shell">
    <van-nav-bar title="领取商品自用" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <div class="redeem-body">
      <div class="quota-card premium-card">
        <div class="quota-label">本月剩余可兑换额度</div>
        <div class="quota-val">{{ formatMoney(remainAmount) }}</div>
      </div>

      <div class="pool-grid" v-if="pool.length">
        <div class="pool-item premium-card" v-for="p in pool" :key="p.id" @click="openRedeem(p)">
          <div class="pool-img">
            <img :src="p.mainImage" :alt="p.name" loading="lazy" />
          </div>
          <div class="pool-info">
            <div class="pool-name">{{ p.name }}</div>
            <div class="pool-price">{{ priceLabel(p) }}</div>
          </div>
        </div>
      </div>
      <van-empty v-else description="当前等级暂无可兑换的领货商品，请联系客服" />
    </div>

    <!-- 兑换确认 -->
    <van-popup v-model:show="showRedeem" position="bottom" round closeable>
      <div class="redeem-sheet" v-if="current">
        <div class="sheet-title">{{ current.name }}</div>

        <div class="sku-row" v-if="current.skus.length > 1">
          <button
            v-for="sku in current.skus"
            :key="sku.id"
            type="button"
            :class="['sku-item', { active: selectedSkuId === sku.id }]"
            :disabled="sku.stock <= 0"
            @click="selectedSkuId = sku.id"
          >
            {{ sku.skuName }}
          </button>
        </div>

        <div class="qty-row">
          <span>兑换数量</span>
          <van-stepper v-model="quantity" :min="1" :max="maxQuantity" />
        </div>

        <div class="cost-row">
          <span>预计消耗额度</span>
          <strong>{{ formatMoney(cost) }}</strong>
        </div>
        <div class="cost-hint" v-if="cost > remainAmount">剩余额度不足，最多可兑换 {{ maxQuantity }} 件</div>

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
          :loading="redeeming" :disabled="!canConfirm"
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
import { ref, computed, onMounted } from 'vue'
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

const showRedeem = ref(false)
const showAddressList = ref(false)
const redeeming = ref(false)
const current = ref<CreditPoolProduct | null>(null)
const selectedSkuId = ref(0)
const quantity = ref(1)
const selectedAddressId = ref<number | null>(null)

const currentSku = computed(() => current.value?.skus.find(s => s.id === selectedSkuId.value) || current.value?.skus[0])
const priceLabel = (p: CreditPoolProduct) => {
  const prices = p.skus.map(s => s.price)
  const min = Math.min(...prices)
  return `${formatMoney(min)} / 件`
}
const maxQuantity = computed(() => {
  if (!currentSku.value || currentSku.value.price <= 0) return 1
  return Math.max(1, Math.min(currentSku.value.stock, Math.floor(remainAmount.value / currentSku.value.price)))
})
const cost = computed(() => Math.round((currentSku.value?.price || 0) * quantity.value * 100) / 100)
const selectedAddress = computed(() => addressStore.addresses.find(a => a.id === selectedAddressId.value) || addressStore.defaultAddress)
const canConfirm = computed(() => !!currentSku.value && cost.value > 0 && cost.value <= remainAmount.value && !!selectedAddress.value)

const openRedeem = (p: CreditPoolProduct) => {
  current.value = p
  selectedSkuId.value = p.skus.find(s => s.stock > 0)?.id || p.skus[0].id
  quantity.value = 1
  showRedeem.value = true
}

const selectAddress = (id: number) => {
  selectedAddressId.value = id
  showAddressList.value = false
}

const confirmRedeem = async () => {
  if (!currentSku.value || !selectedAddress.value) return
  redeeming.value = true
  try {
    const addr = selectedAddress.value
    const result = await api.redeemCredit(creditId.value, {
      skuId: currentSku.value.id,
      quantity: quantity.value,
      receiverName: addr.name,
      receiverPhone: addr.phone,
      receiverAddress: `${addr.province}${addr.city}${addr.district}${addr.detail}`,
    })
    remainAmount.value = result.remainAmount
    showRedeem.value = false
    showSuccessToast('兑换成功，等待发货')
    setTimeout(() => router.replace('/orders'), 800)
  } catch {
    showToast('兑换失败，请稍后重试')
  } finally {
    redeeming.value = false
  }
}

onMounted(async () => {
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
.redeem-page { padding-top: 46px; min-height: 100vh; }
.redeem-body { padding: 12px 14px 24px; }
.quota-card { padding: 16px; margin-bottom: 12px; text-align: center; }
.quota-label { font-size: 13px; color: #626A73; }
.quota-val { margin-top: 6px; font-size: 24px; font-weight: 800; color: #E85222; }
.pool-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.pool-item { padding: 0; overflow: hidden; cursor: pointer; }
.pool-img { width: 100%; aspect-ratio: 1; background: #F8F9FB; }
.pool-img img { width: 100%; height: 100%; object-fit: cover; }
.pool-info { padding: 9px 10px 12px; }
.pool-name { font-size: 13px; font-weight: 650; color: #171A1F; line-height: 1.4; min-height: 36px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.pool-price { margin-top: 6px; font-size: 14px; font-weight: 800; color: #E85222; }

.redeem-sheet { padding: 20px 16px calc(18px + env(safe-area-inset-bottom)); }
.sheet-title { font-size: 16px; font-weight: 800; color: #171A1F; margin-bottom: 14px; }
.sku-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.sku-item { padding: 7px 14px; border-radius: 999px; border: 1px solid #E7E9ED; background: #F8F9FB; color: #171A1F; font-size: 13px; }
.sku-item.active { border-color: #FF6B35; background: #FFF1EB; color: #E85222; font-weight: 700; }
.sku-item:disabled { opacity: 0.4; }
.qty-row, .cost-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; font-size: 14px; color: #626A73; }
.cost-row strong { color: #E85222; font-size: 18px; }
.cost-hint { font-size: 12px; color: #E5484D; margin-top: -4px; margin-bottom: 8px; }
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
