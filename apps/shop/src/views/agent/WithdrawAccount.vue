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
import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showFailToast } from 'vant'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const bankForm = reactive({
  name: '',
  bankName: '',
  cardNo: '',
})
const alipayForm = reactive({
  name: '',
  account: '',
})

onMounted(async () => {
  if (!userStore.member) return
  try {
    const acc = await api.getPayoutAccount()
    bankForm.name = acc.bankHolder
    bankForm.bankName = acc.bankName
    bankForm.cardNo = acc.bankCard
    alipayForm.name = acc.alipayName
    alipayForm.account = acc.alipayAccount
  } catch { /* 首次进入为空 */ }
})

const onSave = async () => {
  try {
    await api.savePayoutAccount({
      bankHolder: bankForm.name.trim(),
      bankName: bankForm.bankName.trim(),
      bankCard: bankForm.cardNo.trim(),
      alipayName: alipayForm.name.trim(),
      alipayAccount: alipayForm.account.trim(),
    })
    showSuccessToast('提现账号已保存')
  } catch {
    showFailToast('保存失败，请稍后重试')
  }
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
  background: linear-gradient(135deg, #171A1F, #171A1F);
  box-shadow: 0 22px 54px rgba(23, 32, 42, 0.18);
}
.section-kicker {
  color: var(--color-primary);
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
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 800;
}
.account-title .van-icon {
  color: var(--color-primary-dark);
}
.status-pill {
  padding: 4px 9px;
  border-radius: 999px;
  background: #EAF8F2;
  color: #18A66A;
  font-size: 11px;
  font-weight: 700;
}
.status-pill.muted {
  background: var(--bg-muted);
  color: var(--text-secondary);
}
.account-form {
  border-top: 1px solid var(--border-color);
}
.security-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 14px 4px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.security-note .van-icon {
  margin-top: 2px;
  color: var(--color-primary-dark);
}
.save-button {
  height: 44px;
  font-weight: 800;
}
</style>
