<template>
  <div class="login-page">
    <div class="login-bg"></div>

    <main class="login-shell" aria-label="管理员后台登录">
      <section class="brand-panel">
        <div class="brand-head">
          <div class="brand-logo" aria-hidden="true">
            <img src="/logo.png" alt="" />
          </div>
          <div>
            <div class="brand-kicker">ADMIN CONSOLE</div>
            <h1>橙选</h1>
          </div>
        </div>

        <div class="brand-copy">
          <p>统一管理商城、代理权益、订单履约与财务结算。</p>
        </div>

        <div class="feature-grid">
          <div class="feature-card" v-for="f in features" :key="f.title">
            <span class="feature-dot"></span>
            <strong>{{ f.title }}</strong>
            <small>{{ f.desc }}</small>
          </div>
        </div>

        <div class="brand-bottom">
          <span>SECURE ACCESS</span>
          <b>运营状态正常</b>
        </div>
      </section>

      <section class="login-panel">
        <div class="form-wrap">
          <div class="form-head">
            <span class="access-badge">后台入口</span>
            <h2>欢迎登录</h2>
            <p>请使用管理员或运营账号继续。</p>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            size="large"
            @submit.prevent
            @keydown.enter.prevent="handleLogin"
          >
            <el-form-item prop="username">
              <el-input v-model="form.username" placeholder="请输入账号" clearable aria-label="账号">
                <template #prefix><el-icon><User /></el-icon></template>
              </el-input>
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                show-password
                aria-label="密码"
              >
                <template #prefix><el-icon><Lock /></el-icon></template>
              </el-input>
            </el-form-item>

            <div class="form-options">
              <el-checkbox v-model="remember">记住账号</el-checkbox>
              <span class="forgot" @click="ElMessage.info('演示环境，请联系管理员重置')">忘记密码？</span>
            </div>

            <el-button
              type="primary"
              class="login-btn"
              :loading="loading"
              aria-label="登录后台"
              @click="handleLogin"
            >
              {{ loading ? '登录中…' : '登 录' }}
            </el-button>
          </el-form>

          <div class="demo-accounts">
            <div class="demo-title">
              <span>演示账号</span>
              <small>点击快速填充</small>
            </div>
            <div class="demo-list">
              <button
                class="demo-item"
                v-for="acc in demoAccounts"
                :key="acc.username"
                type="button"
                @click="fillAccount(acc)"
              >
                <span class="demo-name">{{ acc.name }}</span>
                <code>{{ acc.username }} / 123456</code>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import { apiAuth } from '@/api'
import { setAuth } from '@/utils/auth'

const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const loading = ref(false)
const remember = ref(true)

const form = reactive({
  username: 'admin',
  password: '123456',
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const features = [
  { title: '零售商城 + 大礼包入会', desc: '开放购买，礼包即入会' },
  { title: '月度领货权益 + 站内转卖', desc: '每月额度，转卖变现' },
  { title: '分享佣金体系', desc: '推荐奖励，后台可配' },
  { title: '全参数后台可配', desc: '规则即改即生效' },
]

const demoAccounts = [
  { name: '超级管理员', username: 'admin' },
  { name: '运营', username: 'ops' },
  { name: '财务', username: 'finance' },
]

const fillAccount = (acc: { username: string }) => {
  form.username = acc.username
  form.password = '123456'
}

const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const result = await apiAuth.login(form.username.trim(), form.password)
      if (!result) {
        ElMessage.error('账号或密码错误')
        return
      }
      setAuth(result.token, result.user, result.permissions)
      ElMessage.success(`欢迎回来，${result.user.name}`)
      const redirect = (route.query.redirect as string) || '/dashboard'
      router.replace(redirect)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  min-height: 720px;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 12% 12%, rgba(255, 107, 53, 0.14), transparent 28%),
    linear-gradient(145deg, #111418 0%, #232832 54%, #f8f9fb 54%, #f8f9fb 100%);
  position: relative;
  overflow: hidden;
}
.login-bg {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.18) 100%);
  background-size: 64px 64px, 64px 64px, 100% 100%;
  pointer-events: none;
}

.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(420px, 1.05fr) minmax(420px, 0.95fr);
  width: min(1080px, 100%);
  min-height: 620px;
  border: 1px solid rgba(231, 233, 237, 0.86);
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 34px 90px rgba(17, 24, 39, 0.26);
  backdrop-filter: blur(18px);
}

.brand-panel {
  background:
    linear-gradient(135deg, rgba(255, 107, 53, 0.2), transparent 38%),
    linear-gradient(160deg, #171A1F 0%, #222832 55%, #303641 100%);
  color: #fff;
  padding: 50px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 44px;
}
.brand-head {
  display: flex;
  align-items: center;
  gap: 16px;
}
.brand-logo {
  width: 150px;
  height: 58px;
  padding: 5px 10px;
  border-radius: 16px;
  background: #050505;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(255, 107, 53, 0.4);
}
.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.brand-kicker {
  color: rgba(255, 255, 255, 0.48);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}
.brand-head h1 {
  margin: 4px 0 0;
  font-size: 32px;
  line-height: 1;
  letter-spacing: 0;
}
.brand-copy {
  max-width: 430px;
  margin-top: auto;
}
.brand-copy p {
  margin: 0;
  font-size: 30px;
  line-height: 1.38;
  font-weight: 800;
  color: #fff;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.feature-card {
  min-height: 104px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
}
.feature-dot {
  display: block;
  width: 8px;
  height: 8px;
  margin-bottom: 18px;
  border-radius: 50%;
  background: #FF6B35;
  box-shadow: 0 0 0 5px rgba(255, 107, 53, 0.16);
}
.feature-card strong {
  display: block;
  color: #fff;
  font-size: 14px;
  line-height: 1.3;
}
.feature-card small {
  display: block;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.56);
  font-size: 12px;
  line-height: 1.5;
}
.brand-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 26px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.brand-bottom span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.42);
  font-weight: 700;
  letter-spacing: 0;
}
.brand-bottom b {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(24, 166, 106, 0.14);
  color: #7CE2B3;
  font-size: 12px;
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 52px 56px;
  background:
    linear-gradient(180deg, rgba(255, 241, 235, 0.55), rgba(255, 255, 255, 0) 42%),
    #fff;
}
.form-wrap {
  width: 100%;
  max-width: 390px;
}
.form-head {
  margin-bottom: 30px;
}
.access-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid #FFD5C5;
  border-radius: 999px;
  background: #FFF1EB;
  color: #E85222;
  font-size: 12px;
  font-weight: 700;
}
.form-head h2 {
  margin: 18px 0 8px;
  font-size: 30px;
  color: #171A1F;
  font-weight: 800;
  letter-spacing: 0;
}
.form-head p {
  margin: 0;
  color: #626A73;
  font-size: 14px;
}
.form-wrap :deep(.el-form-item) {
  margin-bottom: 18px;
}
.form-wrap :deep(.el-input__wrapper) {
  min-height: 48px;
  border-radius: 12px;
  background: #F8F9FB;
  box-shadow: 0 0 0 1px #E7E9ED inset;
  transition: box-shadow 0.18s ease, background 0.18s ease;
}
.form-wrap :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #FFD5C5 inset;
}
.form-wrap :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1px #FF6B35 inset, 0 10px 28px rgba(255, 107, 53, 0.1);
}
.form-wrap :deep(.el-input__inner) {
  color: #171A1F;
}
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.forgot {
  font-size: 13px;
  color: #FF6B35;
  cursor: pointer;
  font-weight: 600;
}
.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #FF6B35, #E85222);
  border: none;
  box-shadow: 0 12px 26px rgba(255, 107, 53, 0.3);
}
.login-btn:hover {
  background: linear-gradient(135deg, #E85222, #D9461A);
  transform: translateY(-1px);
}

.demo-accounts {
  margin-top: 36px;
  border-top: 1px dashed #E7E9ED;
  padding-top: 22px;
}
.demo-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #171A1F;
  font-weight: 700;
  margin-bottom: 12px;
}
.demo-title small {
  color: #9AA1AA;
  font-size: 12px;
  font-weight: 400;
}
.demo-list {
  display: grid;
  gap: 8px;
}
.demo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  background: #F8F9FB;
  border: 1px solid #E7E9ED;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  text-align: left;
}
.demo-item:hover {
  border-color: #FF6B35;
  background: #FFF1EB;
  transform: translateY(-1px);
}
.demo-name { font-size: 13px; color: #171A1F; font-weight: 500; }
.demo-item code {
  font-size: 12px;
  color: #626A73;
  background: none;
  padding: 0;
}
@media (max-width: 980px) {
  .login-page {
    min-height: 100vh;
    padding: 20px;
  }
  .login-shell {
    grid-template-columns: 1fr;
    width: min(560px, 100%);
  }
  .brand-panel {
    padding: 34px;
    gap: 24px;
  }
  .brand-copy p {
    font-size: 24px;
  }
  .feature-grid {
    display: none;
  }
  .login-panel {
    padding: 34px;
  }
}
@media (max-width: 860px) {
  .login-page {
    align-items: flex-start;
    overflow-y: auto;
  }
}
@media (max-width: 520px) {
  .login-page {
    padding: 12px;
    background: #F8F9FB;
  }
  .login-shell {
    min-height: auto;
    border-radius: 18px;
  }
  .brand-panel,
  .login-panel {
    padding: 24px;
  }
  .brand-bottom {
    align-items: flex-start;
    flex-direction: column;
  }
  .demo-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
