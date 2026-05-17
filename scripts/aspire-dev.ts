import { $ } from 'bun'

await $`bun run prisma:generate`
await $`prisma db push`
await $`nuxt dev`
