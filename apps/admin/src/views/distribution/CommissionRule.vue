<template>
  <div class="sf-page">
    <SfPageContainer title="佣金规则配置" description="按礼包等级 × 分销层级配置佣金比例，修改后即时生效">
      <template #header>
        <el-button type="primary" :icon="Check" @click="saveAll">保存全部</el-button>
      </template>

      <div class="sf-card">
        <el-alert title="佣金比例按「被推荐人购买的礼包等级」对应，而非推荐人自身等级。三级合计建议不超过30%。" type="warning" :closable="false" show-icon style="margin-bottom: 20px" />

        <el-table :data="configs" border>
          <el-table-column label="礼包等级" min-width="140">
            <template #default="{ row }">
              <SfLevelTag :level="row.packageLevel" />
            </template>
          </el-table-column>
          <el-table-column label="分销层级" min-width="120">
            <template #default="{ row }">
              {{ row.distributionLevel === 1 ? '一级（直接推荐）' : row.distributionLevel === 2 ? '二级（间推）' : '三级' }}
            </template>
          </el-table-column>
          <el-table-column label="佣金比例" min-width="200">
            <template #default="{ row }">
              <el-input-number v-model="row.rate" :min="0" :max="50" :precision="2" :step="0.5" style="width: 160px">
                <template #suffix>%</template>
              </el-input-number>
            </template>
          </el-table-column>
          <el-table-column label="示例佣金" min-width="140">
            <template #default="{ row }">
              <SfPriceTag :value="calcExample(row as CommissionRuleConfig)" />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-switch v-model="row.status" :active-value="1" :inactive-value="0" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 汇总 -->
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <div class="sf-card summary-card gold-summary">
            <div class="summary-title">金卡 9800 礼包</div>
            <div class="summary-rates">
              <span>一级 {{ goldRates[0] }}%</span>
              <span>二级 {{ goldRates[1] }}%</span>
              <span>三级 {{ goldRates[2] }}%</span>
            </div>
            <div class="summary-total">合计 {{ goldTotal }}% · 单笔佣金支出 ¥{{ (9800 * goldTotal / 100).toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12">
          <div class="sf-card summary-card silver-summary">
            <div class="summary-title">银卡 5800 礼包</div>
            <div class="summary-rates">
              <span>一级 {{ silverRates[0] }}%</span>
              <span>二级 {{ silverRates[1] }}%</span>
              <span>三级 {{ silverRates[2] }}%</span>
            </div>
            <div class="summary-total">合计 {{ silverTotal }}% · 单笔佣金支出 ¥{{ (5800 * silverTotal / 100).toFixed(2) }}</div>
          </div>
        </el-col>
      </el-row>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiConfig } from '@/api'
import { type CommissionRuleConfig, MemberLevel, calcCommission } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'
import SfPriceTag from '@/components/SfPriceTag.vue'

const configs = ref<CommissionRuleConfig[]>([])

const goldRates = computed(() => {
  const goldConfigs = configs.value.filter(c => c.packageLevel === MemberLevel.Gold).sort((a, b) => a.distributionLevel - b.distributionLevel)
  return goldConfigs.map(c => c.rate)
})

const silverRates = computed(() => {
  const silverConfigs = configs.value.filter(c => c.packageLevel === MemberLevel.Silver).sort((a, b) => a.distributionLevel - b.distributionLevel)
  return silverConfigs.map(c => c.rate)
})

const goldTotal = computed(() => goldRates.value.reduce((sum, r) => sum + r, 0))
const silverTotal = computed(() => silverRates.value.reduce((sum, r) => sum + r, 0))

const calcExample = (row: CommissionRuleConfig) => {
  const amount = row.packageLevel === MemberLevel.Gold ? 9800 : 5800
  return calcCommission(amount, row.rate)
}

const saveAll = async () => {
  for (const config of configs.value) {
    await apiConfig.saveCommissionConfig(config)
  }
  ElMessage.success('佣金规则已保存，即时生效')
}

onMounted(async () => {
  configs.value = await apiConfig.getCommissionConfigs()
})
</script>

<style scoped>
.summary-card {
  border-radius: 12px;
  padding: 24px;
}
.gold-summary {
  background: linear-gradient(135deg, #fbf3e0 0%, #fdf8ed 100%);
  border: 1px solid #e8d4a0;
}
.silver-summary {
  background: linear-gradient(135deg, #f2f2f2 0%, #f9f9f9 100%);
  border: 1px solid #d0d0d0;
}
.summary-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}
.summary-rates {
  display: flex;
  gap: 24px;
  font-size: 15px;
  color: #606266;
  margin-bottom: 8px;
}
.summary-total {
  font-size: 13px;
  color: #909399;
}
</style>
