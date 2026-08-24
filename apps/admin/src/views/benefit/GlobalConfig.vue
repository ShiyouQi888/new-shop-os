<template>
  <div class="sf-page">
    <SfPageContainer title="全局参数" description="系统级全局参数配置">
      <template #header>
        <el-button type="primary" :icon="Check" @click="saveAll">保存全部</el-button>
      </template>
      <div class="sf-card">
        <el-table :data="configs" border>
          <el-table-column label="配置键" prop="configKey" min-width="220" />
          <el-table-column label="说明" prop="description" min-width="260" show-overflow-tooltip />
          <el-table-column label="分组" prop="configGroup" min-width="100">
            <template #default="{ row }">
              <el-tag size="small" effect="light" :type="groupTag(row.configGroup)">{{ row.configGroup }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="配置值" min-width="200">
            <template #default="{ row }">
              <el-input v-model="row.configValue" style="width: 100%" />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiConfig } from '@/api'
import { type SystemConfig } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'

const configs = ref<SystemConfig[]>([])

const groupTag = (group: string) => {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = { credit: 'warning', resell: 'success', discount: 'info', withdraw: 'danger', commission: 'info' }
  return map[group] || 'info'
}

const saveAll = async () => {
  for (const config of configs.value) {
    await apiConfig.saveSystemConfig(config)
  }
  ElMessage.success('全局参数已保存')
}

onMounted(async () => {
  configs.value = await apiConfig.getSystemConfigs()
})
</script>
