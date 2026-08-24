<template>
  <span class="sf-level-tag" :class="levelClass">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MemberLevel, MemberLevelLabels } from '@shop-os/shared'

const props = defineProps<{
  level: MemberLevel
}>()

const label = computed(() => MemberLevelLabels[props.level])

const levelClass = computed(() => {
  switch (props.level) {
    case MemberLevel.Gold:
      return 'sf-level-gold'
    case MemberLevel.Silver:
      return 'sf-level-silver'
    default:
      return 'sf-level-normal'
  }
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
.sf-level-normal {
  background: #f4f4f5;
  color: #909399;
}
</style>
