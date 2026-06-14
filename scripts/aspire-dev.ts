import { $ } from 'bun'

await $`bun run prisma:generate`
await $`bunx prisma db push`

// Bun's S3 client cannot create buckets; provision the LocalStack bucket here.
// Idempotent path-style PUT — only when an S3 endpoint is configured (dev/LocalStack).
const endpoint = process.env.NUXT_S3_ENDPOINT
const bucket = process.env.NUXT_S3_BUCKET
if (endpoint && bucket) {
  await fetch(`${endpoint}/${bucket}`, { method: 'PUT' }).catch(() => {})
}

await $`nuxt dev`
