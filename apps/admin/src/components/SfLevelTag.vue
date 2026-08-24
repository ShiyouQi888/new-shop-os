<template>
  <span class="sf-level-tag" :class="levelClass">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MemberLevel, MemberLevelLabels } from '@shop-os/shared'

const props = defineProps<{
  level: number
  /** 自定义等级名称（多等级场景优先展示） */
  name?: string
}>()

const label = computed(() => props.name || MemberLevelLabels[props.level as MemberLevel] || `Lv.${props.level}`)

// 多档等级色带：按 level 序号取模循环
const TONES = ['sf-level-gold', 'sf-level-silver', 'sf-level-bronze', 'sf-level-platinum', 'sf-level-diamond', 'sf-level-cyan']

const levelClass = computed(() => {
  if (props.level <= 0) return 'sf-level-normal'
  return TONES[(props.level - 1) % TONES.length]
})
</script>

<style scoped>
.sf-level-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.sf-level-gold {
  background: #fbf3e0;
  color: #d4a851;
  border: 1px solid #e8d4a0;
}
.sf-level-silver {
  background: #f2f2f2;
  color: #6a6a6a;
  border: 1px solid #d0d0d0;
}
.sf-level-bronze {
  background: #f6ece2;
  color: #b0743a;
  border: 1px solid #e2c9ab;
}
.sf-level-platinum {
  background: #eef3f8;
  color: #5b7c99;
  border: 1px solid #c3d3e2;
}
.sf-level-diamond {
  background: #ecf6fb;
  color: #2e7ea8;
  border: 1px solid #b5d9ec;
}
.sf-level-cyan {
  background: #e8f7f5;
  color: #178a7e;
  border: 1px solid #b3e0da;
}
.sf-level-normal {
  background: #f4f4f5;
  color: #909399;
}
</style>
