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
              <SfFilePicker
                v-if="row.configKey === 'site.logo' || row.configKey === 'site.icon'"
                v-model="row.configValue"
                accept="image"
                :placeholder="row.configKey === 'site.icon' ? '上传图标' : '上传Logo'"
              />
              <div v-else-if="row.configKey === 'site.app_icon'" class="launcher-icon-picker">
                <button
                  v-for="option in launcherIconOptions"
                  :key="option.value"
                  type="button"
                  class="launcher-icon-option"
                  :class="{ selected: row.configValue === option.value }"
                  :aria-pressed="row.configValue === option.value"
                  @click="row.configValue = option.value"
                >
                  <img :src="option.preview" :alt="option.label" />
                  <span>{{ option.label }}</span>
                </button>
                <span class="launcher-icon-tip">已内置于 APP；iOS 切换时由系统提示确认</span>
              </div>
              <el-input v-else v-model="row.configValue" style="width: 100%" />
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
import SfFilePicker from '@/components/SfFilePicker.vue'

const configs = ref<SystemConfig[]>([])
const launcherIconOptions = [
  { value: 'orange', label: '橙选标准', preview: '/launcher-icons/orange.png' },
  { value: 'cream', label: '暖白质感', preview: '/launcher-icons/cream.png' },
  { value: 'night', label: '深色典藏', preview: '/launcher-icons/night.png' },
]

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

<style scoped>
.launcher-icon-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.launcher-icon-option {
  display: grid;
  justify-items: center;
  gap: 5px;
  min-width: 82px;
  padding: 7px 8px;
  color: var(--el-text-color-regular);
  background: #fff;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease;
}

.launcher-icon-option:hover,
.launcher-icon-option.selected {
  border-color: var(--el-color-primary);
}

.launcher-icon-option.selected {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
}

.launcher-icon-option img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 12px;
}

.launcher-icon-option span {
  font-size: 12px;
  white-space: nowrap;
}

.launcher-icon-tip {
  flex-basis: 100%;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
