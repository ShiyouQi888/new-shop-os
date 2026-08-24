import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

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

const seedAddresses: ShippingAddress[] = [
  { id: 1, name: '张伟', phone: '138****1111', province: '广东省', city: '深圳市', district: '南山区', detail: '科技园路1号', isDefault: true },
  { id: 2, name: '张伟', phone: '138****1111', province: '广东省', city: '深圳市', district: '福田区', detail: '中心路88号', isDefault: false },
]

export const useAddressStore = defineStore('address', () => {
  const addresses = ref<ShippingAddress[]>(seedAddresses.map(item => ({ ...item })))

  const defaultAddress = computed(() => addresses.value.find(item => item.isDefault) || addresses.value[0] || null)

  const normalizeDefault = (id: number) => {
    addresses.value.forEach(item => {
      item.isDefault = item.id === id
    })
  }

  const addAddress = (form: AddressForm) => {
    const next: ShippingAddress = {
      ...form,
      id: Date.now(),
      isDefault: form.isDefault || addresses.value.length === 0,
    }
    addresses.value.unshift(next)
    if (next.isDefault) normalizeDefault(next.id)
    return next
  }

  const updateAddress = (id: number, form: AddressForm) => {
    const index = addresses.value.findIndex(item => item.id === id)
    if (index === -1) return null
    addresses.value[index] = { ...form, id }
    if (form.isDefault) normalizeDefault(id)
    if (!addresses.value.some(item => item.isDefault) && addresses.value.length > 0) {
      addresses.value[0].isDefault = true
    }
    return addresses.value[index]
  }

  const removeAddress = (id: number) => {
    const removed = addresses.value.find(item => item.id === id)
    addresses.value = addresses.value.filter(item => item.id !== id)
    if (removed?.isDefault && addresses.value.length > 0) {
      addresses.value[0].isDefault = true
    }
  }

  const setDefault = (id: number) => {
    normalizeDefault(id)
  }

  return {
    addresses,
    defaultAddress,
    addAddress,
    updateAddress,
    removeAddress,
    setDefault,
  }
})
