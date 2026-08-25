<template>
  <div class="sf-page">
    <SfPageContainer title="转卖规则配置" description="配置转卖服务费、匹配超时、快递费等规则">
      <template #header>
        <el-button type="primary" :icon="Check" @click="saveAll">保存配置</el-button>
      </template>

      <div class="sf-card">
        <el-form label-width="180px">
          <el-form-item label="转卖服务费比例">
            <el-input-number v-model="form.feeRate" :min="0" :max="100" :step="5" :precision="2" style="width: 200px">
              <template #suffix>%</template>
            </el-input-number>
            <span class="form-tip">转卖成功后平台收取的手续费比例</span>
          </el-form-item>
          <el-form-item label="快递费规则">
            <el-radio-group v-model="form.shippingType">
              <el-radio value="fixed">固定金额</el-radio>
              <el-radio value="region">按地区</el-radio>
              <el-radio value="weight">按重量</el-radio>
            </el-radio-group>
            <el-input-number v-if="form.shippingType === 'fixed'" v-model="form.shippingFee" :min="0" :step="1" :precision="2" style="margin-left: 16px; width: 160px">
              <template #prefix>¥</template>
            </el-input-number>
          </el-form-item>
          <el-form-item label="转卖匹配超时">
            <el-input-number v-model="form.timeoutDays" :min="1" :max="90" style="width: 200px">
              <template #suffix>天</template>
            </el-input-number>
            <span class="form-tip">多久未匹配算超时</span>
          </el-form-item>
          <el-form-item label="超时处理策略">
            <el-radio-group v-model="form.timeoutPolicy">
              <el-radio value="fallback">系统兜底（推荐）</el-radio>
              <el-radio value="cancel">取消退回</el-radio>
              <el-radio value="wait">继续等待</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="转卖取消期限">
            <el-radio-group v-model="form.cancelPolicy">
              <el-radio value="before_match">未匹配前可取消</el-radio>
              <el-radio value="days">下单后N天内</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- 转卖预估演示 -->
      <div class="sf-card">
        <div class="sf-card-title"><el-icon><Coin /></el-icon> 转卖预估演示</div>
        <el-row :gutter="16" align="middle">
          <el-col :xs="24" :sm="8">
            <div class="demo-item">
              <label>商品价值</label>
              <el-input-number v-model="demoValue" :min="0" :step="100" style="width: 100%">
                <template #prefix>¥</template>
              </el-input-number>
            </div>
          </el-col>
          <el-col :xs="24" :sm="16">
            <div class="demo-result">
              <div class="demo-line">
                <span>商品价值</span>
                <span>¥{{ demoValue.toFixed(2) }}</span>
              </div>
              <div class="demo-line danger">
                <span>服务费 ({{ form.feeRate }}%)</span>
                <span>-¥{{ (demoValue * form.feeRate / 100).toFixed(2) }}</span>
              </div>
              <div class="demo-line danger">
                <span>快递费</span>
                <span>-¥{{ (form.shippingType === 'fixed' ? form.shippingFee : 0).toFixed(2) }}</span>
              </div>
              <el-divider />
              <div class="demo-line result">
                <span>预计到账</span>
                <span class="result-price">¥{{ (demoValue - demoValue * form.feeRate / 100 - (form.shippingType === 'fixed' ? form.shippingFee : 0)).toFixed(2) }}</span>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Check, Coin } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiConfig } from '@/api'
import SfPageContainer from '@/components/SfPageContainer.vue'

const form = reactive({
  feeRate: 20,
  shippingType: 'fixed',
  shippingFee: 10,
  timeoutDays: 30,
  timeoutPolicy: 'fallback',
  cancelPolicy: 'before_match',
})
const demoValue = ref(980)

const saveAll = async () => {
  const configs = await apiConfig.getSystemConfigs('resell')
  for (const config of configs) {
    if (config.configKey === 'resell.timeout_days') config.configValue = String(form.timeoutDays)
    if (config.configKey === 'resell.timeout_policy') config.configValue = form.timeoutPolicy
    if (config.configKey === 'resell.shipping_fee') config.configValue = String(form.shippingFee)
    await apiConfig.saveSystemConfig(config)
  }
  ElMessage.success('转卖规则已保存')
}
</script>

<style scoped>
.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #626A73;
}
.demo-item label {
  display: block;
  font-size: 13px;
  color: #626A73;
  margin-bottom: 8px;
}
.demo-result {
  background: #F8F9FB;
  border-radius: 8px;
  padding: 20px;
}
.demo-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}
.demo-line.danger span:last-child {
  color: #FF6B35;
}
.demo-line.result {
  font-weight: 600;
  font-size: 16px;
}
.result-price {
  color: #FF6B35;
  font-size: 22px;
}
</style>
