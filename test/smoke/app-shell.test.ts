import { expect, test } from 'bun:test'

test('app shell exports a Nuxt root component file', async () => {
  const file = Bun.file('app.vue')
  expect(await file.exists()).toBe(true)
})
