<template>
  <main class="auth-page register-page">
    <section class="auth-hero" aria-labelledby="register-title">
      <button class="back-button" type="button" aria-label="返回" @click="router.back()">
        <van-icon name="arrow-left" size="20" />
      </button>

      <div class="brand-lockup">
        <div class="brand-mark">S</div>
        <div>
          <div class="brand-name">Shop-OS</div>
          <div class="brand-subtitle">邀请制会员准入</div>
        </div>
      </div>

      <div class="auth-card">
        <div class="eyebrow">INVITATION ONLY</div>
        <h1 id="register-title">创建会员账户</h1>
        <p>注册需填写有效邀请码，用于绑定推荐关系与后续权益归属。</p>

        <van-form class="auth-form" @submit="onSubmit">
          <van-field
            v-model="nickname"
            name="nickname"
            label="昵称"
            placeholder="请输入昵称"
            :rules="[{ required: true, message: '请输入昵称' }]"
          />
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
            v-model="inviteCode"
            name="inviteCode"
            label="邀请码"
            placeholder="例如 GOLD001"
            maxlength="12"
            :rules="[{ required: true, message: '注册必须填写邀请码' }]"
          />

          <div class="invite-hint">
            <van-icon name="shield-o" />
            <span>演示邀请码：GOLD001 / GOLD002 / SIL003</span>
          </div>

          <van-button block round type="primary" native-type="submit" class="submit-button">
            注册并绑定邀请人
          </van-button>
        </van-form>

        <div class="auth-switch">
          已有账号？
          <button type="button" @click="router.push('/login')">立即登录</button>
        </div>
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
const nickname = ref('')
const phone = ref('')
const inviteCode = ref('')

const onSubmit = () => {
  try {
    userStore.register({
      nickname: nickname.value,
      phone: phone.value,
      inviteCode: inviteCode.value.trim().toUpperCase(),
    })
    showSuccessToast('注册成功')
    router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/mine')
  } catch (error) {
    showFailToast(error instanceof Error ? error.message : '注册失败')
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background:
    linear-gradient(160deg, rgba(23, 32, 42, 0.94), rgba(42, 48, 56, 0.82)),
    url('https://images.unsplash.com/photo-1604014238170-4def1e4e6fcf?auto=format&fit=crop&w=1200&q=80') center/cover;
}
.auth-hero {
  min-height: 100vh;
  padding: 20px 20px 28px;
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
  margin-top: 44px;
  padding: 26px 18px 20px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
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
.invite-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  color: #8f6f3f;
  font-size: 12px;
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
</style>
