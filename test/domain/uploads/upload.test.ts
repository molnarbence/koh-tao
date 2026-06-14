import { expect, test } from 'bun:test'
import { Upload } from '../../../server/domain/uploads/Upload'

test('new uploads start in pending', () => {
  const upload = Upload.create({ id: 'u_1', originalFilename: 'data.csv', objectKey: 'uploads/u_1/data.csv' })
  expect(upload.status).toBe('pending')
})

test('rejects an empty filename', () => {
  expect(() => Upload.create({ id: 'u_1', originalFilename: '   ', objectKey: 'k' })).toThrow('originalFilename')
})

test('markStored moves pending to stored', () => {
  const upload = Upload.create({ id: 'u_1', originalFilename: 'data.csv', objectKey: 'k' })
  upload.markStored()
  expect(upload.status).toBe('stored')
})

test('markFailed moves pending to failed', () => {
  const upload = Upload.create({ id: 'u_1', originalFilename: 'data.csv', objectKey: 'k' })
  upload.markFailed()
  expect(upload.status).toBe('failed')
})

test('cannot mark a stored upload as failed', () => {
  const upload = Upload.create({ id: 'u_1', originalFilename: 'data.csv', objectKey: 'k' })
  upload.markStored()
  expect(() => upload.markFailed()).toThrow('Invalid status transition')
})

test('rehydrate restores all fields without re-running invariants', () => {
  const createdAt = new Date('2026-06-14T10:00:00Z')
  const upload = Upload.rehydrate({ id: 'u_9', originalFilename: 'old.csv', objectKey: 'uploads/u_9/old.csv', status: 'stored', createdAt })
  expect(upload.id).toBe('u_9')
  expect(upload.status).toBe('stored')
  expect(upload.createdAt).toBe(createdAt)
})
