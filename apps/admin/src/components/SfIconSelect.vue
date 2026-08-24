<template>
  <el-select :model-value="modelValue" :placeholder="placeholder" clearable filterable style="width: 100%" @update:model-value="onChange">
    <el-option v-for="opt in options" :key="opt.value" :label="opt.label" :value="opt.value">
      <span class="icon-option">
        <SfIcon :name="opt.value" />
        <span>{{ opt.label }}</span>
      </span>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import SfIcon from './SfIcon.vue'
import { SF_ICON_OPTIONS } from './sf-icons'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  /** 图标范围：'all' 全部 | 'file' 文件分组 | 'category' 商品分类 */
  scope?: 'all' | 'file' | 'category'
}>(), {
  modelValue: '',
  placeholder: '请选择图标',
  scope: 'all',
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

const SCOPES: Record<string, string[]> = {
  all: ['folder', 'folder-opened', 'picture', 'video', 'megaphone', 'gift', 'lipstick', 'nutrition', 'home', 'device', 'shopping', 'goods', 'wallet', 'coin', 'user', 'trend', 'star', 'discount', 'ship', 'bell', 'document', 'collection', 'setting'],
  file: ['folder', 'folder-opened', 'picture', 'video', 'megaphone', 'gift', 'document', 'collection', 'star'],
  category: ['lipstick', 'nutrition', 'home', 'device', 'gift', 'shopping', 'goods', 'wallet', 'coin', 'discount', 'star', 'bell', 'megaphone'],
}

const options = (SCOPES[props.scope] || SCOPES.all).map(v => SF_ICON_OPTIONS.find(o => o.value === v)!).filter(Boolean)

const onChange = (val: string) => {
  emit('update:modelValue', val || '')
}
</script>

<style scoped>
.icon-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
