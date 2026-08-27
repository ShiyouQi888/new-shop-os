<template>
  <div class="sf-page">
    <SfPageContainer title="消费返还额度配置" description="配置购物消费按比例返还领货额度的规则：适用身份（普通会员/各代理商等级）、返还比例、有效月数、是否支持转卖">
      <template #header>
        <el-button type="primary" :icon="Check" :loading="saving" @click="saveAll">保存全部</el-button>
      </template>

      <div class="sf-card">
        <el-form label-width="140px">
          <el-form-item label="消费返还总开关">
            <el-switch v-model="enabled" active-text="开启" inactive-text="关闭" />
            <div class="hint">
              开启后，会员购物消费（零售订单实付金额）按下方对应身份的比例累加为当月领货额度，与其他来源的领货额度合并计算，一起受「领货规则配置」的领取/转卖方式与到期策略约束。
            </div>
          </el-form-item>
        </el-form>
      </div>

      <el-alert
        title="下方按身份（普通会员 + 各代理商等级）分别配置；新增代理商等级后会自动出现在此处，无需额外同步。「是否支持转卖」关闭时，该身份消费所得的额度仅能用于领取商品。"
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
        <el-form label-width="120px">
          <el-row :gutter="24">
            <el-col :xs="24" :sm="8">
              <el-form-item label="返还比例">
                <el-input-number v-model="normalRule.rate" :min="0" :max="100" :step="1" :precision="2" style="width: 100%">
                  <template #suffix>%</template>
                </el-input-number>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="有效月数">
                <el-input-number v-model="normalRule.months" :min="0" :max="24" style="width: 100%" />
                <div class="field-tip">0 表示不限</div>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="支持转卖">
                <el-switch v-model="normalRule.resellable" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="专属商品池">
            <el-select
              v-model="normalPool"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="选择普通会员可用领货额度兑换的商品"
              style="width: 100%"
            >
              <el-option v-for="p in monthlyProducts" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <div class="sf-card identity-card" v-for="level in levelConfigs" :key="level.id">
        <div class="identity-header">
          <SfLevelTag :level="level.level" :name="level.levelName" />
          <span class="identity-hint">入会礼包发放额度 ¥{{ level.monthlyCredit }}/月，此处的比例为额外叠加</span>
        </div>
        <el-form label-width="120px">
          <el-row :gutter="24">
            <el-col :xs="24" :sm="8">
              <el-form-item label="返还比例">
                <el-input-number v-model="level.consumptionCreditRate" :min="0" :max="100" :step="1" :precision="2" style="width: 100%">
                  <template #suffix>%</template>
                </el-input-number>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="有效月数">
                <el-input-number v-model="level.consumptionCreditMonths" :min="0" :max="24" style="width: 100%" />
                <div class="field-tip">0 表示不限</div>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="支持转卖">
                <el-switch v-model="level.consumptionResellable" :active-value="1" :inactive-value="0" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <el-empty v-if="!levelConfigs.length" description="暂无代理商等级，可在「等级权益配置」创建" />
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiConfig, apiProduct } from '@/api'
import { type ProductSPU, type LevelBenefitConfig } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'

const monthlyProducts = ref<ProductSPU[]>([])
const levelConfigs = ref<LevelBenefitConfig[]>([])
const enabled = ref(false)
const normalRule = reactive({ rate: 0, months: 0, resellable: false })
const normalPool = ref<number[]>([])
const saving = ref(false)

const saveAll = async () => {
  saving.value = true
  try {
    const configs = await apiConfig.getSystemConfigs('consumption_credit')
    for (const config of configs) {
      if (config.configKey === 'consumption_credit.enabled') config.configValue = enabled.value ? '1' : '0'
      if (config.configKey === 'consumption_credit.normal_rate') config.configValue = String(normalRule.rate)
      if (config.configKey === 'consumption_credit.normal_months') config.configValue = String(normalRule.months)
      if (config.configKey === 'consumption_credit.normal_resellable') config.configValue = normalRule.resellable ? '1' : '0'
      await apiConfig.saveSystemConfig(config)
    }
    await apiConfig.saveCreditPool(0, normalPool.value)
    for (const level of levelConfigs.value) {
      await apiConfig.saveLevelConfig(level)
    }
    ElMessage.success('消费返还额度配置已保存')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const [products, levels, poolItems, sysConfigs] = await Promise.all([
    apiProduct.getList({ page: 1, pageSize: 100 }),
    apiConfig.getLevelConfigs(),
    apiConfig.getCreditPool(),
    apiConfig.getSystemConfigs('consumption_credit'),
  ])
  monthlyProducts.value = products.list.filter(p => p.isMonthlyProduct)
  levelConfigs.value = [...levels].sort((a, b) => a.levelSort - b.levelSort)
  normalPool.value = poolItems.filter(item => item.level === 0).map(item => item.spuId)

  const cfg = (key: string) => sysConfigs.find(c => c.configKey === key)?.configValue
  enabled.value = cfg('consumption_credit.enabled') === '1'
  normalRule.rate = Number(cfg('consumption_credit.normal_rate')) || 0
  normalRule.months = Number(cfg('consumption_credit.normal_months')) || 0
  normalRule.resellable = cfg('consumption_credit.normal_resellable') === '1'
})
</script>

<style scoped>
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
.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
.field-tip {
  font-size: 12px;
  color: #9AA1AA;
  line-height: 1.4;
  margin-top: 2px;
}
</style>
