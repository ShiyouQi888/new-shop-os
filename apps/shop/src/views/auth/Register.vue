<template>
  <main class="auth-page register-page">
    <section class="auth-shell" aria-labelledby="register-title">
      <header class="auth-topbar">
        <button class="icon-button" type="button" aria-label="返回" @click="router.back()">
          <van-icon name="arrow-left" size="20" />
        </button>
        <button class="text-button" type="button" @click="router.push('/login')">去登录</button>
      </header>

      <section class="brand-stage">
        <div class="brand-lockup">
          <img class="brand-logo" :src="siteBranding.logo || '/logo.png'" alt="橙选" />
          <div class="brand-subtitle">邀请制会员准入</div>
        </div>

        <div class="stage-copy">
          <div class="eyebrow">INVITATION ONLY</div>
          <h1 id="register-title">创建会员账户</h1>
          <p>邀请码将绑定推荐关系，并用于后续会员权益归属。</p>
        </div>

        <div class="benefit-strip" aria-label="注册权益">
          <span>邀请绑定</span>
          <span>权益开通</span>
          <span>订单同步</span>
        </div>
      </section>

      <section class="auth-card" aria-label="注册表单">
        <div class="card-head">
          <div>
            <span>新会员注册</span>
            <strong>填写资料并绑定邀请人</strong>
          </div>
          <van-icon name="gem-o" />
        </div>

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
            v-model="password"
            name="password"
            type="password"
            label="密码"
            placeholder="设置登录密码（至少 6 位）"
            maxlength="50"
            :rules="[{ required: true, message: '请设置密码' }, { min: 6, message: '密码至少 6 位' }]"
          />
          <van-field
            v-model="confirmPassword"
            name="confirmPassword"
            type="password"
            label="确认密码"
            placeholder="再次输入密码"
            maxlength="50"
            :rules="[
              { required: true, message: '请再次输入密码' },
              { validator: passwordsMatch, message: '两次输入的密码不一致' },
            ]"
          />
          <van-field
            v-model="inviteCode"
            name="inviteCode"
            label="邀请码"
            placeholder="例如 SH1000"
            maxlength="12"
            :readonly="!!inviteFromLink"
            :rules="[{ required: true, message: '注册必须填写邀请码' }]"
          />

          <div class="invite-hint">
            <van-icon name="shield-o" />
            <span>{{ inviteFromLink ? '已从邀请链接自动带入，注册后不可修改' : '邀请码可向推荐人获取，注册后生成你的专属邀请码' }}</span>
          </div>

          <van-button block round type="primary" native-type="submit" class="submit-button">
            注册并绑定邀请人
          </van-button>
        </van-form>

        <div class="auth-switch">
          已有账号？
          <button type="button" @click="router.push('/login')">立即登录</button>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { useUserStore } from '@/stores/user'
import { siteBranding, ensureSiteBranding } from '@/utils/site'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
ensureSiteBranding()
const nickname = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
/** 来自推广链接的邀请码（/r/xxx 进入时自动带出并锁定） */
const inviteFromLink = typeof route.query.invite === 'string' ? route.query.invite.trim().toUpperCase() : ''
const inviteCode = ref(inviteFromLink)
const passwordsMatch = (v: string) => v === password.value

onMounted(() => {
  // 已登录用户无需注册：从推广链接进入时直接跳回首页
  if (userStore.isLoggedIn) {
    router.replace('/home')
  }
})

const onSubmit = async () => {
  try {
    await userStore.register({
      nickname: nickname.value,
      phone: phone.value,
      password: password.value,
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
    linear-gradient(180deg, rgba(23, 26, 31, 0.42), rgba(23, 26, 31, 0.74) 34%, #F8F9FB 34%),
    url('https://images.unsplash.com/photo-1604014238170-4def1e4e6fcf?auto=format&fit=crop&w=1200&q=80') center top/cover;
  color: #171A1F;
}
.auth-shell {
  min-height: 100vh;
  width: min(100%, 460px);
  margin: 0 auto;
  padding: calc(14px + env(safe-area-inset-top)) 16px calc(26px + env(safe-area-inset-bottom));
  color: #fff;
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
  min-height: 244px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.brand-lockup {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.brand-logo {
  width: 152px;
  height: 58px;
  object-fit: contain;
}
.brand-subtitle {
  padding-left: 2px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  font-weight: 700;
}
.stage-copy {
  padding: 18px 0 6px;
}
.eyebrow {
  color: #FFD5C5;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}
h1 {
  margin: 8px 0 0;
  font-size: 32px;
  line-height: 1.12;
  letter-spacing: 0;
}
p {
  max-width: 310px;
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
  font-size: 18px;
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
  width: 68px;
  color: #171A1F;
  font-weight: 700;
}
.auth-form :deep(.van-field__control) {
  color: #171A1F;
  font-weight: 600;
}
.auth-form :deep(.van-field--disabled .van-field__control),
.auth-form :deep(.van-field__control:read-only) {
  color: #E85222;
}
.invite-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 4px 2px 0;
  padding: 10px 12px;
  border: 1px solid #FFD5C5;
  border-radius: 12px;
  background: #FFF1EB;
  color: #E85222;
  font-size: 12px;
  line-height: 1.5;
}
.invite-hint .van-icon { margin-top: 2px; }
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
    min-height: 780px;
    border: 1px solid rgba(231, 233, 237, 0.9);
    border-radius: 32px;
    overflow: hidden;
    box-shadow: 0 28px 80px rgba(17, 24, 39, 0.24);
  }
}
</style>
