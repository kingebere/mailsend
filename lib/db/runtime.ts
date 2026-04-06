import {
  createClient,
  type Client as LibSQLClient,
  type InValue,
} from '@libsql/client'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import * as schema from './schema'

export type AnyDb =
  | ReturnType<typeof drizzleLibsql<typeof schema>>
  | ReturnType<typeof drizzleD1<typeof schema>>

type SqlArg = InValue

type DbAdapter = {
  kind: 'local' | 'd1'
  db: AnyDb
  all<T = Record<string, unknown>>(sql: string, args?: SqlArg[]): Promise<T[]>
  get<T = Record<string, unknown>>(sql: string, args?: SqlArg[]): Promise<T | null>
  run(sql: string, args?: SqlArg[]): Promise<void>
}

const globalCache = globalThis as typeof globalThis & {
  __mailerDbAdapter?: Promise<DbAdapter>
  __mailerLibsqlClient?: LibSQLClient
}

function getBoundD1(): D1Database | null {
  try {
    const { env } = getCloudflareContext()
    const db = env?.DB

    if (db && typeof db === 'object') {
      return db as D1Database
    }

    return null
  } catch {
    return null
  }
}

async function createLocalAdapter(): Promise<DbAdapter> {
  const url = process.env.LOCAL_DB_URL || 'file:./.data/mailer-local.db'
  const client = globalCache.__mailerLibsqlClient ?? createClient({ url })
  globalCache.__mailerLibsqlClient = client

  const db = drizzleLibsql(client, { schema })

  return {
    kind: 'local',
    db,
    async all<T>(sql: string, args: SqlArg[] = []) {
      const result = await client.execute({ sql, args })
      return (result.rows as T[]) ?? []
    },
    async get<T>(sql: string, args: SqlArg[] = []) {
      const result = await client.execute({ sql, args })
      return (result.rows?.[0] as T | undefined) ?? null
    },
    async run(sql: string, args: SqlArg[] = []) {
      await client.execute({ sql, args })
    },
  }
}

async function createD1Adapter(d1: D1Database): Promise<DbAdapter> {
  const db = drizzleD1(d1, { schema })

  return {
    kind: 'd1',
    db,
    async all<T>(sql: string, args: SqlArg[] = []) {
      const stmt = d1.prepare(sql).bind(...(args as unknown[]))
      const result = await stmt.all<T>()
      return result.results ?? []
    },
    async get<T>(sql: string, args: SqlArg[] = []) {
      const stmt = d1.prepare(sql).bind(...(args as unknown[]))
      const row = await stmt.first<T>()
      return row ?? null
    },
    async run(sql: string, args: SqlArg[] = []) {
      await d1.prepare(sql).bind(...(args as unknown[])).run()
    },
  }
}

async function createAdapter(): Promise<DbAdapter> {
  const d1 = getBoundD1()

  if (d1) {
    return createD1Adapter(d1)
  }

  return createLocalAdapter()
}

export async function getDbAdapter(): Promise<DbAdapter> {
  if (!globalCache.__mailerDbAdapter) {
    globalCache.__mailerDbAdapter = createAdapter()
  }

  return globalCache.__mailerDbAdapter
}