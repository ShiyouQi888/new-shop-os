<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="收货地址" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <main class="mine-sub-body">
      <section class="sub-hero">
        <span>ADDRESS BOOK</span>
        <h1>收货地址</h1>
        <p>管理常用收货地址，结算时可快速选择。</p>
      </section>

      <section class="address-card" v-for="item in addressStore.addresses" :key="item.id">
        <div class="address-top">
          <div>
            <strong>{{ item.name }}</strong>
            <span>{{ item.phone }}</span>
          </div>
          <em v-if="item.isDefault">默认</em>
        </div>
        <p>{{ formatAddress(item) }}</p>
        <div class="address-actions">
          <button type="button" :class="{ active: item.isDefault }" @click="setDefault(item.id)">
            <van-icon name="passed" />
            <span>{{ item.isDefault ? '默认地址' : '设为默认' }}</span>
          </button>
          <button type="button" @click="openEdit(item)">
            <van-icon name="edit" />
            <span>编辑</span>
          </button>
          <button type="button" class="danger" @click="removeAddress(item.id)">
            <van-icon name="delete-o" />
            <span>删除</span>
          </button>
        </div>
      </section>

      <van-empty v-if="!addressStore.addresses.length" description="暂无收货地址" />
      <van-button block round type="primary" class="primary-action" icon="plus" @click="openCreate">新增收货地址</van-button>
    </main>

    <van-popup v-model:show="showEditor" position="bottom" round closeable>
      <div class="address-editor">
        <div class="popup-title">{{ editingId ? '编辑地址' : '新增地址' }}</div>
        <van-form @submit="saveAddress">
          <van-field
            v-model="form.name"
            name="name"
            label="收货人"
            placeholder="请输入收货人姓名"
            :rules="[{ required: true, message: '请输入收货人姓名' }]"
          />
          <van-field
            v-model="form.phone"
            name="phone"
            label="手机号"
            placeholder="请输入手机号"
            :rules="[{ required: true, message: '请输入手机号' }]"
          />
          <van-field
            :model-value="regionText"
            name="region"
            label="所在地区"
            placeholder="请选择省 / 市 / 区县"
            readonly
            is-link
            :rules="[{ validator: validateRegion, message: '请选择所在地区' }]"
            @click="openRegionPicker"
          />
          <van-field
            v-model="form.detail"
            name="detail"
            label="详细地址"
            type="textarea"
            rows="2"
            autosize
            placeholder="街道、门牌号等"
            :rules="[{ required: true, message: '请输入详细地址' }]"
          />
          <van-cell title="设为默认地址">
            <template #right-icon>
              <van-switch v-model="form.isDefault" size="22" />
            </template>
          </van-cell>
          <van-button block round type="primary" native-type="submit" class="save-button">保存地址</van-button>
        </van-form>
      </div>
    </van-popup>

    <van-popup v-model:show="showRegionPicker" position="bottom" round>
      <van-area
        v-model="activeAreaCode"
        title="选择省市区"
        :area-list="areaList"
        @confirm="onRegionConfirm"
        @cancel="showRegionPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { areaList } from '@vant/area-data'
import { useAddressStore, type AddressForm, type ShippingAddress } from '@/stores/address'

const router = useRouter()
const addressStore = useAddressStore()
const showEditor = ref(false)
const showRegionPicker = ref(false)
const editingId = ref<number | null>(null)
const activeAreaCode = ref('')
const emptyForm = (): AddressForm => ({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: addressStore.addresses.length === 0,
})
const form = reactive<AddressForm>(emptyForm())

onMounted(() => { addressStore.load() })

const fillForm = (next: AddressForm) => {
  Object.assign(form, next)
}

const formatAddress = (item: ShippingAddress) => `${item.province}${item.city}${item.district}${item.detail}`
const regionText = computed(() => {
  if (!form.province || !form.city || !form.district) return ''
  return `${form.province} / ${form.city} / ${form.district}`
})

const validateRegion = () => Boolean(form.province && form.city && form.district)

const openRegionPicker = () => {
  activeAreaCode.value = findAreaCodeByNames(form.province, form.city, form.district)
  showRegionPicker.value = true
}

const findAreaCodeByNames = (province: string, city: string, district: string) => {
  if (!province || !city || !district) return ''
  const provinceCode = Object.entries(areaList.province_list).find(([, name]) => name === province)?.[0]
  const cityCode = Object.entries(areaList.city_list).find(([code, name]) => code.startsWith(provinceCode?.slice(0, 2) || '') && name === city)?.[0]
  const districtCode = Object.entries(areaList.county_list).find(([code, name]) => code.startsWith(cityCode?.slice(0, 4) || '') && name === district)?.[0]
  return districtCode || ''
}

const onRegionConfirm = ({ selectedOptions }: { selectedOptions: Array<{ text: string; value: string }> }) => {
  const [province, city, district] = selectedOptions
  form.province = province?.text || ''
  form.city = city?.text || ''
  form.district = district?.text || ''
  activeAreaCode.value = district?.value || ''
  showRegionPicker.value = false
}

const openCreate = () => {
  editingId.value = null
  fillForm(emptyForm())
  showEditor.value = true
}

const openEdit = (item: ShippingAddress) => {
  editingId.value = item.id
  fillForm({
    name: item.name,
    phone: item.phone,
    province: item.province,
    city: item.city,
    district: item.district,
    detail: item.detail,
    isDefault: item.isDefault,
  })
  showEditor.value = true
}

const saveAddress = async () => {
  if (editingId.value) {
    await addressStore.updateAddress(editingId.value, { ...form })
    showSuccessToast('地址已更新')
  } else {
    await addressStore.addAddress({ ...form })
    showSuccessToast('地址已新增')
  }
  showEditor.value = false
}

const setDefault = async (id: number) => {
  await addressStore.setDefault(id)
  showSuccessToast('默认地址已更新')
}

const removeAddress = (id: number) => {
  if (addressStore.addresses.length <= 1) {
    showToast('至少保留一个收货地址')
    return
  }
  showConfirmDialog({
    title: '删除地址',
    message: '确认删除该收货地址？',
  }).then(async () => {
    await addressStore.removeAddress(id)
    showSuccessToast('地址已删除')
  }).catch(() => {})
}
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 28px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #171A1F, #171A1F); box-shadow: 0 18px 44px rgba(23, 32, 42, 0.16); }
.sub-hero span { color: var(--color-primary); font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.address-card { margin-top: 12px; padding: 16px; border: 1px solid var(--border-color); border-radius: 14px; background: var(--bg-card); box-shadow: 0 8px 24px rgba(17,24,39,.06); }
.address-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.address-top div { display: flex; align-items: center; gap: 8px; min-width: 0; }
.address-top strong { color: var(--text-primary); font-size: 16px; }
.address-top span { color: var(--text-secondary); font-size: 13px; }
.address-top em { padding: 3px 8px; border-radius: 999px; background: var(--color-primary-light); color: var(--color-primary-dark); font-style: normal; font-size: 11px; font-weight: 700; }
.address-card p { margin-top: 8px; color: var(--text-secondary); line-height: 1.55; }
.address-actions { display: flex; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.address-actions button { flex: 1; height: 34px; border: 1px solid var(--border-color); border-radius: 999px; background: var(--bg-card); color: var(--text-secondary); display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 700; }
.address-actions button.active { color: var(--color-primary-dark); background: var(--color-primary-light); border-color: rgba(var(--color-primary-rgb),.22); }
.address-actions button.danger { color: #E5484D; }
.primary-action { margin-top: 16px; height: 44px; font-weight: 800; }
.address-editor { padding: 20px 16px 18px; }
.popup-title { color: var(--text-primary); font-size: 17px; font-weight: 800; text-align: center; margin-bottom: 12px; }
.save-button { margin-top: 16px; height: 44px; font-weight: 800; }
</style>
