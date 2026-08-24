<template>
  <span class="level-badge" :class="levelClass">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MemberLevel, MemberLevelLabels } from '@shop-os/shared'

const props = defineProps<{ level: MemberLevel }>()
const label = computed(() => MemberLevelLabels[props.level])
const levelClass = computed(() => {
  switch (props.level) {
    case MemberLevel.Gold: return 'badge-gold'
    case MemberLevel.Silver: return 'badge-silver'
    default: return 'badge-normal'
  }
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
  background: rgba(184, 138, 68, .14);
  color: var(--color-gold);
  border: 1px solid rgba(184, 138, 68, .2);
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
