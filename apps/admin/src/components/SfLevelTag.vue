<template>
  <span class="sf-level-tag" :class="levelClass">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getLevelName } from '@/utils/level'

const props = defineProps<{
  level: number
  /** 自定义等级名称（优先展示；未传时自动从等级配置映射） */
  name?: string
}>()

const label = computed(() => props.name || getLevelName(props.level) || `Lv.${props.level}`)

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
  font-weight: 700;
  white-space: nowrap;
}
.sf-level-gold {
  background: #FFF1EB;
  color: #FF6B35;
  border: 1px solid #FFD5C5;
}
.sf-level-silver {
  background: #F8F9FB;
  color: #626A73;
  border: 1px solid #E7E9ED;
}
.sf-level-bronze {
  background: #FFF1EB;
  color: #E85222;
  border: 1px solid #FFD5C5;
}
.sf-level-platinum {
  background: #F8F9FB;
  color: #626A73;
  border: 1px solid #E7E9ED;
}
.sf-level-diamond {
  background: #FFF1EB;
  color: #FF6B35;
  border: 1px solid #FFD5C5;
}
.sf-level-cyan {
  background: #EAF8F2;
  color: #18A66A;
  border: 1px solid rgba(24, 166, 106, 0.22);
}
.sf-level-normal {
  background: #F8F9FB;
  color: #626A73;
  border: 1px solid #E7E9ED;
}
</style>
