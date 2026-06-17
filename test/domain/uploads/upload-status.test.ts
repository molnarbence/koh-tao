import { expect, test } from 'bun:test'
import { UPLOAD_STATUSES, assertTransition } from '../../../server/domain/uploads/UploadStatus'

test('exposes the three upload statuses', () => {
  expect(UPLOAD_STATUSES).toEqual(['pending', 'stored', 'failed'])
})

test('allows pending to stored and pending to failed', () => {
  expect(() => assertTransition('pending', 'stored')).not.toThrow()
  expect(() => assertTransition('pending', 'failed')).not.toThrow()
})

test('rejects transitions out of terminal states', () => {
  expect(() => assertTransition('stored', 'failed')).toThrow('Invalid status transition')
  expect(() => assertTransition('failed', 'stored')).toThrow('Invalid status transition')
  expect(() => assertTransition('pending', 'pending')).toThrow('Invalid status transition')
})
