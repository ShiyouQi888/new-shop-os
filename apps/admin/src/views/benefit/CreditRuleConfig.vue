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
        </el-form>
      </div>

      <el-alert
        title="不同等级的会员可兑换的领货商品互相独立：先在「商品管理」为商品勾选“领货商品”标签，再在下方为每个等级挑选专属商品池。"
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
})

const saveAll = async () => {
  saving.value = true
  try {
    const configs = await apiConfig.getSystemConfigs('credit')
    for (const config of configs) {
      if (config.configKey === 'credit.start_day') config.configValue = String(form.startDay)
      if (config.configKey === 'credit.expire_policy') config.configValue = form.expirePolicy
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
  if (startDayCfg) form.startDay = Number(startDayCfg.configValue) || 1
  if (expireCfg) form.expirePolicy = expireCfg.configValue || 'void'
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
</style>
