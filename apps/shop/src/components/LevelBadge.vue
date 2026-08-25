<template>
  <span class="level-badge" :class="levelClass">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { getLevelName, ensureLevelMap } from '@/utils/level'

const props = defineProps<{
  level: number
  /** 自定义等级名称（优先展示；未传时自动从等级配置映射） */
  name?: string
}>()

const label = computed(() => props.name || getLevelName(props.level) || `Lv.${props.level}`)

const levelClass = computed(() => {
  switch (props.level) {
    case 2: return 'badge-gold'
    case 1: return 'badge-silver'
    default: return 'badge-normal'
  }
})

onMounted(() => {
  ensureLevelMap()
})
</script>

<style scoped>
.level-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.4;
}
.badge-gold {
  background: rgba(255, 107, 53, .14);
  color: var(--color-gold);
  border: 1px solid rgba(255, 107, 53, .2);
}
.badge-silver {
  background: rgba(21, 31, 46, .08);
  color: var(--color-ink);
  border: 1px solid rgba(21, 31, 46, .1);
}
.badge-normal {
  background: var(--color-surface);
  color: var(--color-muted);
  border: 1px solid var(--color-border);
}
</style>
