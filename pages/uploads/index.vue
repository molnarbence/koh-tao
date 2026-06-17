<script setup lang="ts">
const { data: uploads } = await useFetch('/api/uploads', { default: () => [] })
</script>

<template>
  <div>
    <h1 class="mb-4 text-xl font-semibold">Upload history</h1>
    <UploadHistoryTable :uploads="uploads" />
  </div>
</template>
