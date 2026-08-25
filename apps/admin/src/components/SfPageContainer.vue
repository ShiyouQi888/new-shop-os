<template>
  <div class="sf-page-container">
    <div v-if="title || $slots.header" class="sf-page-header">
      <div class="sf-page-header-left">
        <h2 v-if="title" class="sf-page-title">{{ title }}</h2>
        <p v-if="description" class="sf-page-desc">{{ description }}</p>
      </div>
      <div class="sf-page-header-right">
        <slot name="header" />
      </div>
    </div>
    <div class="sf-page-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<style scoped>
.sf-page-container {
  padding: 20px;
}
.sf-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}
.sf-page-title {
  font-size: 20px;
  font-weight: 600;
  color: #171A1F;
}
.sf-page-desc {
  font-size: 13px;
  color: #626A73;
  margin-top: 4px;
}
.sf-page-header-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
</style>
