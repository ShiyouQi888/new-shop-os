<template>
  <div class="product-card" @click="onClick">
    <div class="product-img">
      <img :src="product.mainImage" :alt="product.name" loading="lazy" />
      <span v-if="product.isGiftPackage" class="product-tag tag-gift">入会礼包</span>
      <span v-else-if="product.isMonthlyProduct" class="product-tag tag-monthly">月度领货</span>
    </div>
    <div class="product-info">
      <div class="product-brand">{{ product.brand }}</div>
      <div class="product-name">{{ product.name }}</div>
      <div class="product-price">
        <template v-if="showMemberPrice && memberPrice < product.price">
          <div class="price-now price">{{ formatMoney(memberPrice) }}</div>
          <div class="price-old">¥{{ product.price }}</div>
        </template>
        <template v-else>
          <div class="price-now price">{{ formatMoney(product.price) }}</div>
          <div v-if="memberPrice < product.price && memberPrice > 0" class="member-tag">会员价 ¥{{ memberPrice }}</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { type ProductSPU, formatMoney, calcDiscountPrice, MemberLevel } from '@shop-os/shared'
import { useUserStore } from '@/stores/user'

const props = withDefaults(defineProps<{
  product: ProductSPU
  showMemberPrice?: boolean
}>(), {
  showMemberPrice: false,
})

const router = useRouter()
const userStore = useUserStore()

// 假设最低SKU价格
const memberPrice = computed(() => {
  if (props.product.excludeDiscount) return props.product.price
  if (userStore.level === MemberLevel.Normal) return props.product.price
  return calcDiscountPrice(props.product.price, userStore.shopDiscount)
})

const onClick = () => {
  router.push(`/product/${props.product.id}`)
}
</script>

<style scoped>
.product-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(231, 233, 237, 0.78);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 22px rgba(17, 24, 39, 0.052);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.product-card:active {
  transform: scale(0.985);
}
.product-img {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 0.92;
  overflow: hidden;
  background: #F8F9FB;
}
.product-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.24s ease;
}
.product-card:active .product-img img {
  transform: scale(1.03);
}
.product-tag {
  position: absolute;
  top: 7px;
  left: 7px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}
.tag-gift { background: rgba(23, 32, 42, 0.9); color: #FFF1EB; }
.tag-monthly { background: rgba(247, 239, 226, 0.94); color: #E85222; }
.product-info {
  padding: 9px 9px 10px;
}
.product-name {
  margin-top: 3px;
  min-height: 38px;
  font-size: 13px;
  line-height: 1.42;
  color: #171A1F;
  font-weight: 650;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.product-brand {
  font-size: 11px;
  color: #E85222;
  font-weight: 700;
}
.product-price {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 5px;
}
.price-now {
  font-size: 15px;
  font-weight: 800;
}
.price-old {
  font-size: 10px;
  color: #9AA1AA;
  text-decoration: line-through;
}
.member-tag {
  font-size: 10px;
  color: #E85222;
  background: #FFF1EB;
  padding: 2px 5px;
  border-radius: 999px;
  white-space: nowrap;
}
</style>
