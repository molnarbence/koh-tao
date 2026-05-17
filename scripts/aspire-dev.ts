import { $ } from 'bun'

await $`bun run prisma:generate`
await $`prisma migrate deploy`
await $`nuxt dev`
