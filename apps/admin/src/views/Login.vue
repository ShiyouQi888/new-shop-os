<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-orb orb-1"></div>
      <div class="bg-orb orb-2"></div>
      <div class="bg-orb orb-3"></div>
    </div>

    <div class="login-box">
      <!-- 左侧品牌区 -->
      <div class="login-left">
        <div class="brand">
          <div class="brand-logo">
            <el-icon :size="26" color="#fff"><ShoppingBag /></el-icon>
          </div>
          <h1>Shop-OS</h1>
          <p class="brand-sub">电商代理商管理系统</p>
        </div>
        <div class="brand-stats">
          <div class="stat-line" v-for="f in features" :key="f.title">
            <div class="stat-dot"></div>
            <div>
              <div class="stat-title">{{ f.title }}</div>
              <div class="stat-desc">{{ f.desc }}</div>
            </div>
          </div>
        </div>
        <div class="brand-foot">零售商城 · 大礼包入会 · 月度领货 · 三级分销</div>
      </div>

      <!-- 右侧表单区 -->
      <div class="login-right">
        <div class="form-wrap">
          <h2>欢迎登录</h2>
          <p class="sub-title">运营管理后台</p>

          <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent>
            <el-form-item prop="username">
              <el-input v-model="form.username" placeholder="请输入账号" clearable>
                <template #prefix><el-icon><User /></el-icon></template>
              </el-input>
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password>
                <template #prefix><el-icon><Lock /></el-icon></template>
              </el-input>
            </el-form-item>

            <div class="form-options">
              <el-checkbox v-model="remember">记住账号</el-checkbox>
              <span class="forgot" @click="ElMessage.info('演示环境，请联系管理员重置')">忘记密码？</span>
            </div>

            <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
              {{ loading ? '登录中…' : '登 录' }}
            </el-button>
          </el-form>

          <div class="demo-accounts">
            <div class="demo-title">演示账号</div>
            <div class="demo-list">
              <div
                class="demo-item"
                v-for="acc in demoAccounts"
                :key="acc.username"
                @click="fillAccount(acc)"
              >
                <span class="demo-name">{{ acc.name }}</span>
                <code>{{ acc.username }} / 123456</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import { ShoppingBag } from '@element-plus/icons-vue'
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
  { title: '三级分销佣金体系', desc: '推荐奖励，后台可配' },
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
      setAuth(result.token, result.user)
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
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f1222;
  position: relative;
  overflow: hidden;
}
.login-bg {
  position: absolute;
  inset: 0;
}
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.5;
}
.orb-1 { width: 520px; height: 520px; background: #e54d42; top: -160px; left: -120px; }
.orb-2 { width: 420px; height: 420px; background: #2d5cff; bottom: -140px; right: -100px; }
.orb-3 { width: 260px; height: 260px; background: #f37b1d; top: 40%; right: 22%; }

.login-box {
  position: relative;
  z-index: 1;
  display: flex;
  width: 960px;
  min-height: 560px;
  border-radius: 20px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.45);
}

/* 左区 */
.login-left {
  flex: 1.15;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%);
  color: #fff;
  padding: 48px 44px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.brand-logo {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #e54d42, #f37b1d);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 8px 24px rgba(229, 77, 66, 0.4);
}
.brand h1 {
  font-size: 30px;
  margin: 18px 0 4px;
  letter-spacing: 0.5px;
}
.brand-sub {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}
.brand-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 8px 0;
}
.stat-line {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f37b1d;
  margin-top: 6px;
  box-shadow: 0 0 0 4px rgba(243, 123, 29, 0.18);
}
.stat-title { font-size: 15px; font-weight: 600; }
.stat-desc { font-size: 12px; color: rgba(255, 255, 255, 0.55); margin-top: 2px; }
.brand-foot {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
}

/* 右区 */
.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 48px;
}
.form-wrap {
  width: 100%;
  max-width: 340px;
}
.form-wrap h2 {
  font-size: 26px;
  color: #1a1a2e;
  font-weight: 700;
}
.sub-title {
  color: #909399;
  margin: 6px 0 32px;
  font-size: 14px;
}
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.forgot {
  font-size: 13px;
  color: #e54d42;
  cursor: pointer;
}
.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  letter-spacing: 6px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e54d42, #f06a3a);
  border: none;
  box-shadow: 0 8px 20px rgba(229, 77, 66, 0.3);
}
.login-btn:hover { opacity: 0.92; }

.demo-accounts {
  margin-top: 36px;
  border-top: 1px dashed #ebeef5;
  padding-top: 22px;
}
.demo-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}
.demo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.demo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 8px;
  background: #f7f8fa;
  border: 1px solid #f0f1f4;
  cursor: pointer;
  transition: all 0.2s;
}
.demo-item:hover {
  border-color: #e54d42;
  background: #fef0ef;
}
.demo-name { font-size: 13px; color: #303133; font-weight: 500; }
.demo-item code {
  font-size: 12px;
  color: #909399;
  background: none;
  padding: 0;
}
@media (max-width: 860px) {
  .login-box { width: 92%; flex-direction: column; }
  .login-left { padding: 32px; }
  .brand-stats { display: none; }
  .brand-foot { margin-top: 24px; }
  .login-right { padding: 32px; }
}
</style>
