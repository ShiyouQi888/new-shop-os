<template>
  <main class="auth-page">
    <section class="auth-shell" aria-labelledby="login-title">
      <header class="auth-topbar">
        <button class="icon-button" type="button" aria-label="返回" @click="router.back()">
          <van-icon name="arrow-left" size="20" />
        </button>
        <button class="text-button" type="button" @click="router.push('/home')">先逛逛</button>
      </header>

      <section class="brand-stage">
        <div class="brand-lockup">
          <div class="brand-mark">S</div>
          <div>
            <div class="brand-name">Shop-OS</div>
            <div class="brand-subtitle">精选会员商城</div>
          </div>
        </div>

        <div class="stage-copy">
          <div class="eyebrow">MEMBER ACCESS</div>
          <h1 id="login-title">欢迎回来</h1>
          <p>登录后同步会员价、领货额度、购物车与代理权益。</p>
        </div>

        <div class="benefit-strip" aria-label="会员权益">
          <span>会员价</span>
          <span>月度领货</span>
          <span>收益追踪</span>
        </div>
      </section>

      <section class="auth-card" aria-label="登录表单">
        <div class="card-head">
          <div>
            <span>手机号登录</span>
            <strong>安全进入账户</strong>
          </div>
          <van-icon name="shield-o" />
        </div>

        <van-form class="auth-form" @submit="onSubmit">
          <van-field
            v-model="phone"
            name="phone"
            type="tel"
            label="手机号"
            placeholder="请输入手机号"
            maxlength="11"
            :rules="[{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '手机号格式不正确' }]"
          />
          <van-field
            v-model="password"
            name="password"
            type="password"
            label="密码"
            placeholder="请输入登录密码"
            maxlength="50"
            :rules="[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少 6 位' }]"
          />

          <van-button block round type="primary" native-type="submit" class="submit-button">
            登录
          </van-button>
        </van-form>

        <div class="auth-switch">
          还没有账号？
          <button type="button" @click="router.push('/register')">使用邀请码注册</button>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const phone = ref('13810000000')
const password = ref('123456')

const onSubmit = async () => {
  try {
    await userStore.login(phone.value, password.value)
    showSuccessToast('登录成功')
    router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/mine')
  } catch (error) {
    showFailToast(error instanceof Error ? error.message : '登录失败')
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, rgba(23, 26, 31, 0.46), rgba(23, 26, 31, 0.72) 38%, #F8F9FB 38%),
    url('https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80') center top/cover;
  color: #171A1F;
}
.auth-shell {
  min-height: 100vh;
  width: min(100%, 460px);
  margin: 0 auto;
  padding: calc(14px + env(safe-area-inset-top)) 16px calc(26px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.auth-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.icon-button {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  backdrop-filter: blur(14px);
}
.text-button {
  height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  backdrop-filter: blur(14px);
}
.brand-stage {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
}
.brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #FF6B35, #E85222);
  font-size: 24px;
  font-weight: 800;
}
.brand-name {
  font-size: 18px;
  font-weight: 800;
}
.brand-subtitle {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
}
.stage-copy {
  padding: 22px 0 10px;
}
.eyebrow {
  color: #FFD5C5;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}
h1 {
  margin: 8px 0 0;
  font-size: 34px;
  line-height: 1.12;
  letter-spacing: 0;
}
p {
  max-width: 300px;
  margin: 10px 0 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 14px;
  line-height: 1.7;
}
.benefit-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.benefit-strip span {
  min-height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.13);
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(14px);
}
.auth-card {
  padding: 18px 16px 20px;
  border: 1px solid rgba(231, 233, 237, 0.92);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 20px 54px rgba(17, 24, 39, 0.14);
  color: #171A1F;
  backdrop-filter: blur(18px);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  padding: 4px 2px 0;
}
.card-head span {
  color: #626A73;
  font-size: 12px;
}
.card-head strong {
  display: block;
  margin-top: 4px;
  color: #171A1F;
  font-size: 19px;
}
.card-head .van-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #FFF1EB;
  color: #E85222;
}
.auth-form {
  margin-top: 0;
}
.auth-form :deep(.van-cell) {
  margin-bottom: 12px;
  padding: 14px 14px;
  border: 1px solid #E7E9ED;
  border-radius: 14px;
  background: #F8F9FB;
}
.auth-form :deep(.van-cell::after) {
  display: none;
}
.auth-form :deep(.van-field__label) {
  width: 54px;
  color: #171A1F;
  font-weight: 700;
}
.auth-form :deep(.van-field__control) {
  color: #171A1F;
  font-weight: 600;
}
.submit-button {
  margin-top: 18px;
  height: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #E85222);
  border: 0;
  box-shadow: 0 12px 26px rgba(255, 107, 53, 0.28);
}
.auth-switch {
  margin-top: 20px;
  text-align: center;
  color: #626A73;
  font-size: 13px;
}
.auth-switch button {
  border: 0;
  background: transparent;
  color: #E85222;
  font-weight: 700;
}
@media (min-width: 768px) {
  .auth-page {
    display: grid;
    place-items: center;
    padding: 32px;
  }
  .auth-shell {
    min-height: 760px;
    border: 1px solid rgba(231, 233, 237, 0.9);
    border-radius: 32px;
    overflow: hidden;
    box-shadow: 0 28px 80px rgba(17, 24, 39, 0.24);
  }
}
</style>
