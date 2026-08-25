<template>
  <div class="sf-page">
    <SfPageContainer title="支付配置" description="统一管理支付通道，开发环境使用模拟支付，生产环境可切换微信或支付宝网关。">
      <template #header>
        <el-button :icon="Refresh" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Check" :loading="saving" @click="saveAll">保存配置</el-button>
      </template>

      <div class="payment-layout" v-loading="loading">
        <section class="sf-card payment-hero">
          <div>
            <p class="eyebrow">PAYMENT PROVIDER</p>
            <h3>支付通道中心</h3>
            <p>当前支付流程会先创建平台支付单，再由通道 Provider 决定走模拟回调或真实网关。</p>
          </div>
          <el-segmented
            v-model="form.mode"
            :options="[
              { label: '模拟支付', value: 'mock' },
              { label: '真实网关', value: 'real' },
            ]"
          />
        </section>

        <section class="sf-card channel-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">MOCK</p>
              <h3>模拟支付</h3>
            </div>
            <el-switch v-model="form.mockAutoSuccess" active-text="自动成功" inactive-text="手动确认" />
          </div>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="开发和演示环境建议保持模拟支付，前台不会产生真实扣款。"
          />
        </section>

        <section class="sf-card channel-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">WECHAT PAY</p>
              <h3>微信支付</h3>
            </div>
            <el-switch v-model="form.wechat.enabled" active-text="启用" inactive-text="关闭" />
          </div>
          <el-form label-position="top">
            <div class="form-grid">
              <el-form-item label="AppID">
                <el-input v-model="form.wechat.appId" placeholder="wx..." />
              </el-form-item>
              <el-form-item label="商户号">
                <el-input v-model="form.wechat.mchId" placeholder="微信支付商户号" />
              </el-form-item>
              <el-form-item label="APIv3 密钥">
                <el-input v-model="form.wechat.apiV3Key" type="password" show-password placeholder="用于签名与回调验签" />
              </el-form-item>
              <el-form-item label="证书序列号">
                <el-input v-model="form.wechat.certSerialNo" placeholder="商户 API 证书序列号" />
              </el-form-item>
              <el-form-item class="span-2" label="支付回调地址">
                <el-input v-model="form.wechat.notifyUrl" placeholder="https://your-domain.com/api/v1/payments/wechat/notify" />
              </el-form-item>
            </div>
          </el-form>
        </section>

        <section class="sf-card channel-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">ALIPAY</p>
              <h3>支付宝</h3>
            </div>
            <el-switch v-model="form.alipay.enabled" active-text="启用" inactive-text="关闭" />
          </div>
          <el-form label-position="top">
            <div class="form-grid">
              <el-form-item label="AppID">
                <el-input v-model="form.alipay.appId" placeholder="支付宝应用 AppID" />
              </el-form-item>
              <el-form-item label="网关地址">
                <el-input v-model="form.alipay.gateway" placeholder="https://openapi.alipay.com/gateway.do" />
              </el-form-item>
              <el-form-item class="span-2" label="应用私钥">
                <el-input v-model="form.alipay.merchantPrivateKey" type="textarea" :rows="4" placeholder="RSA2 应用私钥" />
              </el-form-item>
              <el-form-item class="span-2" label="支付宝公钥">
                <el-input v-model="form.alipay.alipayPublicKey" type="textarea" :rows="4" placeholder="支付宝开放平台公钥" />
              </el-form-item>
              <el-form-item class="span-2" label="支付回调地址">
                <el-input v-model="form.alipay.notifyUrl" placeholder="https://your-domain.com/api/v1/payments/alipay/notify" />
              </el-form-item>
            </div>
          </el-form>
        </section>
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Check, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import SfPageContainer from '@/components/SfPageContainer.vue'
import { apiConfig } from '@/api'
import type { SystemConfig } from '@shop-os/shared'

const loading = ref(false)
const saving = ref(false)
const rows = ref<SystemConfig[]>([])

const form = reactive({
  mode: 'mock',
  mockAutoSuccess: true,
  wechat: {
    enabled: false,
    appId: '',
    mchId: '',
    apiV3Key: '',
    certSerialNo: '',
    notifyUrl: '',
  },
  alipay: {
    enabled: false,
    appId: '',
    merchantPrivateKey: '',
    alipayPublicKey: '',
    gateway: 'https://openapi.alipay.com/gateway.do',
    notifyUrl: '',
  },
})

const setValue = (key: string, value: string) => {
  const row = rows.value.find(item => item.configKey === key)
  if (row) row.configValue = value
}

const read = (key: string, fallback = '') => rows.value.find(item => item.configKey === key)?.configValue ?? fallback

const hydrate = () => {
  form.mode = read('payment.mode', 'mock') === 'real' ? 'real' : 'mock'
  form.mockAutoSuccess = read('payment.mock_auto_success', '1') !== '0'
  form.wechat.enabled = read('payment.wechat.enabled') === '1'
  form.wechat.appId = read('payment.wechat.app_id')
  form.wechat.mchId = read('payment.wechat.mch_id')
  form.wechat.apiV3Key = read('payment.wechat.api_v3_key')
  form.wechat.certSerialNo = read('payment.wechat.cert_serial_no')
  form.wechat.notifyUrl = read('payment.wechat.notify_url')
  form.alipay.enabled = read('payment.alipay.enabled') === '1'
  form.alipay.appId = read('payment.alipay.app_id')
  form.alipay.merchantPrivateKey = read('payment.alipay.merchant_private_key')
  form.alipay.alipayPublicKey = read('payment.alipay.alipay_public_key')
  form.alipay.gateway = read('payment.alipay.gateway', 'https://openapi.alipay.com/gateway.do')
  form.alipay.notifyUrl = read('payment.alipay.notify_url')
}

const serialize = () => {
  setValue('payment.mode', form.mode)
  setValue('payment.mock_auto_success', form.mockAutoSuccess ? '1' : '0')
  setValue('payment.wechat.enabled', form.wechat.enabled ? '1' : '0')
  setValue('payment.wechat.app_id', form.wechat.appId.trim())
  setValue('payment.wechat.mch_id', form.wechat.mchId.trim())
  setValue('payment.wechat.api_v3_key', form.wechat.apiV3Key.trim())
  setValue('payment.wechat.cert_serial_no', form.wechat.certSerialNo.trim())
  setValue('payment.wechat.notify_url', form.wechat.notifyUrl.trim())
  setValue('payment.alipay.enabled', form.alipay.enabled ? '1' : '0')
  setValue('payment.alipay.app_id', form.alipay.appId.trim())
  setValue('payment.alipay.merchant_private_key', form.alipay.merchantPrivateKey.trim())
  setValue('payment.alipay.alipay_public_key', form.alipay.alipayPublicKey.trim())
  setValue('payment.alipay.gateway', form.alipay.gateway.trim())
  setValue('payment.alipay.notify_url', form.alipay.notifyUrl.trim())
}

const load = async () => {
  loading.value = true
  try {
    rows.value = await apiConfig.getSystemConfigs('payment')
    hydrate()
  } finally {
    loading.value = false
  }
}

const saveAll = async () => {
  saving.value = true
  try {
    serialize()
    for (const row of rows.value) {
      await apiConfig.saveSystemConfig(row)
    }
    ElMessage.success('支付配置已保存')
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.payment-layout {
  display: grid;
  gap: 18px;
}

.payment-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(255, 241, 235, 0.56)),
    #fff;

  h3 {
    margin: 4px 0 8px;
    font-size: 22px;
    color: #171a1f;
  }

  p {
    margin: 0;
    color: #626a73;
  }
}

.channel-card {
  padding: 22px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;

  h3 {
    margin: 4px 0 0;
    font-size: 18px;
    color: #171a1f;
  }
}

.eyebrow {
  margin: 0;
  color: #e85222;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 18px;
}

.span-2 {
  grid-column: span 2;
}

@media (max-width: 900px) {
  .payment-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
