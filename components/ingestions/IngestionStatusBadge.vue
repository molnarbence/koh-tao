<script setup lang="ts">
const props = defineProps<{ status: string }>()
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
    {{ props.status }}
  </span>
</template>
