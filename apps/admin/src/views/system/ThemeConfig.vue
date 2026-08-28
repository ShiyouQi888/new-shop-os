<template>
  <div class="sf-page">
    <SfPageContainer title="主题管理" description="配置商城前台的整体配色主题，选择后前台无需发版即可生效">
      <template #header>
        <el-button type="primary" :icon="Check" :loading="saving" @click="save">保存配置</el-button>
      </template>

      <el-alert
        title="选择一个主题后点击「保存配置」，商城前台下次加载页面时会自动应用新配色（按钮、价格、图标等跟随主题色）。"
        type="info" :closable="false" show-icon style="margin-bottom: 16px"
      />

      <div class="theme-grid">
        <div
          v-for="theme in SHOP_THEMES"
          :key="theme.id"
          class="theme-card"
          :class="{ active: selected === theme.id }"
          @click="selected = theme.id"
        >
          <div class="theme-preview" :style="{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})` }">
            <div class="preview-btn" :style="{ color: theme.primary }">立即购买</div>
          </div>
          <div class="theme-info">
            <span class="theme-name">{{ theme.name }}</span>
            <el-icon v-if="selected === theme.id" class="theme-check" :style="{ color: theme.primary }"><CircleCheckFilled /></el-icon>
          </div>
          <div class="theme-swatches">
            <span :style="{ background: theme.primary }" />
            <span :style="{ background: theme.primaryDark }" />
            <span :style="{ background: theme.primaryLight }" />
          </div>
        </div>
      </div>
    </SfPageContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Check, CircleCheckFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiConfig } from '@/api'
import { SHOP_THEMES, DEFAULT_SHOP_THEME } from '@shop-os/shared'
import SfPageContainer from '@/components/SfPageContainer.vue'

const selected = ref(DEFAULT_SHOP_THEME)
const saving = ref(false)

const save = async () => {
  saving.value = true
  try {
    const configs = await apiConfig.getSystemConfigs('basic')
    const themeConfig = configs.find(c => c.configKey === 'site.theme')
    if (themeConfig) {
      await apiConfig.saveSystemConfig({ ...themeConfig, configValue: selected.value })
    }
    ElMessage.success('主题已保存，商城前台下次加载页面时生效')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const configs = await apiConfig.getSystemConfigs('basic')
  const themeConfig = configs.find(c => c.configKey === 'site.theme')
  selected.value = themeConfig?.configValue || DEFAULT_SHOP_THEME
})
</script>

<style scoped>
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.theme-card {
  border: 2px solid #E7E9ED;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.theme-card:hover {
  border-color: #D6DAE0;
}
.theme-card.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}
.theme-preview {
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-btn {
  padding: 8px 20px;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  font-weight: 700;
}
.theme-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 4px;
}
.theme-name {
  font-size: 14px;
  font-weight: 700;
  color: #171A1F;
}
.theme-check {
  font-size: 18px;
}
.theme-swatches {
  display: flex;
  gap: 6px;
  padding: 6px 14px 14px;
}
.theme-swatches span {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
