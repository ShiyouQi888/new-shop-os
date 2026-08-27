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

      <div class="sf-card">
        <el-form label-width="180px">
          <el-form-item label="自动匹配总开关">
            <el-switch v-model="autoMatchEnabled" active-text="开启" inactive-text="关闭" />
            <div class="hint">
              开启后，商城零售订单或入会礼包订单只要命中下方任一身份配置的「转卖商品池」商品，支付成功时就会自动匹配当前最早的一笔待匹配转卖单（先进先出，不要求金额或商品完全对应）。关闭时维持现状，全部由后台人工匹配。
            </div>
          </el-form-item>
        </el-form>
      </div>

      <el-alert
        title="下方按身份（普通会员 + 各代理商等级）分别配置转卖商品池；任一身份池内的商品产生真实成交，都可以匹配任意会员的待匹配转卖单。"
        type="info"
        :closable="false"
        show-icon
        class="identity-tip"
      />

      <div class="sf-card identity-card">
        <div class="identity-header">
          <SfLevelTag :level="0" />
          <span class="identity-hint">未购买入会礼包的普通会员</span>
        </div>
        <el-select
          v-model="normalPool"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          placeholder="选择购买后可触发自动匹配的商品"
          style="width: 100%"
        >
          <el-option v-for="p in allProducts" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </div>

      <div class="sf-card identity-card" v-for="level in levelConfigs" :key="level.id">
        <div class="identity-header">
          <SfLevelTag :level="level.level" :name="level.levelName" />
        </div>
        <el-select
          v-model="levelPools[level.level]"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          placeholder="选择购买后可触发自动匹配的商品"
          style="width: 100%"
        >
          <el-option v-for="p in allProducts" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
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
import { apiConfig, apiProduct } from '@/api'
import { type ProductSPU, type LevelBenefitConfig } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'

const form = reactive({
  feeRate: 20,
  shippingType: 'fixed',
  shippingFee: 10,
  timeoutDays: 30,
  timeoutPolicy: 'fallback',
  cancelPolicy: 'before_match',
})
const demoValue = ref(980)
const autoMatchEnabled = ref(false)
const allProducts = ref<ProductSPU[]>([])
const levelConfigs = ref<LevelBenefitConfig[]>([])
const normalPool = ref<number[]>([])
const levelPools = reactive<Record<number, number[]>>({})

const saveAll = async () => {
  const configs = await apiConfig.getSystemConfigs('resell')
  for (const config of configs) {
    if (config.configKey === 'resell.service_fee_rate') config.configValue = String(form.feeRate)
    if (config.configKey === 'resell.timeout_days') config.configValue = String(form.timeoutDays)
    if (config.configKey === 'resell.timeout_policy') config.configValue = form.timeoutPolicy
    if (config.configKey === 'resell.shipping_fee') config.configValue = String(form.shippingFee)
    if (config.configKey === 'resell.auto_match_enabled') config.configValue = autoMatchEnabled.value ? '1' : '0'
    await apiConfig.saveSystemConfig(config)
  }
  await apiConfig.saveResellPool(0, normalPool.value)
  for (const level of levelConfigs.value) {
    await apiConfig.saveResellPool(level.level, levelPools[level.level] || [])
  }
  ElMessage.success('转卖规则已保存')
}

onMounted(async () => {
  const [sysConfigs, products, levels, poolItems] = await Promise.all([
    apiConfig.getSystemConfigs('resell'),
    apiProduct.getList({ page: 1, pageSize: 100 }),
    apiConfig.getLevelConfigs(),
    apiConfig.getResellPool(),
  ])
  const cfg = (key: string) => sysConfigs.find(c => c.configKey === key)?.configValue
  form.feeRate = Number(cfg('resell.service_fee_rate')) || 0
  form.shippingFee = Number(cfg('resell.shipping_fee')) || 0
  form.timeoutDays = Number(cfg('resell.timeout_days')) || 30
  form.timeoutPolicy = cfg('resell.timeout_policy') || 'fallback'
  autoMatchEnabled.value = cfg('resell.auto_match_enabled') === '1'

  allProducts.value = products.list
  levelConfigs.value = [...levels].sort((a, b) => a.levelSort - b.levelSort)
  normalPool.value = poolItems.filter(item => item.level === 0).map(item => item.spuId)
  for (const level of levelConfigs.value) {
    levelPools[level.level] = poolItems.filter(item => item.level === level.level).map(item => item.spuId)
  }
})
</script>

<style scoped>
.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #626A73;
}
.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
.identity-tip {
  margin: 16px 0;
}
.identity-card {
  margin-bottom: 16px;
}
.identity-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.identity-hint {
  font-size: 13px;
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
