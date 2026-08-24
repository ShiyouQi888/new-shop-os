<template>
  <span
    :class="[
      showSymbol ? 'sf-price' : 'sf-price-num',
      { 'sf-price-large': size === 'large' },
    ]"
  >
    {{ formatted }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '@shop-os/shared'

const props = withDefaults(defineProps<{
  value: number | string
  size?: 'normal' | 'large'
  decimals?: number
  showSymbol?: boolean
}>(), {
  size: 'normal',
  decimals: 2,
  showSymbol: true,
})

const formatted = computed(() => formatNumber(props.value, props.decimals))
</script>

<style scoped>
.sf-price-num {
  color: #e54d42;
  font-weight: 600;
  white-space: nowrap;
  word-break: keep-all;
}
.sf-price-large {
  font-size: 22px;
  font-weight: 700;
}
</style>
