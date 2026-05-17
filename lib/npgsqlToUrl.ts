export function npgsqlToUrl(connectionString: string): string {
  const params: Record<string, string> = {}

  for (const segment of connectionString.split(';')) {
    const eq = segment.indexOf('=')
    if (eq === -1) continue
    const key = segment.slice(0, eq).trim().toLowerCase()
    const value = segment.slice(eq + 1).trim()
    params[key] = value
  }

  const host = params['host'] ?? 'localhost'
  const port = params['port'] ?? '5432'
  const database = params['database'] ?? ''
  const username = params['username'] ?? 'postgres'
  const password = encodeURIComponent(params['password'] ?? '')

  return `postgresql://${username}:${password}@${host}:${port}/${database}`
}
