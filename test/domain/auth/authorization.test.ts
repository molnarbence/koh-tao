import { expect, test } from 'bun:test'
import { assertRole } from '../../../server/utils/authorization'

test('commercial managers cannot call re-run actions', () => {
  expect(() => assertRole(['commercial_manager'], ['administrator'])).toThrow('Forbidden')
})
