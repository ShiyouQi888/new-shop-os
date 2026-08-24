<template>
  <div class="category-page page-shell">
    <van-nav-bar title="商品分类" fixed safe-area-inset-top />

    <main class="cat-body">
      <aside class="cat-sidebar" aria-label="一级分类">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          :class="['cat-side-item', { active: activeId === cat.id }]"
          @click="activeId = cat.id"
        >
          <span class="side-icon" :class="categoryIconMeta[cat.id]?.tone || 'tone-default'">
            <van-icon :name="categoryIconMeta[cat.id]?.icon || 'apps-o'" size="17" />
          </span>
          <span>{{ cat.name }}</span>
        </button>
      </aside>

      <section class="cat-content">
        <div class="catalog-hero">
          <div>
            <span class="hero-kicker">SHOP CATALOG</span>
            <h1>{{ activeCategory?.name || '全部商品' }}</h1>
            <p>{{ activeDescription }}</p>
          </div>
          <span class="hero-icon" :class="categoryIconMeta[activeId]?.tone || 'tone-default'">
            <van-icon :name="categoryIconMeta[activeId]?.icon || 'apps-o'" size="24" />
          </span>
        </div>

        <div class="search-panel premium-card">
          <van-search v-model="keyword" placeholder="搜索商品、品牌或礼包" shape="round" @search="onSearch" />
          <div class="filter-row">
            <button
              v-for="item in sortOptions"
              :key="item.value"
              type="button"
              :class="['filter-chip', { active: sortKey === item.value }]"
              @click="sortKey = item.value"
            >
              {{ item.label }}
            </button>
          </div>
          <div class="result-meta">
            <span>{{ products.length }} 件精选商品</span>
            <span>{{ keyword ? `搜索：${keyword}` : '会员价已同步' }}</span>
          </div>
        </div>

        <div class="product-list" v-if="sortedProducts.length">
          <ProductCard v-for="p in sortedProducts" :key="p.id" :product="p" :show-member-price="true" />
        </div>
        <van-empty v-else description="暂无商品" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import { type ProductSPU, type ProductCategory } from '@shop-os/shared'
import ProductCard from '@/components/ProductCard.vue'

type SortKey = 'recommend' | 'price-asc' | 'newest'

const route = useRoute()
const categories = ref<ProductCategory[]>([])
const activeId = ref(0)
const keyword = ref('')
const sortKey = ref<SortKey>('recommend')
const products = ref<ProductSPU[]>([])
const activeCategory = computed(() => categories.value.find(c => c.id === activeId.value))
const categoryIconMeta: Record<number, { icon: string; tone: string; desc: string }> = {
  1: { icon: 'flower-o', tone: 'tone-beauty', desc: '美妆护肤、精华面膜与日常护理精选。' },
  2: { icon: 'records-o', tone: 'tone-health', desc: '健康食品与营养补充，适合会员复购。' },
  3: { icon: 'wap-home-o', tone: 'tone-home', desc: '家居生活好物，兼顾品质与实用体验。' },
  4: { icon: 'phone-o', tone: 'tone-digital', desc: '数码电器与效率设备，精选高性价比单品。' },
  5: { icon: 'gem-o', tone: 'tone-gift', desc: '代理商入会礼包，绑定权益与佣金资格。' },
}
const sortOptions: { label: string; value: SortKey }[] = [
  { label: '推荐', value: 'recommend' },
  { label: '价格', value: 'price-asc' },
  { label: '新品', value: 'newest' },
]
const activeDescription = computed(() => categoryIconMeta[activeId.value]?.desc || '浏览平台精选商品与会员权益商品。')
const sortedProducts = computed(() => {
  const list = [...products.value]
  if (sortKey.value === 'price-asc') return list.sort((a, b) => a.price - b.price)
  if (sortKey.value === 'newest') return list.sort((a, b) => b.createTime.localeCompare(a.createTime))
  return list.sort((a, b) => a.sort - b.sort)
})

const loadProducts = async () => {
  const isGiftZone = activeCategory.value?.isGiftZone
  products.value = await api.getProducts({
    categoryId: activeId.value,
    keyword: keyword.value,
    isGiftPackage: isGiftZone ? true : undefined,
  })
}

const onSearch = () => loadProducts()

watch(activeId, loadProducts)
watch(keyword, loadProducts)

onMounted(async () => {
  categories.value = await api.getCategories()
  const parentId0 = categories.value.filter(c => c.parentId === 0)
  const queryId = route.query.id ? Number(route.query.id) : parentId0[0]?.id
  activeId.value = queryId || parentId0[0]?.id || 0
  if (activeId.value) loadProducts()
  else products.value = await api.getProducts({ keyword: keyword.value })
})
</script>

<style scoped>
.category-page {
  height: 100vh;
  padding-top: 46px;
}
.cat-body {
  display: flex;
  height: calc(100vh - 46px);
}
.cat-sidebar {
  width: 98px;
  height: 100%;
  padding: 12px 8px 86px;
  background: rgba(255, 255, 255, 0.68);
  border-right: 1px solid rgba(226, 232, 240, 0.84);
  overflow-y: auto;
  flex-shrink: 0;
}
.cat-side-item {
  width: 100%;
  min-height: 62px;
  margin-bottom: 8px;
  padding: 8px 6px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: #637083;
  font-size: 12px;
  font-weight: 700;
}
.cat-side-item.active {
  background: #17202a;
  color: #fff;
  box-shadow: 0 12px 26px rgba(23, 32, 42, 0.16);
}
.side-icon,
.hero-icon {
  display: grid;
  place-items: center;
  margin: 0 auto 6px;
  border-radius: 12px;
}
.side-icon {
  width: 32px;
  height: 32px;
}
.cat-side-item.active .side-icon {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.cat-content {
  flex: 1;
  min-width: 0;
  padding: 10px 10px 92px;
  overflow-y: auto;
}
.catalog-hero {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  color: #fff;
  background:
    linear-gradient(135deg, rgba(23, 32, 42, 0.94), rgba(61, 67, 78, 0.78)),
    url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80') center/cover;
  box-shadow: 0 18px 44px rgba(23, 32, 42, 0.16);
}
.hero-kicker {
  color: #d8b06a;
  font-size: 10px;
  font-weight: 800;
}
.catalog-hero h1 {
  margin-top: 6px;
  font-size: 21px;
  line-height: 1.18;
}
.catalog-hero p {
  margin-top: 7px;
  color: rgba(255, 255, 255, 0.74);
  font-size: 12px;
  line-height: 1.45;
}
.hero-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  margin: 0;
}
.search-panel {
  padding: 4px 0 12px;
  margin: 10px 0;
}
.filter-row {
  display: flex;
  gap: 8px;
  padding: 2px 12px 10px;
}
.filter-chip {
  height: 30px;
  padding: 0 13px;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 999px;
  background: #fff;
  color: #637083;
  font-size: 12px;
  font-weight: 700;
}
.filter-chip.active {
  background: #17202a;
  color: #fff;
  border-color: #17202a;
}
.result-meta {
  display: flex;
  justify-content: space-between;
  padding: 0 14px;
  color: #7b8794;
  font-size: 12px;
}
.result-meta span:first-child {
  color: #17202a;
  font-weight: 750;
}
.product-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.tone-beauty { color: #b35c7d; background: #fff4f8; }
.tone-health { color: #38745a; background: #f1fbf5; }
.tone-home { color: #8f6f3f; background: #fff8ea; }
.tone-digital { color: #315f8f; background: #f0f7ff; }
.tone-gift { color: #b88a44; background: #fff7e8; }
.tone-default { color: #4d5967; background: #f8fafc; }
</style>
