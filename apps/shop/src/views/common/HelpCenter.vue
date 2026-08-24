<template>
  <div class="mine-sub-page page-shell">
    <van-nav-bar title="客服与帮助" left-arrow @click-left="router.back()" fixed safe-area-inset-top />
    <main class="mine-sub-body">
      <section class="sub-hero"><span>SUPPORT</span><h1>客服与帮助</h1><p>常见问题与服务入口。</p></section>
      <van-cell-group inset class="support-card">
        <van-cell v-for="item in helpItems" :key="item" :title="item" icon="question-o" is-link @click="openHelp(item)" />
      </van-cell-group>
      <van-button block round type="primary" class="primary-action" icon="service-o" @click="contactService">联系在线客服</van-button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { showToast } from 'vant'

const router = useRouter()
const helpItems = ['订单支付与发货', '会员价与折扣说明', '大礼包入会流程', '佣金结算与提现', '售后与退款规则']

const openHelp = (title: string) => {
  showToast(`${title}：说明内容已模拟加载`)
}

const contactService = () => {
  showToast('在线客服已接入，请稍后查看消息通知')
}
</script>

<style scoped>
.mine-sub-page { min-height: 100vh; padding-top: 46px; }
.mine-sub-body { padding: 12px 14px 24px; }
.sub-hero { padding: 22px 18px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #17202a, #343d49); box-shadow: 0 18px 44px rgba(23,32,42,.16); }
.sub-hero span { color: #d8b06a; font-size: 11px; font-weight: 800; }
.sub-hero h1 { margin-top: 8px; font-size: 25px; }
.sub-hero p { margin-top: 8px; color: rgba(255,255,255,.72); line-height: 1.55; }
.support-card { margin-top: 12px; overflow: hidden; border: 1px solid rgba(226,232,240,.86); border-radius: 14px; box-shadow: 0 8px 24px rgba(17,24,39,.06); }
.primary-action { margin-top: 16px; height: 44px; font-weight: 800; }
</style>
