import { expect, test } from 'bun:test'
import { npgsqlToUrl } from '../../../lib/npgsqlToUrl'

test('npgsqlToUrl converts standard Npgsql string to postgresql URL', () => {
  const input = 'Host=localhost;Port=5432;Database=koh-tao-dev;Username=postgres;Password=secret'
  expect(npgsqlToUrl(input)).toBe('postgresql://postgres:secret@localhost:5432/koh-tao-dev')
})

test('npgsqlToUrl URL-encodes special characters in the password', () => {
  const input = 'Host=db;Port=5432;Database=mydb;Username=user;Password=p@ss=word'
  const url = npgsqlToUrl(input)
  expect(url).toContain('p%40ss%3Dword')
})

test('npgsqlToUrl is case-insensitive for key names', () => {
  const input = 'HOST=localhost;PORT=5432;DATABASE=testdb;USERNAME=admin;PASSWORD=pw'
  expect(npgsqlToUrl(input)).toBe('postgresql://admin:pw@localhost:5432/testdb')
})
