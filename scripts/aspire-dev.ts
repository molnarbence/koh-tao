import { $ } from 'bun'

await $`bun run prisma:generate`
await $`bunx prisma db push`

// Create the dev bucket in MinIO. Bun's S3 client cannot create buckets and MinIO
// rejects unsigned PUTs, so use the mc client bundled in the MinIO container. Aspire
// waits for the container, but MinIO may need a moment more to accept connections —
// retry alias+mb until it succeeds. Only runs when a bucket is configured (dev).
const bucket = process.env.NUXT_S3_BUCKET
if (bucket) {
  for (let attempt = 0; attempt < 15; attempt++) {
    await $`docker exec koh-tao-minio mc alias set local http://localhost:9000 minioadmin minioadmin`.nothrow().quiet()
    const created = await $`docker exec koh-tao-minio mc mb --ignore-existing local/${bucket}`.nothrow().quiet()
    if (created.exitCode === 0) break
    await Bun.sleep(1000)
  }
}

await $`nuxt dev`
