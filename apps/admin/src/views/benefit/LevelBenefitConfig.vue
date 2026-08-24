<template>
  <div class="sf-page">
    <SfPageContainer title="等级权益配置" description="配置各代理商等级的入门金额、折扣、领货额度等权益">
      <template #header>
        <el-button type="primary" :icon="Check" @click="saveAll">保存全部</el-button>
      </template>

      <div class="sf-card" v-for="config in configs" :key="config.id" :class="config.level === 2 ? 'gold-card' : 'silver-card'">
        <div class="level-header">
          <SfLevelTag :level="config.level" />
          <span class="level-config-name">{{ config.levelName }}</span>
        </div>
        <el-form label-width="160px" style="margin-top: 20px">
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12">
              <el-form-item label="入门金额">
                <el-input-number v-model="config.entryAmount" :min="0" :step="100" style="width: 100%">
                  <template #prefix>¥</template>
                </el-input-number>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="商城折扣率">
                <el-input-number v-model="config.shopDiscount" :min="1" :max="100" :step="5" style="width: 100%">
                  <template #suffix>% ({{ config.shopDiscount }}% = {{ config.shopDiscount / 10 }}折)</template>
                </el-input-number>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="月度领货额度">
                <el-input-number v-model="config.monthlyCredit" :min="0" :step="50" style="width: 100%">
                  <template #prefix>¥</template>
                </el-input-number>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="领货月数">
                <el-input-number v-model="config.creditMonths" :min="1" :max="24" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="转卖服务费率">
                <el-input-number v-model="config.resellFeeRate" :min="0" :max="100" :step="5" :precision="2" style="width: 100%">
                  <template #suffix>%</template>
                </el-input-number>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="状态">
                <el-switch v-model="config.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiConfig } from '@/api'
import { type LevelBenefitConfig } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'

const configs = ref<LevelBenefitConfig[]>([])

const saveAll = async () => {
  for (const config of configs.value) {
    await apiConfig.saveLevelConfig(config)
  }
  ElMessage.success('等级权益配置已保存')
}

onMounted(async () => {
  configs.value = await apiConfig.getLevelConfigs()
})
</script>

<style scoped>
.gold-card {
  border-left: 4px solid #d4a851;
}
.silver-card {
  border-left: 4px solid #9a9a9a;
}
.level-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.level-config-name {
  font-size: 18px;
  font-weight: 600;
}
</style>
