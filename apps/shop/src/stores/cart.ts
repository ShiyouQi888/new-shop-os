import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockSkus, type ProductSKU, calcDiscountPrice } from '@shop-os/shared'
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
  const items = ref<CartItem[]>([
    { skuId: 3, spuId: 3, skuName: '焕颜精华套装-标准装', mainImage: 'https://picsum.photos/seed/p3/200/200', price: 399, memberPrice: 319.2, quantity: 1, selected: true },
    { skuId: 7, spuId: 5, skuName: '丝绸眼罩-藏青', mainImage: 'https://picsum.photos/seed/p5/200/200', price: 89, memberPrice: 71.2, quantity: 2, selected: true },
  ])

  const totalCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const selectedItems = computed(() => items.value.filter(i => i.selected))
  const totalPrice = computed(() => selectedItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0))
  const memberTotalPrice = computed(() => selectedItems.value.reduce((sum, item) => sum + item.memberPrice * item.quantity, 0))
  const discountAmount = computed(() => totalPrice.value - memberTotalPrice.value)

  const addItem = (sku: ProductSKU, spuName: string, mainImage: string, quantity = 1) => {
    const existing = items.value.find(i => i.skuId === sku.id)
    if (existing) {
      existing.quantity += quantity
      existing.selected = true
    } else {
      const userStore = useUserStore()
      items.value.push({
        skuId: sku.id,
        spuId: sku.spuId,
        skuName: spuName,
        mainImage,
        price: sku.price,
        memberPrice: calcDiscountPrice(sku.price, userStore.shopDiscount),
        quantity,
        selected: true,
      })
    }
  }

  const removeItem = (skuId: number) => {
    items.value = items.value.filter(i => i.skuId !== skuId)
  }

  const toggleSelect = (skuId: number) => {
    const item = items.value.find(i => i.skuId === skuId)
    if (item) item.selected = !item.selected
  }

  const toggleSelectAll = (val: boolean) => {
    items.value.forEach(i => i.selected = val)
  }

  const updateQuantity = (skuId: number, qty: number) => {
    const item = items.value.find(i => i.skuId === skuId)
    if (item) item.quantity = Math.max(1, qty)
  }

  const clearSelected = () => {
    items.value = items.value.filter(i => !i.selected)
  }

  const selectOnly = (skuId: number) => {
    items.value.forEach(i => {
      i.selected = i.skuId === skuId
    })
  }

  return { items, totalCount, selectedItems, totalPrice, memberTotalPrice, discountAmount,
    addItem, removeItem, toggleSelect, toggleSelectAll, updateQuantity, clearSelected, selectOnly }
})
