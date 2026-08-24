<template>
  <div class="home-page page-shell">
    <van-nav-bar title="Shop-OS 精品商城" fixed safe-area-inset-top />

    <main class="home-body">
      <van-swipe class="banner-swipe hero-swipe" :autoplay="3600" indicator-color="#b88a44">
        <van-swipe-item>
          <section class="hero-panel">
            <div class="hero-copy">
              <div class="premium-pill">MEMBER CURATED</div>
              <h1>精选商品与代理权益的一体化商城</h1>
              <p>会员价、月度领货、入会礼包与三级佣金路径统一管理。</p>
            </div>
            <button class="hero-cta" type="button" @click="router.push('/gift-zone')">
              <span>查看入会方案</span>
              <van-icon name="arrow" />
            </button>
          </section>
        </van-swipe-item>
        <template v-if="data">
          <van-swipe-item v-for="(banner, idx) in data.banners" :key="idx" @click="banner.link && router.push(banner.link)">
            <img :src="banner.image" class="banner-img" alt="商城精选活动" />
          </van-swipe-item>
        </template>
      </van-swipe>

      <button class="search-bar" type="button" @click="router.push('/category')">
        <van-icon name="search" size="17" />
        <span>搜索商品、品牌或礼包</span>
      </button>

      <section class="category-nav premium-card" v-if="data" aria-label="商品分类">
        <button class="category-item" type="button" v-for="cat in data.categories" :key="cat.id" @click="goCategory(cat.id)">
          <span class="cat-icon" :class="categoryIconMeta[cat.id]?.tone || 'tone-default'">
            <van-icon :name="categoryIconMeta[cat.id]?.icon || 'apps-o'" size="22" />
          </span>
          <span class="cat-name">{{ cat.name }}</span>
        </button>
      </section>

      <section class="gift-zone-entry" @click="router.push('/gift-zone')">
        <div>
          <div class="gift-kicker">代理商准入</div>
          <div class="gift-title">购买大礼包，开启专属权益</div>
          <div class="gift-desc">月度领货额度、会员购物折扣、团队佣金统一生效。</div>
        </div>
        <van-icon name="gem-o" size="28" color="#b88a44" />
      </section>

      <section class="section" v-if="data">
        <div class="section-header">
          <span class="premium-section-title">爆款推荐</span>
          <button type="button" class="section-more" @click="router.push('/category')">查看全部</button>
        </div>
        <div class="product-grid">
          <ProductCard v-for="p in data.hotProducts" :key="p.id" :product="p" :show-member-price="true" />
        </div>
      </section>

      <section class="section" v-if="data">
        <div class="section-header">
          <span class="premium-section-title">新品上架</span>
        </div>
        <div class="product-grid">
          <ProductCard v-for="p in data.newProducts" :key="p.id" :product="p" :show-member-price="true" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import ProductCard from '@/components/ProductCard.vue'

const router = useRouter()
const data = ref<Awaited<ReturnType<typeof api.getHomeData>> | null>(null)
const categoryIconMeta: Record<number, { icon: string; tone: string }> = {
  1: { icon: 'flower-o', tone: 'tone-beauty' },
  2: { icon: 'records-o', tone: 'tone-health' },
  3: { icon: 'wap-home-o', tone: 'tone-home' },
  4: { icon: 'phone-o', tone: 'tone-digital' },
  5: { icon: 'gem-o', tone: 'tone-gift' },
}

const goCategory = (categoryId: number) => {
  router.push({ path: '/category', query: { id: categoryId } })
}

onMounted(async () => {
  data.value = await api.getHomeData()
})
</script>

<style scoped>
.home-page {
  padding-top: 46px;
}
.home-body {
  padding: 12px 14px 24px;
}
.hero-panel {
  height: 222px;
  padding: 22px 18px;
  color: #fff;
  background:
    linear-gradient(135deg, rgba(23, 32, 42, 0.9), rgba(48, 56, 66, 0.76)),
    url('https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80') center/cover;
  box-shadow: 0 22px 54px rgba(23, 32, 42, 0.2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.hero-copy h1 {
  margin-top: 14px;
  max-width: 290px;
  font-size: 27px;
  line-height: 1.18;
}
.hero-copy p {
  margin-top: 10px;
  max-width: 300px;
  color: rgba(255, 255, 255, 0.76);
  line-height: 1.55;
}
.hero-cta {
  align-self: flex-end;
  width: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  margin-top: 18px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #17202a;
  font-weight: 700;
  font-size: 12px;
}
.search-bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.96);
  border-radius: 999px;
  padding: 0 16px;
  margin: 14px 0;
  color: #7b8794;
  box-shadow: 0 8px 22px rgba(17, 24, 39, 0.05);
}
.banner-swipe {
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 0;
  box-shadow: 0 18px 46px rgba(23, 32, 42, 0.14);
}
.hero-swipe {
  height: 222px;
}
.hero-swipe :deep(.van-swipe__track),
.hero-swipe :deep(.van-swipe-item) {
  height: 100%;
}
.hero-swipe :deep(.van-swipe__indicators) {
  bottom: 12px;
}
.banner-img {
  width: 100%;
  height: 222px;
  object-fit: cover;
  display: block;
}
.category-nav {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  padding: 14px 8px 12px;
  margin-bottom: 12px;
}
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #4d5967;
}
.cat-icon {
  position: relative;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(226, 232, 240, 0.82);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78), 0 8px 18px rgba(17, 24, 39, 0.06);
}
.cat-icon::after {
  content: '';
  position: absolute;
  right: 8px;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.28;
}
.tone-beauty {
  color: #b35c7d;
  background: linear-gradient(145deg, #fff4f8, #f4e7ee);
}
.tone-health {
  color: #38745a;
  background: linear-gradient(145deg, #f1fbf5, #e2f0e8);
}
.tone-home {
  color: #8f6f3f;
  background: linear-gradient(145deg, #fff8ea, #f1e6d4);
}
.tone-digital {
  color: #315f8f;
  background: linear-gradient(145deg, #f0f7ff, #e4edf7);
}
.tone-gift {
  color: #b88a44;
  background: linear-gradient(145deg, #fff7e8, #f3e5ca);
}
.tone-default {
  color: #4d5967;
  background: linear-gradient(145deg, #f8fafc, #edf1f5);
}
.cat-name {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}
.gift-zone-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  margin-bottom: 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fffaf1 0%, #f7efe2 100%);
  border: 1px solid rgba(184, 138, 68, 0.2);
}
.gift-kicker {
  color: #8f6f3f;
  font-size: 11px;
  font-weight: 800;
}
.gift-title {
  margin-top: 4px;
  color: #17202a;
  font-size: 16px;
  font-weight: 750;
}
.gift-desc {
  margin-top: 5px;
  color: #7b8794;
  font-size: 12px;
  line-height: 1.45;
}
.section {
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 2px 10px;
}
.section-more {
  border: 0;
  background: transparent;
  color: #8f6f3f;
  font-size: 12px;
  font-weight: 700;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
</style>
