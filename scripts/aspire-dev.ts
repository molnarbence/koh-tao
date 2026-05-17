import { $ } from 'bun'

await $`bun run prisma:generate`
await $`prisma db push --skip-generate`
await $`nuxt dev`
