import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api'

export interface ShippingAddress {
  id: number
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
}

export type AddressForm = Omit<ShippingAddress, 'id'>

export const useAddressStore = defineStore('address', () => {
  const addresses = ref<ShippingAddress[]>([])

  const defaultAddress = computed(() => addresses.value.find(item => item.isDefault) || addresses.value[0] || null)

  /** 从后端加载 */
  const load = async () => {
    try {
      const list = await api.getAddresses()
      addresses.value = list.map(item => ({
        id: item.id, name: item.name, phone: item.phone,
        province: item.province, city: item.city, district: item.district,
        detail: item.detail, isDefault: Number(item.isDefault) === 1,
      }))
    } catch {
      /* 网络异常保留现状 */
    }
  }

  const addAddress = async (form: AddressForm) => {
    const next = { ...form, isDefault: form.isDefault || addresses.value.length === 0 }
    await api.addAddress(next)
    await load()
    return next
  }

  const updateAddress = async (id: number, form: AddressForm) => {
    await api.updateAddress(id, form)
    await load()
  }

  const setDefault = async (id: number) => {
    await api.setDefaultAddress(id)
    await load()
  }

  const removeAddress = async (id: number) => {
    await api.removeAddress(id)
    await load()
  }

  return {
    addresses,
    defaultAddress,
    load,
    addAddress,
    updateAddress,
    removeAddress,
    setDefault,
  }
})
