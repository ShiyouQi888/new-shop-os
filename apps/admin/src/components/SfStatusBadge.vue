<template>
  <el-tag :type="tagType" size="small" effect="light" round>
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}>()

const tagType = computed(() => props.type || 'info')
</script>
