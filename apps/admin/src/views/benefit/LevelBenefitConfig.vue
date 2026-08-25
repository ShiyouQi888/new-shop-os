<template>
  <div class="sf-page">
    <SfPageContainer title="等级权益配置" description="维护代理商等级体系：等级身份、入门金额、折扣、领货额度等权益，可自由新增与删除等级">
      <template #header>
        <el-button :icon="Plus" @click="openCreate">新增等级</el-button>
        <el-button type="primary" :icon="Check" @click="saveAll">保存全部</el-button>
      </template>

      <el-alert type="info" :closable="false" class="level-tip" show-icon>
        <template #title>
          <div class="level-tip-title">
            <el-icon><Medal /></el-icon>
            <span>多等级代理商体系</span>
          </div>
        </template>
        <div class="level-tip-desc">
          每个等级对应一种代理商身份，独立配置入门金额、商城折扣、月度领货额度与转卖费率。等级按排序值升序展示，新增等级自动分配档位号。
        </div>
      </el-alert>

      <div
        class="sf-card level-card"
        v-for="config in sortedConfigs"
        :key="config.id"
        :class="`tone-${config.level}`"
      >
        <div class="level-header">
          <SfLevelTag :level="config.level" :name="config.levelName" />
          <el-input
            v-model="config.levelName"
            placeholder="等级身份名称"
            maxlength="12"
            class="level-name-input"
            size="default"
          />
          <el-tooltip content="展示排序，越小越靠前" placement="top">
            <el-input-number v-model="config.levelSort" :min="1" :max="999" :controls="false" size="small" class="level-sort-input" />
          </el-tooltip>
          <span class="level-tag-level">Lv.{{ config.level }}</span>
          <el-button
            link
            type="danger"
            :icon="Delete"
            :disabled="sortedConfigs.length <= 1"
            class="level-delete"
            @click="removeLevel(config)"
          >
            删除
          </el-button>
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

      <el-empty v-if="!sortedConfigs.length" description="暂无等级，点击右上角「新增等级」创建" />
    </SfPageContainer>

    <!-- 新增等级弹窗 -->
    <el-dialog v-model="createVisible" title="新增代理商等级" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="createForm" :rules="rules" label-width="120px">
        <el-form-item label="等级身份名称" prop="levelName">
          <el-input v-model="createForm.levelName" placeholder="如：铂金代理商" maxlength="12" show-word-limit />
          <div class="form-tip">该身份将展示在会员等级、礼包关联等级等处</div>
        </el-form-item>
        <el-form-item label="展示排序" prop="levelSort">
          <el-input-number v-model="createForm.levelSort" :min="1" :max="999" style="width: 160px" />
          <div class="form-tip">数字越小越靠前</div>
        </el-form-item>
        <el-divider content-position="left">权益配置</el-divider>
        <el-form-item label="入门金额">
          <el-input-number v-model="createForm.entryAmount" :min="0" :step="100" style="width: 100%">
            <template #prefix>¥</template>
          </el-input-number>
        </el-form-item>
        <el-form-item label="商城折扣率">
          <el-input-number v-model="createForm.shopDiscount" :min="1" :max="100" :step="5" style="width: 100%">
            <template #suffix>%</template>
          </el-input-number>
        </el-form-item>
        <el-form-item label="月度领货额度">
          <el-input-number v-model="createForm.monthlyCredit" :min="0" :step="50" style="width: 100%">
            <template #prefix>¥</template>
          </el-input-number>
        </el-form-item>
        <el-form-item label="领货月数">
          <el-input-number v-model="createForm.creditMonths" :min="1" :max="24" style="width: 100%" />
        </el-form-item>
        <el-form-item label="转卖服务费率">
          <el-input-number v-model="createForm.resellFeeRate" :min="0" :max="100" :step="5" :precision="2" style="width: 100%">
            <template #suffix>%</template>
          </el-input-number>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createLevel">创建等级</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, type Component } from 'vue'
import { Check, Plus, Delete, Medal } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { apiConfig } from '@/api'
import { type LevelBenefitConfig, ProductStatus } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'
import SfLevelTag from '@/components/SfLevelTag.vue'

const configs = ref<LevelBenefitConfig[]>([])

const sortedConfigs = computed(() => [...configs.value].sort((a, b) => a.levelSort - b.levelSort))

// ===== 新增等级 =====
const createVisible = ref(false)
const creating = ref(false)
const formRef = ref<FormInstance>()
const createForm = reactive({
  levelName: '',
  levelSort: 1,
  entryAmount: 0,
  shopDiscount: 90,
  monthlyCredit: 0,
  creditMonths: 10,
  resellFeeRate: 20,
})
const rules: FormRules = {
  levelName: [{ required: true, message: '请输入等级身份名称', trigger: 'blur' }],
  levelSort: [{ required: true, message: '请输入展示排序', trigger: 'blur' }],
}

const openCreate = () => {
  Object.assign(createForm, {
    levelName: '',
    levelSort: Math.max(0, ...configs.value.map(c => c.levelSort)) + 1,
    entryAmount: 0,
    shopDiscount: 90,
    monthlyCredit: 0,
    creditMonths: 10,
    resellFeeRate: 20,
  })
  createVisible.value = true
}

const createLevel = async () => {
  await formRef.value?.validate()
  creating.value = true
  try {
    // 等级档位号自动分配：取当前最大档位 + 1
    const nextLevel = Math.max(0, ...configs.value.map(c => c.level)) + 1
    const created = await apiConfig.createLevelConfig({
      level: nextLevel,
      levelName: createForm.levelName.trim(),
      levelSort: createForm.levelSort,
      entryAmount: createForm.entryAmount,
      shopDiscount: createForm.shopDiscount,
      monthlyCredit: createForm.monthlyCredit,
      creditMonths: createForm.creditMonths,
      resellFeeRate: createForm.resellFeeRate,
      status: ProductStatus.OnSale,
    })
    configs.value.push(created)
    createVisible.value = false
    ElMessage.success(`等级「${created.levelName}」已创建`)
  } finally {
    creating.value = false
  }
}

// ===== 删除等级 =====
const removeLevel = async (config: LevelBenefitConfig) => {
  try {
    await ElMessageBox.confirm(
      `确认删除等级「${config.levelName}」？删除后该等级的权益配置将不再生效，关联该等级的大礼包将显示为未关联等级。`,
      '删除等级',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch { return }
  await apiConfig.removeLevelConfig(config.id)
  configs.value = configs.value.filter(c => c.id !== config.id)
  ElMessage.success('等级已删除')
}

// ===== 保存 =====
const saveAll = async () => {
  const pending = sortedConfigs.value
  if (!pending.length) { ElMessage.warning('暂无等级配置'); return }
  for (const config of pending) {
    if (!config.levelName.trim()) { ElMessage.warning('请为所有等级填写身份名称'); return }
  }
  for (const config of pending) {
    await apiConfig.saveLevelConfig({ ...config, levelName: config.levelName.trim() })
  }
  ElMessage.success('等级权益配置已保存')
}

onMounted(async () => {
  configs.value = await apiConfig.getLevelConfigs()
})
</script>

<style scoped>
.level-tip {
  margin-bottom: 16px;
  align-items: flex-start;
}
.level-tip-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}
.level-tip-desc {
  font-size: 13px;
  line-height: 1.8;
  color: #626A73;
  margin-top: 2px;
}

.level-card {
  margin-bottom: 20px;
  border-left-width: 4px;
}
.tone-1 { border-left-color: #9AA1AA; }
.tone-2 { border-left-color: #FF6B35; }
.tone-3 { border-left-color: #E85222; }
.tone-4 { border-left-color: #626A73; }
.tone-5 { border-left-color: #18A66A; }
.tone-6 { border-left-color: #626A73; }
.tone-7 { border-left-color: #E5484D; }
.tone-8 { border-left-color: #626A73; }

.level-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.level-name-input {
  width: 180px;
}
.level-sort-input {
  width: 90px;
}
.level-tag-level {
  font-size: 12px;
  color: #9AA1AA;
  font-weight: 600;
}
.level-delete {
  margin-left: auto;
}
.form-tip {
  font-size: 12px;
  color: #626A73;
  line-height: 1.6;
  margin-top: 2px;
  width: 100%;
}
</style>
