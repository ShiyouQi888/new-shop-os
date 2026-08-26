import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { type ProductSKU, calcDiscountPrice } from '@shop-os/shared'
import { api } from '@/api'
import { useUserStore } from './user'

export interface CartItem {
  skuId: number
  spuId: number
  skuName: string
  mainImage: string
  price: number
  memberPrice: number
  quantity: number
  selected: boolean
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const totalCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const selectedItems = computed(() => items.value.filter(i => i.selected))
  const totalPrice = computed(() => selectedItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0))
  const memberTotalPrice = computed(() => selectedItems.value.reduce((sum, item) => sum + item.memberPrice * item.quantity, 0))
  const discountAmount = computed(() => totalPrice.value - memberTotalPrice.value)

  /** 从后端加载购物车（联查实时价格 + 会员折扣） */
  const load = async () => {
    const userStore = useUserStore()
    try {
      const list = await api.getCart()
      items.value = list.map(c => ({
        skuId: c.skuId,
        spuId: c.spuId,
        skuName: c.skuName || c.spuName,
        mainImage: c.mainImage,
        price: Number(c.price),
        memberPrice: calcDiscountPrice(Number(c.price), userStore.shopDiscount),
        quantity: Number(c.quantity),
        selected: Number(c.selected) === 1,
      }))
    } catch {
      /* 未登录或网络异常时清空 */
      items.value = []
    }
  }

  const addItem = async (sku: ProductSKU, spuName: string, mainImage: string, quantity = 1) => {
    await api.addToCart({ skuId: sku.id, quantity })
    await load()
  }

  const removeItem = async (skuId: number) => {
    await api.removeCartItem(skuId)
    await load()
  }

  const toggleSelect = async (skuId: number) => {
    const item = items.value.find(i => i.skuId === skuId)
    if (!item) return
    item.selected = !item.selected
    await api.updateCartItem(skuId, { selected: item.selected })
  }

  const toggleSelectAll = async (val: boolean) => {
    items.value.forEach(i => i.selected = val)
    await api.setCartSelectAll(val)
  }

  const updateQuantity = async (skuId: number, qty: number) => {
    const item = items.value.find(i => i.skuId === skuId)
    if (!item) return
    item.quantity = Math.max(1, qty)
    await api.updateCartItem(skuId, { quantity: item.quantity })
  }

  const clearSelected = async () => {
    const ids = items.value.filter(i => i.selected).map(i => i.skuId)
    for (const skuId of ids) await api.removeCartItem(skuId)
    await load()
  }

  const selectOnly = async (skuId: number) => {
    if (!items.value.some(i => i.skuId === skuId)) await load()
    await api.setCartSelectAll(false)
    items.value.forEach(i => i.selected = i.skuId === skuId)
    await api.updateCartItem(skuId, { selected: true })
    await load()
  }

  return { items, totalCount, selectedItems, totalPrice, memberTotalPrice, discountAmount, load,
    addItem, removeItem, toggleSelect, toggleSelectAll, updateQuantity, clearSelected, selectOnly }
})
