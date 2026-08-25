<template>
  <div class="sf-stat-card" :style="{ background: gradient }">
    <div class="sf-stat-icon">
      <el-icon :size="28">
        <component :is="icon" />
      </el-icon>
    </div>
    <div class="sf-stat-info">
      <div class="sf-stat-value">{{ displayValue }}</div>
      <div class="sf-stat-label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number | string
  label: string
  icon?: string
  color?: string
  prefix?: string
  suffix?: string
}>(), {
  icon: 'DataLine',
  color: '#FF6B35',
  prefix: '',
  suffix: '',
})

const gradient = computed(() => `linear-gradient(135deg, ${props.color}12 0%, #FFFFFF 100%)`)

const displayValue = computed(() => {
  const v = typeof props.value === 'number' ? props.value.toLocaleString('zh-CN') : props.value
  return `${props.prefix}${v}${props.suffix}`
})
</script>

<style scoped>
.sf-stat-card {
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #E7E9ED;
  box-shadow: 0 6px 18px rgba(17, 24, 39, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.sf-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(17, 24, 39, 0.08);
}
.sf-stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-primary);
  background: #FFF1EB;
}
.sf-stat-info {
  flex: 1;
  min-width: 0;
}
.sf-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #171A1F;
  line-height: 1.2;
}
.sf-stat-label {
  font-size: 13px;
  color: #626A73;
  margin-top: 4px;
}
</style>
