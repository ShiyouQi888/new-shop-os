<template>
  <main class="auth-page">
    <section class="auth-hero" aria-labelledby="login-title">
      <button class="back-button" type="button" aria-label="返回" @click="router.back()">
        <van-icon name="arrow-left" size="20" />
      </button>

      <div class="brand-lockup">
        <div class="brand-mark">S</div>
        <div>
          <div class="brand-name">Shop-OS</div>
          <div class="brand-subtitle">高端会员制精选商城</div>
        </div>
      </div>

      <div class="auth-card">
        <div class="eyebrow">MEMBER ACCESS</div>
        <h1 id="login-title">欢迎回来</h1>
        <p>登录后查看会员价、月度领货额度与代理收益。</p>

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
            v-model="code"
            name="code"
            type="digit"
            label="验证码"
            placeholder="输入 6 位验证码"
            maxlength="6"
            :rules="[{ required: true, message: '请输入验证码' }, { pattern: /^\d{6}$/, message: '验证码为 6 位数字' }]"
          >
            <template #button>
              <van-button size="small" type="primary" plain native-type="button" @click="sendCode">获取验证码</van-button>
            </template>
          </van-field>

          <van-button block round type="primary" native-type="submit" class="submit-button">
            登录
          </van-button>
        </van-form>

        <div class="auth-switch">
          还没有账号？
          <button type="button" @click="router.push('/register')">使用邀请码注册</button>
        </div>
      </div>

      <div class="trust-row">
        <span>会员价</span>
        <span>权益追踪</span>
        <span>邀请关系保护</span>
      </div>
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
const phone = ref('13800001111')
const code = ref('888888')

const sendCode = () => {
  code.value = '888888'
  showSuccessToast('模拟验证码：888888')
}

const onSubmit = () => {
  if (code.value !== '888888') {
    showFailToast('验证码不正确')
    return
  }
  try {
    userStore.login(phone.value)
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
    linear-gradient(160deg, rgba(23, 32, 42, 0.94), rgba(31, 41, 51, 0.84)),
    url('https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80') center/cover;
}
.auth-hero {
  min-height: 100vh;
  padding: 20px 20px 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
}
.back-button {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}
.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #d8b06a, #8f6f3f);
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
.auth-card {
  margin-top: 54px;
  padding: 26px 18px 20px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.24);
  color: #17202a;
}
.eyebrow {
  color: #b88a44;
  font-size: 11px;
  font-weight: 800;
}
h1 {
  margin-top: 8px;
  font-size: 30px;
  line-height: 1.15;
}
p {
  margin-top: 8px;
  color: #637083;
  line-height: 1.6;
}
.auth-form {
  margin-top: 22px;
}
.submit-button {
  margin-top: 22px;
  height: 44px;
  font-weight: 700;
}
.auth-switch {
  margin-top: 18px;
  text-align: center;
  color: #7b8794;
  font-size: 13px;
}
.auth-switch button {
  border: 0;
  background: transparent;
  color: #8f6f3f;
  font-weight: 700;
}
.trust-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;
}
.trust-row span {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}
</style>
