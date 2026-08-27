<template>
  <div class="sf-page">
    <SfPageContainer title="领货规则配置" description="配置月度领货的周期、有效期、逾期处理，以及各等级可兑换的专属商品池">
      <template #header>
        <el-button type="primary" :icon="Check" :loading="saving" @click="saveAll">保存全部</el-button>
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
          <el-form-item label="领取/转卖方式">
            <el-radio-group v-model="form.claimMode">
              <el-radio value="lump_sum">一次性用完（推荐）</el-radio>
              <el-radio value="flexible">自由任意额度</el-radio>
            </el-radio-group>
            <div class="claim-mode-hint">
              {{ form.claimMode === 'lump_sum'
                ? '会员每次领取或转卖必须用完当月剩余额度，不能拆分为任意金额（如剩余¥980，需一次性领取或转卖满¥980的商品）'
                : '会员可任意选择金额领取或转卖，允许分多次用完当月额度' }}
            </div>
          </el-form-item>
        </el-form>
      </div>

      <el-alert
        title="购物消费返还的额度（比例/月数/是否可转卖）请在「消费返还额度配置」中按会员身份单独设置；这里的商品池对代理商等级的所有领货额度（入会礼包发放 + 消费返还）统一生效。"
        type="info"
        :closable="false"
        show-icon
        class="pool-tip"
      />

      <div class="sf-card pool-card" v-for="level in levelConfigs" :key="level.id">
        <div class="pool-header">
          <SfLevelTag :level="level.level" :name="level.levelName" />
          <span class="pool-hint">月度额度 ¥{{ level.monthlyCredit }}</span>
        </div>
        <el-select
          v-model="pools[level.level]"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          placeholder="选择该等级可用领货额度兑换的商品"
          style="width: 100%"
        >
          <el-option v-for="p in monthlyProducts" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </div>

      <el-empty v-if="!levelConfigs.length" description="请先在「等级权益配置」创建代理商等级" />
      <el-alert
        v-else-if="!monthlyProducts.length"
        title="暂无标记为“领货商品”的商品，请先在「商品管理」中为商品勾选该标签"
        type="warning"
        :closable="false"
        show-icon
        style="margin-top: 4px"
      />
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
/** 每个等级已选的商品池（key: level） */
const pools = reactive<Record<number, number[]>>({})
const saving = ref(false)

const form = reactive({
  startDay: 1,
  validType: 'month',
  validDays: 30,
  expirePolicy: 'void',
  claimMode: 'lump_sum',
})

const saveAll = async () => {
  saving.value = true
  try {
    const configs = await apiConfig.getSystemConfigs('credit')
    for (const config of configs) {
      if (config.configKey === 'credit.start_day') config.configValue = String(form.startDay)
      if (config.configKey === 'credit.expire_policy') config.configValue = form.expirePolicy
      if (config.configKey === 'credit.claim_mode') config.configValue = form.claimMode
      await apiConfig.saveSystemConfig(config)
    }
    for (const level of levelConfigs.value) {
      await apiConfig.saveCreditPool(level.level, pools[level.level] || [])
    }
    ElMessage.success('领货规则已保存')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const [products, levels, poolItems, sysConfigs] = await Promise.all([
    apiProduct.getList({ page: 1, pageSize: 100 }),
    apiConfig.getLevelConfigs(),
    apiConfig.getCreditPool(),
    apiConfig.getSystemConfigs('credit'),
  ])
  monthlyProducts.value = products.list.filter(p => p.isMonthlyProduct)
  levelConfigs.value = [...levels].sort((a, b) => a.levelSort - b.levelSort)
  levelConfigs.value.forEach(l => { pools[l.level] = [] })
  poolItems.forEach(item => {
    if (!pools[item.level]) pools[item.level] = []
    pools[item.level].push(item.spuId)
  })

  const startDayCfg = sysConfigs.find(c => c.configKey === 'credit.start_day')
  const expireCfg = sysConfigs.find(c => c.configKey === 'credit.expire_policy')
  const claimModeCfg = sysConfigs.find(c => c.configKey === 'credit.claim_mode')
  if (startDayCfg) form.startDay = Number(startDayCfg.configValue) || 1
  if (expireCfg) form.expirePolicy = expireCfg.configValue || 'void'
  if (claimModeCfg) form.claimMode = claimModeCfg.configValue || 'lump_sum'
})
</script>

<style scoped>
.pool-tip {
  margin: 16px 0;
}
.pool-card {
  margin-bottom: 16px;
}
.pool-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.pool-hint {
  font-size: 13px;
  color: #626A73;
}
.claim-mode-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
</style>
