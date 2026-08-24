<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="规则中心" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>POLICY</span><h1>规则中心</h1><p>平台权益、交易与分销规则说明。</p></section>
      <section class="rule-card" v-for="item in rules" :key="item.title">
        <div><van-icon :name="item.icon" /><strong>{{ item.title }}</strong></div>
        <p>{{ item.desc }}</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const rules = [
  { icon: 'gem-o', title: '会员权益规则', desc: '会员折扣、月度领货额度与权益周期以订单支付成功后生效。' },
  { icon: 'cluster-o', title: '分销佣金规则', desc: '佣金按确认收货后的有效订单结算，支持三级关系追踪。' },
  { icon: 'exchange', title: '站内转卖规则', desc: '转卖服务费、匹配周期与兜底策略以系统配置为准。' },
  { icon: 'shield-o', title: '账号安全规则', desc: '提现账号修改后对下一笔提现生效，历史提现不受影响。' },
]
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 24px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #17202a, #343d49); box-shadow: 0 18px 44px rgba(23,32,42,.16); }
.sub-hero span { color: #d8b06a; font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.rule-card { margin-top: 10px; padding: 16px; border: 1px solid rgba(226,232,240,.86); border-radius: 14px; background: rgba(255,255,255,.96); box-shadow: 0 8px 24px rgba(17,24,39,.06); }
.rule-card div { display: flex; align-items: center; gap: 8px; color: #17202a; font-size: 15px; font-weight: 800; }
.rule-card .van-icon { color: #8f6f3f; }
.rule-card p { margin-top: 8px; color: #637083; line-height: 1.6; }
</style>
