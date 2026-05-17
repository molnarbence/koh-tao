import { expect, test } from 'bun:test'

test('prisma seed script exists', async () => {
  expect(await Bun.file('prisma/seed.ts').exists()).toBe(true)
})
