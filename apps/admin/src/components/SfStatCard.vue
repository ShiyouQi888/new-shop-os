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
  color: '#e54d42',
  prefix: '',
  suffix: '',
})

const gradient = computed(() => `linear-gradient(135deg, ${props.color}15 0%, ${props.color}05 100%)`)

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
  border: 1px solid #f0f0f0;
  transition: box-shadow 0.25s ease;
}
.sf-stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.sf-stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sf-stat-info {
  flex: 1;
  min-width: 0;
}
.sf-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}
.sf-stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
</style>
