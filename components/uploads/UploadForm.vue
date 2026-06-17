<script setup lang="ts">
const file = ref<File | null>(null)
const submitting = ref(false)
const result = ref<{ ok: boolean; message: string } | null>(null)

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] ?? null
  result.value = null
}

async function submit() {
  if (!file.value) return
  submitting.value = true
  result.value = null

  const form = new FormData()
  form.append('file', file.value)

  try {
    const response = await $fetch<{ originalFilename: string; status: string }>('/api/uploads', {
      method: 'POST',
      body: form
    })
    result.value = { ok: true, message: `Uploaded ${response.originalFilename} (${response.status})` }
  } catch {
    result.value = { ok: false, message: 'Upload failed. Please try again.' }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <input type="file" class="block text-sm" @change="onFileChange" />
    <button
      type="submit"
      :disabled="!file || submitting"
      class="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
    >
      {{ submitting ? 'Uploading…' : 'Upload' }}
    </button>
    <p v-if="result" :class="result.ok ? 'text-green-600' : 'text-red-600'" class="text-sm">
      {{ result.message }}
    </p>
  </form>
</template>
