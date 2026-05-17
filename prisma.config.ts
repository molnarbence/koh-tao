import { defineConfig } from 'prisma/config'
import { npgsqlToUrl } from './lib/npgsqlToUrl'

function resolveDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const aspire = process.env['ConnectionStrings__koh-tao-dev']
  if (aspire) return npgsqlToUrl(aspire)

  return ''
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: resolveDbUrl()
  }
})
