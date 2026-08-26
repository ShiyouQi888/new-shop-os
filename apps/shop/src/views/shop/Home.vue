<template>
  <div class="home-page page-shell">
    <main class="home-body">
      <div class="hero-stage">
        <van-swipe class="banner-swipe hero-swipe" :autoplay="3600" indicator-color="#FF6B35">
          <van-swipe-item>
            <section class="hero-panel">
              <div class="hero-copy">
                <div class="premium-pill">MEMBER CURATED</div>
                <h1>精选商品与分享权益的一体化商城</h1>
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
        <img :src="siteBranding.logo || '/logo.png'" alt="橙选商城" class="hero-brand-logo" />
      </div>

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
        <van-icon name="gem-o" size="28" color="#FF6B35" />
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
import { siteBranding, ensureSiteBranding } from '@/utils/site'

const router = useRouter()
ensureSiteBranding()
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
  padding-top: env(safe-area-inset-top);
}
.home-body {
  padding: 10px 12px 18px;
}
.hero-panel {
  height: 194px;
  padding: 18px 16px 16px;
  color: #fff;
  background:
    linear-gradient(135deg, rgba(23, 32, 42, 0.9), rgba(48, 56, 66, 0.76)),
    url('https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80') center/cover;
  box-shadow: 0 16px 38px rgba(23, 32, 42, 0.18);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.hero-copy h1 {
  margin-top: 10px;
  max-width: 286px;
  font-size: 24px;
  line-height: 1.16;
  letter-spacing: 0;
}
.hero-copy p {
  margin-top: 8px;
  max-width: 300px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
  line-height: 1.45;
}
.hero-cta {
  align-self: flex-end;
  width: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  margin-top: 12px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #171A1F;
  font-weight: 700;
  font-size: 12px;
}
.search-bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border: 1px solid rgba(231, 233, 237, 0.9);
  background: rgba(255, 255, 255, 0.96);
  border-radius: 999px;
  padding: 0 16px;
  margin: 10px 0;
  color: #626A73;
  box-shadow: 0 8px 20px rgba(17, 24, 39, 0.045);
}
.hero-stage {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(23, 32, 42, 0.13);
}
.hero-brand-logo {
  position: absolute;
  top: 14px;
  right: 14px;
  height: 24px;
  width: auto;
  z-index: 5;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.45));
  pointer-events: none;
}
.hero-swipe {
  height: 194px;
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
  height: 194px;
  object-fit: cover;
  display: block;
}
.category-nav {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 11px 6px 10px;
  margin-bottom: 10px;
}
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #626A73;
}
.cat-icon {
  position: relative;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(231, 233, 237, 0.82);
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78), 0 7px 15px rgba(17, 24, 39, 0.05);
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
  color: #E85222;
  background: linear-gradient(145deg, #FFFFFF, #FFF1EB);
}
.tone-health {
  color: #18A66A;
  background: linear-gradient(145deg, #FFFFFF, #EAF8F2);
}
.tone-home {
  color: #E85222;
  background: linear-gradient(145deg, #FFFFFF, #FFF1EB);
}
.tone-digital {
  color: #626A73;
  background: linear-gradient(145deg, #FFFFFF, #F8F9FB);
}
.tone-gift {
  color: #FF6B35;
  background: linear-gradient(145deg, #FFFFFF, #FFF1EB);
}
.tone-default {
  color: #626A73;
  background: linear-gradient(145deg, #FFFFFF, #F8F9FB);
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
  padding: 13px 14px;
  margin-bottom: 10px;
  border-radius: 16px;
  background: linear-gradient(135deg, #FFFFFF 0%, #FFF1EB 100%);
  border: 1px solid rgba(255, 107, 53, 0.2);
}
.gift-kicker {
  color: #E85222;
  font-size: 11px;
  font-weight: 800;
}
.gift-title {
  margin-top: 4px;
  color: #171A1F;
  font-size: 15px;
  font-weight: 750;
}
.gift-desc {
  margin-top: 4px;
  color: #626A73;
  font-size: 12px;
  line-height: 1.45;
}
.section {
  margin-bottom: 12px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 2px 8px;
}
.section-more {
  border: 0;
  background: transparent;
  color: #E85222;
  font-size: 12px;
  font-weight: 700;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
</style>
