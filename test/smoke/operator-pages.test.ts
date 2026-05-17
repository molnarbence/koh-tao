import { expect, test } from 'bun:test'

test('dashboard and ingestion detail pages exist', async () => {
  expect(await Bun.file('pages/index.vue').exists()).toBe(true)
  expect(await Bun.file('pages/ingestions/[ingestionId].vue').exists()).toBe(true)
})
