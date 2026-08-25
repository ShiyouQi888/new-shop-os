<template>
  <div class="sf-page">
    <SfPageContainer title="领货规则配置" description="配置月度领货的周期、有效期、逾期处理等规则">
      <template #header>
        <el-button type="primary" :icon="Check" @click="saveAll">保存配置</el-button>
      </template>

      <div class="sf-card">
        <el-form label-width="180px">
          <el-form-item label="领货周期起始">
            <el-radio-group v-model="form.startDay">
              <el-radio :value="1">每月1日</el-radio>
              <el-radio :value="2">入会对应日</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="领货有效期">
            <el-radio-group v-model="form.validType">
              <el-radio value="month">自然月</el-radio>
              <el-radio value="days">固定天数</el-radio>
            </el-radio-group>
            <el-input-number v-if="form.validType === 'days'" v-model="form.validDays" :min="1" :max="31" style="margin-left: 16px" />
          </el-form-item>
          <el-form-item label="逾期处理策略">
            <el-radio-group v-model="form.expirePolicy">
              <el-radio value="void">作废（推荐）</el-radio>
              <el-radio value="extend">顺延至下月</el-radio>
              <el-radio value="autoresell">自动转卖</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="领货商品池">
            <el-select v-model="form.productPool" multiple placeholder="选择可用于领货的商品" style="width: 100%">
              <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiConfig, apiProduct } from '@/api'
import { type ProductSPU } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'

const products = ref<ProductSPU[]>([])
const form = reactive({
  startDay: 1,
  validType: 'month',
  validDays: 30,
  expirePolicy: 'void',
  productPool: [3, 4, 7] as number[],
})

const saveAll = async () => {
  const configs = await apiConfig.getSystemConfigs('credit')
  for (const config of configs) {
    if (config.configKey === 'credit.start_day') config.configValue = String(form.startDay)
    if (config.configKey === 'credit.expire_policy') config.configValue = form.expirePolicy
    await apiConfig.saveSystemConfig(config)
  }
  ElMessage.success('领货规则已保存')
}

onMounted(async () => {
  products.value = (await apiProduct.getList({ page: 1, pageSize: 100 })).list
})
</script>
