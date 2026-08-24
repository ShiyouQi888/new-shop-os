<template>
  <div class="withdraw-account page-shell">
    <van-nav-bar title="提现账号绑定" left-arrow @click-left="router.back()" fixed safe-area-inset-top />

    <main class="account-body">
      <section class="summary-card">
        <span class="section-kicker">SECURE PAYOUT</span>
        <h1>管理提现收款方式</h1>
        <p>绑定银行卡或支付宝后，可在佣金提现时选择对应账户。</p>
      </section>

      <section class="account-card premium-card">
        <div class="account-header">
          <div class="account-title">
            <van-icon name="card" />
            <span>银行卡</span>
          </div>
          <span class="status-pill">已绑定</span>
        </div>
        <van-form class="account-form">
          <van-field v-model="bankForm.name" label="持卡人" placeholder="请输入持卡人姓名" />
          <van-field v-model="bankForm.bankName" label="开户银行" placeholder="例如 招商银行" />
          <van-field v-model="bankForm.cardNo" label="银行卡号" type="digit" placeholder="请输入银行卡号" />
        </van-form>
      </section>

      <section class="account-card premium-card">
        <div class="account-header">
          <div class="account-title">
            <van-icon name="paid" />
            <span>支付宝</span>
          </div>
          <span class="status-pill muted">可修改</span>
        </div>
        <van-form class="account-form">
          <van-field v-model="alipayForm.name" label="真实姓名" placeholder="请输入支付宝实名" />
          <van-field v-model="alipayForm.account" label="支付宝账号" placeholder="手机号或邮箱" />
        </van-form>
      </section>

      <div class="security-note">
        <van-icon name="shield-o" />
        <span>提现账号仅用于佣金打款，修改后下一笔提现生效。</span>
      </div>

      <van-button block round type="primary" class="save-button" @click="onSave">
        保存绑定信息
      </van-button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'

const router = useRouter()
const bankForm = reactive({
  name: '张伟',
  bankName: '招商银行',
  cardNo: '622588******1234',
})
const alipayForm = reactive({
  name: '张伟',
  account: '138****1111',
})

const onSave = () => {
  showSuccessToast('提现账号已保存')
}
</script>

<style scoped>
.withdraw-account {
  min-height: 100vh;
  padding-top: 46px;
}
.account-body {
  padding: 12px 14px 24px;
}
.summary-card {
  padding: 22px 18px;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(135deg, #17202a, #343d49);
  box-shadow: 0 22px 54px rgba(23, 32, 42, 0.18);
}
.section-kicker {
  color: #d8b06a;
  font-size: 11px;
  font-weight: 800;
}
h1 {
  margin-top: 8px;
  font-size: 25px;
  line-height: 1.2;
}
p {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.55;
}
.account-card {
  margin-top: 12px;
  padding: 14px 0 4px;
  overflow: hidden;
}
.account-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px;
}
.account-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #17202a;
  font-size: 16px;
  font-weight: 800;
}
.account-title .van-icon {
  color: #8f6f3f;
}
.status-pill {
  padding: 4px 9px;
  border-radius: 999px;
  background: #e8f4ee;
  color: #177245;
  font-size: 11px;
  font-weight: 700;
}
.status-pill.muted {
  background: #f1f4f8;
  color: #637083;
}
.account-form {
  border-top: 1px solid rgba(226, 232, 240, 0.76);
}
.security-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 14px 4px;
  color: #7b8794;
  font-size: 12px;
  line-height: 1.5;
}
.security-note .van-icon {
  margin-top: 2px;
  color: #8f6f3f;
}
.save-button {
  height: 44px;
  font-weight: 800;
}
</style>
