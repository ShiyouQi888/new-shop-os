<template>
  <article
    class="product-card"
    role="link"
    tabindex="0"
    :aria-label="`查看商品：${product.name}`"
    @click="onClick"
    @keydown.enter="onClick"
  >
    <div class="product-img">
      <img :src="product.mainImage" :alt="product.name" loading="lazy" />
      <span v-if="product.isGiftPackage" class="product-tag tag-gift">入会礼包</span>
      <span v-else-if="product.isMonthlyProduct" class="product-tag tag-monthly">月度领货</span>
      <span class="quality-mark"><van-icon name="shield-o" /> 严选</span>
    </div>
    <div class="product-info">
      <div class="product-brand">{{ product.brand }}</div>
      <div class="product-name">{{ product.name }}</div>
      <div class="product-price">
        <template v-if="showMemberPrice && memberPrice < salePrice">
          <div class="price-now price">{{ formatMoney(memberPrice) }}</div>
          <div class="price-old">{{ formatMoney(salePrice) }}</div>
        </template>
        <template v-else>
          <div class="price-now price">{{ formatMoney(salePrice) }}</div>
          <div v-if="memberPrice < salePrice && memberPrice > 0" class="member-tag">会员价 {{ formatMoney(memberPrice) }}</div>
        </template>
      </div>
      <div v-if="showReferencePrice" class="reference-price">参考原价 {{ formatMoney(referenceOriginalPrice) }}</div>
      <div class="product-assurance">
        <span>正品保障</span>
        <span>安心售后</span>
      </div>
    </div>
  </article>
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

const salePrice = computed(() => Number(props.product.price ?? props.product.minPrice ?? 0))
const referenceOriginalPrice = computed(() => Number(props.product.originalPrice ?? props.product.minOriginalPrice ?? 0))
const showReferencePrice = computed(() => referenceOriginalPrice.value > salePrice.value)

const memberPrice = computed(() => {
  if (props.product.excludeDiscount) return salePrice.value
  if (userStore.level === MemberLevel.Normal) return salePrice.value
  return calcDiscountPrice(salePrice.value, userStore.shopDiscount)
})

const onClick = () => {
  router.push(`/product/${props.product.id}`)
}
</script>

<style scoped>
.product-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 3px 12px rgba(17, 24, 39, 0.045);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.product-card:active {
  transform: scale(0.985);
}
.product-img {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--bg-muted);
}
.quality-mark {
  position: absolute;
  right: 7px;
  bottom: 7px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 6px;
  color: #fff;
  background: rgba(23, 26, 31, 0.72);
  backdrop-filter: blur(6px);
  font-size: 9px;
  font-weight: 700;
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
.tag-gift { background: rgba(23, 32, 42, 0.9); color: var(--color-primary-border); }
.tag-monthly { background: rgba(247, 239, 226, 0.94); color: var(--color-primary-dark); }
.product-info {
  padding: 9px 9px 10px;
}
.product-name {
  margin-top: 3px;
  min-height: 38px;
  font-size: 13px;
  line-height: 1.42;
  color: var(--text-primary);
  font-weight: 650;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.product-brand {
  font-size: 11px;
  color: var(--color-primary-dark);
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
  color: var(--text-placeholder);
  text-decoration: line-through;
}
.member-tag {
  font-size: 10px;
  color: var(--color-primary-dark);
  background: var(--color-primary-light);
  padding: 2px 5px;
  border-radius: 999px;
  white-space: nowrap;
}
.reference-price {
  margin-top: 4px;
  font-size: 10px;
  line-height: 1.3;
  color: var(--text-placeholder);
}
.product-assurance {
  display: flex;
  gap: 6px;
  margin-top: 7px;
  padding-top: 7px;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 9px;
}
.product-assurance span::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 3px;
  margin: 0 4px 2px 0;
  border-radius: 50%;
  background: var(--color-primary);
}
</style>
