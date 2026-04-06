import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import * as schema from './schema'

export type AnyDb = ReturnType<typeof drizzleD1<typeof schema>>

export type SqlArg =
  | string
  | number
  | null
  | ArrayBuffer
  | Uint8Array

type DbAdapter = {
  kind: 'd1'
  db: AnyDb
  all<T = Record<string, unknown>>(sql: string, args?: SqlArg[]): Promise<T[]>
  get<T = Record<string, unknown>>(sql: string, args?: SqlArg[]): Promise<T | null>
  run(sql: string, args?: SqlArg[]): Promise<void>
}

const globalCache = globalThis as typeof globalThis & {
  __mailerDbAdapter?: Promise<DbAdapter>
}

function getBoundD1(): D1Database {
  const { env } = getCloudflareContext()
  const db = env?.DB

  if (db && typeof db === 'object') {
    return db as D1Database
  }

  throw new Error(
    'D1 binding "DB" is not available. Run through Cloudflare preview/deploy so the DB binding exists.'
  )
}

async function createD1Adapter(d1: D1Database): Promise<DbAdapter> {
  const db = drizzleD1(d1, { schema })

  return {
    kind: 'd1',
    db,
    async all<T>(sql: string, args: SqlArg[] = []) {
      const stmt = d1.prepare(sql).bind(...args)
      const result = await stmt.all<T>()
      return result.results ?? []
    },
    async get<T>(sql: string, args: SqlArg[] = []) {
      const stmt = d1.prepare(sql).bind(...args)
      const row = await stmt.first<T>()
      return row ?? null
    },
    async run(sql: string, args: SqlArg[] = []) {
      await d1.prepare(sql).bind(...args).run()
    },
  }
}

async function createAdapter(): Promise<DbAdapter> {
  return createD1Adapter(getBoundD1())
}

export async function getDbAdapter(): Promise<DbAdapter> {
  if (!globalCache.__mailerDbAdapter) {
    globalCache.__mailerDbAdapter = createAdapter()
  }

  return globalCache.__mailerDbAdapter
}