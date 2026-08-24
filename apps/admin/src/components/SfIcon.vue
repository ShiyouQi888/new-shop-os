<template>
  <el-icon :size="size" :color="color" :class="['sf-icon', { 'sf-icon-circle': circle }]">
    <component :is="iconComp" />
  </el-icon>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Folder } from '@element-plus/icons-vue'
import { SF_ICON_MAP } from './sf-icons'

const props = withDefaults(defineProps<{
  name?: string
  size?: number | string
  color?: string
  circle?: boolean
}>(), {
  name: 'folder',
  size: 16,
  color: '',
  circle: false,
})

const iconComp = computed(() => SF_ICON_MAP[props.name] || Folder)
</script>

<style scoped>
.sf-icon {
  flex-shrink: 0;
  vertical-align: -2px;
}
.sf-icon-circle {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #fef0ef;
  color: #e54d42;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
