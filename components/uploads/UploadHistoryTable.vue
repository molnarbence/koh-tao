<script setup lang="ts">
defineProps<{
  uploads: Array<{ id: string; originalFilename: string; status: string; createdAt: string }>
}>()

const badgeClass: Record<string, string> = {
  stored: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-800'
}
</script>

<template>
  <table v-if="uploads.length" class="w-full text-left text-sm">
    <thead>
      <tr class="border-b border-gray-200 text-gray-500">
        <th class="py-2 font-medium">Filename</th>
        <th class="py-2 font-medium">Status</th>
        <th class="py-2 font-medium">Uploaded</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="upload in uploads" :key="upload.id" class="border-b border-gray-100">
        <td class="py-2">{{ upload.originalFilename }}</td>
        <td class="py-2">
          <span class="rounded px-2 py-0.5 text-xs" :class="badgeClass[upload.status]">
            {{ upload.status }}
          </span>
        </td>
        <td class="py-2 text-gray-600">{{ new Date(upload.createdAt).toLocaleString() }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else class="text-sm text-gray-500">No uploads yet.</p>
</template>
