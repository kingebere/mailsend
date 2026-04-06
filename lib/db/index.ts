import { getDbAdapter, type SqlArg } from './runtime'

function makeId() {
  return `id_${crypto.randomUUID().replace(/-/g, '')}`
}

function nowIso() {
  return new Date().toISOString()
}

const DATE_KEYS = new Set([
  'createdAt',
  'updatedAt',
  'sentAt',
  'scheduledAt',
  'lastUsed',
  'expiresAt',
])

function toSqlArg(value: unknown): SqlArg {
  if (value === undefined || value === null) return null

  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'bigint') {
    return Number(value) // or value.toString() if you want safety
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    value instanceof ArrayBuffer ||
    value instanceof Uint8Array
  ) {
    return value
  }

  if (typeof value === 'boolean') return value ? 1 : 0

  return JSON.stringify(value)
}

function toSqlArgs(values: unknown[] = []): SqlArg[] {
  return values.map(toSqlArg)
}

function normalizeRow<T>(row: T): T {
  if (!row || typeof row !== 'object') return row
  if (Array.isArray(row)) return row.map((item) => normalizeRow(item)) as T

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    if (value == null) {
      out[key] = value
    } else if (DATE_KEYS.has(key) && typeof value === 'string') {
      out[key] = new Date(value)
    } else if (typeof value === 'object') {
      out[key] = normalizeRow(value)
    } else {
      out[key] = value
    }
  }
  return out as T
}

function likeValue(value: string) {
  return `%${value}%`
}

function applySelect<T extends Record<string, unknown>>(
  row: T,
  select?: Record<string, boolean>
) {
  if (!select) return row
  const picked: Record<string, unknown> = {}
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) picked[key] = row[key]
  }
  return picked
}

async function fetchUserByIdOrEmail(
  where: Record<string, unknown>,
  select?: Record<string, boolean>
) {
  const adapter = await getDbAdapter()
  let sql = 'SELECT * FROM "User" WHERE '
  const args: SqlArg[] = []

  if (where.id) {
    sql += 'id = ?'
    args.push(toSqlArg(where.id))
  } else if (where.email) {
    sql += 'email = ?'
    args.push(toSqlArg(where.email))
  } else {
    return null
  }

  const row = await adapter.get<Record<string, unknown>>(sql, args)
  if (!row) return null
  return applySelect(normalizeRow(row), select)
}

function buildContactWhere(
  where: Record<string, unknown> = {},
  opts?: { alias?: string }
) {
  const alias = opts?.alias ?? 'c'
  const clauses: string[] = []
  const args: SqlArg[] = []

  if (where.id) {
    clauses.push(`${alias}.id = ?`)
    args.push(toSqlArg(where.id))
  }
  if (where.userId) {
    clauses.push(`${alias}.userId = ?`)
    args.push(toSqlArg(where.userId))
  }
  if (where.email && typeof where.email === 'string') {
    clauses.push(`${alias}.email = ?`)
    args.push(where.email)
  }
  if (where.status && typeof where.status === 'string') {
    clauses.push(`${alias}.status = ?`)
    args.push(where.status)
  }
  if (where.OR && Array.isArray(where.OR)) {
    const orParts: string[] = []
    for (const item of where.OR as Record<string, unknown>[]) {
      if (
        item.email &&
        typeof item.email === 'object' &&
        (item.email as Record<string, unknown>).contains
      ) {
        orParts.push(`${alias}.email LIKE ?`)
        args.push(
          likeValue(String((item.email as Record<string, unknown>).contains))
        )
      }
      if (
        item.firstName &&
        typeof item.firstName === 'object' &&
        (item.firstName as Record<string, unknown>).contains
      ) {
        orParts.push(`${alias}.firstName LIKE ?`)
        args.push(
          likeValue(
            String((item.firstName as Record<string, unknown>).contains)
          )
        )
      }
      if (
        item.lastName &&
        typeof item.lastName === 'object' &&
        (item.lastName as Record<string, unknown>).contains
      ) {
        orParts.push(`${alias}.lastName LIKE ?`)
        args.push(
          likeValue(String((item.lastName as Record<string, unknown>).contains))
        )
      }
    }
    if (orParts.length) clauses.push(`(${orParts.join(' OR ')})`)
  }
  if (where.groupMembers && typeof where.groupMembers === 'object') {
    const gm = where.groupMembers as Record<string, unknown>
    const some = gm.some as Record<string, unknown> | undefined
    if (some?.groupId) {
      clauses.push(
        `EXISTS (SELECT 1 FROM "GroupMember" gm WHERE gm.contactId = ${alias}.id AND gm.groupId = ?)`
      )
      args.push(toSqlArg(some.groupId))
    }
  }

  return { whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args }
}

function buildEventWhere(where: Record<string, unknown> = {}, alias = 'e') {
  const clauses: string[] = []
  const args: SqlArg[] = []

  if (where.type) {
    clauses.push(`${alias}.type = ?`)
    args.push(toSqlArg(where.type))
  }
  if (where.campaignId) {
    clauses.push(`${alias}.campaignId = ?`)
    args.push(toSqlArg(where.campaignId))
  }
  if (where.contactId) {
    clauses.push(`${alias}.contactId = ?`)
    args.push(toSqlArg(where.contactId))
  }
  if (
    where.createdAt &&
    typeof where.createdAt === 'object' &&
    (where.createdAt as Record<string, unknown>).gte
  ) {
    const value = (where.createdAt as Record<string, unknown>).gte
    clauses.push(`${alias}.createdAt >= ?`)
    args.push(toSqlArg(value instanceof Date ? value.toISOString() : value))
  }
  if (
    where.contact &&
    typeof where.contact === 'object' &&
    (where.contact as Record<string, unknown>).userId
  ) {
    clauses.push(
      `EXISTS (SELECT 1 FROM "Contact" c WHERE c.id = ${alias}.contactId AND c.userId = ?)`
    )
    args.push(
      toSqlArg((where.contact as Record<string, unknown>).userId)
    )
  }

  return { whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args }
}

function buildCampaignRecipientWhere(
  where: Record<string, unknown> = {},
  alias = 'cr'
) {
  const clauses: string[] = []
  const args: SqlArg[] = []

  if (where.id) {
    clauses.push(`${alias}.id = ?`)
    args.push(toSqlArg(where.id))
  }
  if (where.campaignId) {
    clauses.push(`${alias}.campaignId = ?`)
    args.push(toSqlArg(where.campaignId))
  }
  if (where.contactId) {
    clauses.push(`${alias}.contactId = ?`)
    args.push(toSqlArg(where.contactId))
  }
  if (where.status) {
    clauses.push(`${alias}.status = ?`)
    args.push(toSqlArg(where.status))
  }
  if (
    where.sentAt &&
    typeof where.sentAt === 'object' &&
    (where.sentAt as Record<string, unknown>).gte
  ) {
    const value = (where.sentAt as Record<string, unknown>).gte
    clauses.push(`${alias}.sentAt >= ?`)
    args.push(toSqlArg(value instanceof Date ? value.toISOString() : value))
  }
  if (
    where.campaign &&
    typeof where.campaign === 'object' &&
    (where.campaign as Record<string, unknown>).userId
  ) {
    clauses.push(
      `EXISTS (SELECT 1 FROM "Campaign" c WHERE c.id = ${alias}.campaignId AND c.userId = ?)`
    )
    args.push(
      toSqlArg((where.campaign as Record<string, unknown>).userId)
    )
  }

  return { whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args }
}

async function countBySql(sql: string, args: SqlArg[] = []) {
  const adapter = await getDbAdapter()
  const row = await adapter.get<{ count: number | string }>(sql, args)
  return Number(row?.count ?? 0)
}

async function withGroupCount(group: Record<string, unknown>) {
  const count = await countBySql(
    'SELECT COUNT(*) as count FROM "GroupMember" WHERE groupId = ?',
    [toSqlArg(group.id)]
  )
  return { ...normalizeRow(group), _count: { members: count } }
}

async function withCampaignCount(campaign: Record<string, unknown>) {
  const count = await countBySql(
    'SELECT COUNT(*) as count FROM "CampaignRecipient" WHERE campaignId = ?',
    [toSqlArg(campaign.id)]
  )
  return { ...normalizeRow(campaign), _count: { recipients: count } }
}

export const db: any = {
  user: {
    async findUnique({
      where,
      select,
    }: {
      where: Record<string, unknown>
      select?: Record<string, boolean>
    }) {
      return fetchUserByIdOrEmail(where, select)
    },

    async create({ data }: { data: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = {
        id: makeId(),
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name ?? null,
        createdAt: nowIso(),
        awsAccessKeyId: data.awsAccessKeyId ?? null,
        awsSecretAccessKey: data.awsSecretAccessKey ?? null,
        awsRegion: data.awsRegion ?? 'us-east-1',
        fromEmail: data.fromEmail ?? null,
        fromName: data.fromName ?? null,
      }

      await adapter.run(
        'INSERT INTO "User" (id, email, passwordHash, name, createdAt, awsAccessKeyId, awsSecretAccessKey, awsRegion, fromEmail, fromName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        toSqlArgs([
          row.id,
          row.email,
          row.passwordHash,
          row.name,
          row.createdAt,
          row.awsAccessKeyId,
          row.awsSecretAccessKey,
          row.awsRegion,
          row.fromEmail,
          row.fromName,
        ])
      )

      return normalizeRow(row)
    },

    async update({
      where,
      data,
    }: {
      where: Record<string, unknown>
      data: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const existing = await fetchUserByIdOrEmail(where)
      if (!existing) throw new Error('User not found')

      const merged = { ...existing, ...data }

      await adapter.run(
        'UPDATE "User" SET email = ?, passwordHash = ?, name = ?, awsAccessKeyId = ?, awsSecretAccessKey = ?, awsRegion = ?, fromEmail = ?, fromName = ? WHERE id = ?',
        toSqlArgs([
          merged.email,
          merged.passwordHash,
          merged.name ?? null,
          merged.awsAccessKeyId ?? null,
          merged.awsSecretAccessKey ?? null,
          merged.awsRegion ?? 'us-east-1',
          merged.fromEmail ?? null,
          merged.fromName ?? null,
          existing.id,
        ])
      )

      return normalizeRow(merged)
    },
  },

  contact: {
    async findUnique({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      let row: Record<string, unknown> | null = null

      if (where.id) {
        row = await adapter.get('SELECT * FROM "Contact" WHERE id = ?', [
          toSqlArg(where.id),
        ])
      } else if (where.email_userId && typeof where.email_userId === 'object') {
        const w = where.email_userId as Record<string, unknown>
        row = await adapter.get(
          'SELECT * FROM "Contact" WHERE email = ? AND userId = ?',
          toSqlArgs([w.email, w.userId])
        )
      }

      return row ? normalizeRow(row) : null
    },

    async findFirst({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const { whereSql, args } = buildContactWhere(where)
      const row = await adapter.get(
        `SELECT * FROM "Contact" c ${whereSql} LIMIT 1`,
        args
      )
      return row ? normalizeRow(row) : null
    },

    async findMany({
      where = {},
      include,
      select,
      orderBy,
      skip,
      take,
    }: {
      where?: Record<string, unknown>
      include?: Record<string, unknown>
      select?: Record<string, boolean>
      orderBy?: Record<string, 'asc' | 'desc'>
      skip?: number
      take?: number
    }) {
      const adapter = await getDbAdapter()
      const { whereSql, args } = buildContactWhere(where)
      const order = orderBy ? Object.entries(orderBy)[0] : ['createdAt', 'desc']
      const limitSql = typeof take === 'number' ? ` LIMIT ${take}` : ''
      const offsetSql =
        typeof skip === 'number' && skip > 0 ? ` OFFSET ${skip}` : ''

      const rows = await adapter.all<Record<string, unknown>>(
        `SELECT * FROM "Contact" c ${whereSql} ORDER BY c.${order[0]} ${String(
          order[1]
        ).toUpperCase()}${limitSql}${offsetSql}`,
        args
      )

      const normalized = rows.map((row) => normalizeRow(row))

      if (select) {
        return normalized.map((row) =>
          applySelect(row as Record<string, unknown>, select)
        )
      }

      if (include?.tags) {
        return Promise.all(
          normalized.map(async (row) => {
            const tags = await adapter.all<Record<string, unknown>>(
              'SELECT t.* FROM "ContactTag" ct JOIN "Tag" t ON t.id = ct.tagId WHERE ct.contactId = ?',
              [toSqlArg(row.id)]
            )
            return {
              ...row,
              tags: tags.map((tag) => ({
                contactId: row.id,
                tagId: tag.id,
                tag: normalizeRow(tag),
              })),
            }
          })
        )
      }

      return normalized
    },

    async count({ where = {} }: { where?: Record<string, unknown> }) {
      const { whereSql, args } = buildContactWhere(where)
      return countBySql(`SELECT COUNT(*) as count FROM "Contact" c ${whereSql}`, args)
    },

    async create({ data }: { data: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = {
        id: makeId(),
        email: String(data.email).toLowerCase(),
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        status: data.status ?? 'subscribed',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        userId: data.userId,
      }

      await adapter.run(
        'INSERT INTO "Contact" (id, email, firstName, lastName, status, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        toSqlArgs([
          row.id,
          row.email,
          row.firstName,
          row.lastName,
          row.status,
          row.createdAt,
          row.updatedAt,
          row.userId,
        ])
      )

      return normalizeRow(row)
    },

    async update({
      where,
      data,
    }: {
      where: Record<string, unknown>
      data: Record<string, unknown>
    }) {
      const existing = await db.contact.findUnique({ where })
      if (!existing) throw new Error('Contact not found')

      const adapter = await getDbAdapter()
      const merged = { ...existing, ...data, updatedAt: nowIso() }

      await adapter.run(
        'UPDATE "Contact" SET email = ?, firstName = ?, lastName = ?, status = ?, updatedAt = ?, userId = ? WHERE id = ?',
        toSqlArgs([
          merged.email,
          merged.firstName ?? null,
          merged.lastName ?? null,
          merged.status,
          merged.updatedAt,
          merged.userId,
          existing.id,
        ])
      )

      return normalizeRow(merged)
    },

    async updateMany({
      where,
      data,
    }: {
      where: Record<string, unknown>
      data: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const contacts = (await db.contact.findMany({
        where,
      })) as Record<string, unknown>[]

      for (const contact of contacts) {
        await adapter.run(
          'UPDATE "Contact" SET email = ?, firstName = ?, lastName = ?, status = ?, updatedAt = ?, userId = ? WHERE id = ?',
          toSqlArgs([
            contact.email,
            contact.firstName ?? null,
            contact.lastName ?? null,
            data.status ?? contact.status,
            nowIso(),
            contact.userId,
            contact.id,
          ])
        )
      }

      return { count: contacts.length }
    },

    async delete({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const existing = await db.contact.findUnique({ where })
      if (!existing) throw new Error('Contact not found')

      await adapter.run('DELETE FROM "ContactTag" WHERE contactId = ?', [
        toSqlArg(existing.id),
      ])
      await adapter.run('DELETE FROM "GroupMember" WHERE contactId = ?', [
        toSqlArg(existing.id),
      ])
      await adapter.run('DELETE FROM "CampaignRecipient" WHERE contactId = ?', [
        toSqlArg(existing.id),
      ])
      await adapter.run('DELETE FROM "EmailEvent" WHERE contactId = ?', [
        toSqlArg(existing.id),
      ])
      await adapter.run('DELETE FROM "Contact" WHERE id = ?', [
        toSqlArg(existing.id),
      ])

      return existing
    },

    async upsert({
      where,
      update,
      create,
    }: {
      where: Record<string, unknown>
      update: Record<string, unknown>
      create: Record<string, unknown>
    }) {
      const existing = await db.contact.findUnique({ where })
      if (existing) {
        return db.contact.update({ where: { id: existing.id }, data: update })
      }
      return db.contact.create({ data: create })
    },
  },

  tag: {
    async upsert({
      where,
      create,
    }: {
      where: Record<string, unknown>
      update: Record<string, unknown>
      create: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const compound = where.name_userId as Record<string, unknown>

      const existing = await adapter.get<Record<string, unknown>>(
        'SELECT * FROM "Tag" WHERE name = ? AND userId = ?',
        toSqlArgs([compound.name, compound.userId])
      )
      if (existing) return normalizeRow(existing)

      const row = { id: makeId(), name: create.name, userId: create.userId }
      await adapter.run(
        'INSERT INTO "Tag" (id, name, userId) VALUES (?, ?, ?)',
        toSqlArgs([row.id, row.name, row.userId])
      )
      return row
    },
  },

  contactTag: {
    async create({ data }: { data: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      await adapter.run(
        'INSERT INTO "ContactTag" (contactId, tagId) VALUES (?, ?)',
        toSqlArgs([data.contactId, data.tagId])
      )
      return data
    },

    async upsert({
      where,
      create,
    }: {
      where: Record<string, unknown>
      update: Record<string, unknown>
      create: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const key = where.contactId_tagId as Record<string, unknown>

      const existing = await adapter.get(
        'SELECT * FROM "ContactTag" WHERE contactId = ? AND tagId = ?',
        toSqlArgs([key.contactId, key.tagId])
      )
      if (existing) return existing

      await adapter.run(
        'INSERT INTO "ContactTag" (contactId, tagId) VALUES (?, ?)',
        toSqlArgs([create.contactId, create.tagId])
      )
      return create
    },
  },

  group: {
    async findUnique({
      where,
      include,
    }: {
      where: Record<string, unknown>
      include?: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      let row: Record<string, unknown> | null = null

      if (where.id) {
        row = await adapter.get('SELECT * FROM "Group" WHERE id = ?', [
          toSqlArg(where.id),
        ])
      }
      if (!row && where.name_userId && typeof where.name_userId === 'object') {
        const w = where.name_userId as Record<string, unknown>
        row = await adapter.get(
          'SELECT * FROM "Group" WHERE name = ? AND userId = ?',
          toSqlArgs([w.name, w.userId])
        )
      }

      if (!row) return null
      if (include?._count) return withGroupCount(row)
      return normalizeRow(row)
    },

    async findMany({
      where = {},
      include,
      orderBy,
    }: {
      where?: Record<string, unknown>
      include?: Record<string, unknown>
      orderBy?: Record<string, 'asc' | 'desc'>
    }) {
      const adapter = await getDbAdapter()
      const args: SqlArg[] = []
      const clauses: string[] = []

      if (where.userId) {
        clauses.push('userId = ?')
        args.push(toSqlArg(where.userId))
      }

      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const order = orderBy ? Object.entries(orderBy)[0] : ['createdAt', 'asc']

      const rows = await adapter.all<Record<string, unknown>>(
        `SELECT * FROM "Group" ${whereSql} ORDER BY ${order[0]} ${String(
          order[1]
        ).toUpperCase()}`,
        args
      )

      if (include?._count) return Promise.all(rows.map(withGroupCount))
      return rows.map((row) => normalizeRow(row))
    },

    async create({ data }: { data: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = {
        id: makeId(),
        name: data.name,
        description: data.description ?? null,
        createdAt: nowIso(),
        userId: data.userId,
      }

      await adapter.run(
        'INSERT INTO "Group" (id, name, description, createdAt, userId) VALUES (?, ?, ?, ?, ?)',
        toSqlArgs([row.id, row.name, row.description, row.createdAt, row.userId])
      )

      return normalizeRow(row)
    },

    async update({
      where,
      data,
    }: {
      where: Record<string, unknown>
      data: Record<string, unknown>
    }) {
      const existing = await db.group.findUnique({ where })
      if (!existing) throw new Error('Group not found')

      const adapter = await getDbAdapter()
      const merged = { ...existing, ...data }

      await adapter.run(
        'UPDATE "Group" SET name = ?, description = ?, userId = ? WHERE id = ?',
        toSqlArgs([
          merged.name,
          merged.description ?? null,
          merged.userId,
          existing.id,
        ])
      )

      return normalizeRow(merged)
    },

    async delete({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const existing = await db.group.findUnique({ where })
      if (!existing) throw new Error('Group not found')

      await adapter.run('DELETE FROM "GroupMember" WHERE groupId = ?', [
        toSqlArg(existing.id),
      ])
      await adapter.run('UPDATE "Campaign" SET groupId = NULL WHERE groupId = ?', [
        toSqlArg(existing.id),
      ])
      await adapter.run('DELETE FROM "Group" WHERE id = ?', [
        toSqlArg(existing.id),
      ])

      return existing
    },
  },

  groupMember: {
    async createMany({
      data,
    }: {
      data: Record<string, unknown>[]
      skipDuplicates?: boolean
    }) {
      const adapter = await getDbAdapter()
      let count = 0

      for (const item of data) {
        const existing = await adapter.get(
          'SELECT * FROM "GroupMember" WHERE groupId = ? AND contactId = ?',
          toSqlArgs([item.groupId, item.contactId])
        )
        if (!existing) {
          await adapter.run(
            'INSERT INTO "GroupMember" (groupId, contactId) VALUES (?, ?)',
            toSqlArgs([item.groupId, item.contactId])
          )
          count++
        }
      }

      return { count }
    },

    async delete({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const key = where.groupId_contactId as Record<string, unknown>

      await adapter.run(
        'DELETE FROM "GroupMember" WHERE groupId = ? AND contactId = ?',
        toSqlArgs([key.groupId, key.contactId])
      )
      return { ok: true }
    },

    async upsert({
      where,
      create,
    }: {
      where: Record<string, unknown>
      update: Record<string, unknown>
      create: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const key = where.groupId_contactId as Record<string, unknown>

      const existing = await adapter.get(
        'SELECT * FROM "GroupMember" WHERE groupId = ? AND contactId = ?',
        toSqlArgs([key.groupId, key.contactId])
      )
      if (existing) return existing

      await adapter.run(
        'INSERT INTO "GroupMember" (groupId, contactId) VALUES (?, ?)',
        toSqlArgs([create.groupId, create.contactId])
      )
      return create
    },
  },

  template: {
    async findMany({
      where = {},
      orderBy,
    }: {
      where?: Record<string, unknown>
      orderBy?: Record<string, 'asc' | 'desc'>
    }) {
      const adapter = await getDbAdapter()
      const args: SqlArg[] = []
      const clauses: string[] = []

      if (where.userId) {
        clauses.push('userId = ?')
        args.push(toSqlArg(where.userId))
      }

      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const order = orderBy ? Object.entries(orderBy)[0] : ['updatedAt', 'desc']

      const rows = await adapter.all<Record<string, unknown>>(
        `SELECT * FROM "Template" ${whereSql} ORDER BY ${order[0]} ${String(
          order[1]
        ).toUpperCase()}`,
        args
      )

      return rows.map((row) => normalizeRow(row))
    },

    async findUnique({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = await adapter.get<Record<string, unknown>>(
        'SELECT * FROM "Template" WHERE id = ?',
        [toSqlArg(where.id)]
      )
      return row ? normalizeRow(row) : null
    },

    async create({ data }: { data: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = {
        id: makeId(),
        name: data.name,
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody ?? null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        userId: data.userId,
      }

      await adapter.run(
        'INSERT INTO "Template" (id, name, subject, htmlBody, textBody, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        toSqlArgs([
          row.id,
          row.name,
          row.subject,
          row.htmlBody,
          row.textBody,
          row.createdAt,
          row.updatedAt,
          row.userId,
        ])
      )

      return normalizeRow(row)
    },

    async update({
      where,
      data,
    }: {
      where: Record<string, unknown>
      data: Record<string, unknown>
    }) {
      const existing = await db.template.findUnique({ where })
      if (!existing) throw new Error('Template not found')

      const adapter = await getDbAdapter()
      const merged = { ...existing, ...data, updatedAt: nowIso() }

      await adapter.run(
        'UPDATE "Template" SET name = ?, subject = ?, htmlBody = ?, textBody = ?, updatedAt = ?, userId = ? WHERE id = ?',
        toSqlArgs([
          merged.name,
          merged.subject,
          merged.htmlBody,
          merged.textBody ?? null,
          merged.updatedAt,
          merged.userId,
          existing.id,
        ])
      )

      return normalizeRow(merged)
    },

    async delete({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const existing = await db.template.findUnique({ where })
      if (!existing) throw new Error('Template not found')

      await adapter.run('UPDATE "Campaign" SET templateId = NULL WHERE templateId = ?', [
        toSqlArg(existing.id),
      ])
      await adapter.run('DELETE FROM "Template" WHERE id = ?', [
        toSqlArg(existing.id),
      ])

      return existing
    },
  },

  campaign: {
    async findUnique({
      where,
      include,
    }: {
      where: Record<string, unknown>
      include?: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const row = await adapter.get<Record<string, unknown>>(
        'SELECT * FROM "Campaign" WHERE id = ?',
        [toSqlArg(where.id)]
      )
      if (!row) return null

      let campaign: Record<string, unknown> = normalizeRow(row)

      if (include?.group && campaign.groupId) {
        const group = await adapter.get<Record<string, unknown>>(
          'SELECT id, name FROM "Group" WHERE id = ?',
          [toSqlArg(campaign.groupId)]
        )
        campaign.group = group ? normalizeRow(group) : null
      }

      if (include?._count) {
        const count = await countBySql(
          'SELECT COUNT(*) as count FROM "CampaignRecipient" WHERE campaignId = ?',
          [toSqlArg(campaign.id)]
        )
        campaign._count = { recipients: count }
      }

      if (include?.user) {
        campaign.user = await db.user.findUnique({
          where: { id: campaign.userId as string },
        })
      }

      if (include?.recipients) {
        const recInclude = include.recipients as Record<string, unknown>
        const clauses = ['campaignId = ?']
        const args: SqlArg[] = [toSqlArg(campaign.id)]

        if (
          recInclude.where &&
          typeof recInclude.where === 'object' &&
          (recInclude.where as Record<string, unknown>).status
        ) {
          clauses.push('status = ?')
          args.push(
            toSqlArg((recInclude.where as Record<string, unknown>).status)
          )
        }

        const rows = await adapter.all<Record<string, unknown>>(
          `SELECT * FROM "CampaignRecipient" WHERE ${clauses.join(' AND ')}`,
          args
        )

        const normalized = rows.map((r) => normalizeRow(r))
        campaign.recipients = await Promise.all(
          normalized.map(async (recipient) => {
            if (
              recInclude.include &&
              typeof recInclude.include === 'object' &&
              (recInclude.include as Record<string, unknown>).contact
            ) {
              return {
                ...recipient,
                contact: await db.contact.findUnique({
                  where: { id: recipient.contactId as string },
                }),
              }
            }
            return recipient
          })
        )
      }

      return campaign
    },

    async findMany({
      where = {},
      include,
      orderBy,
      take,
    }: {
      where?: Record<string, unknown>
      include?: Record<string, unknown>
      orderBy?: Record<string, 'asc' | 'desc'>
      take?: number
    }) {
      const adapter = await getDbAdapter()
      const clauses: string[] = []
      const args: SqlArg[] = []

      if (where.userId) {
        clauses.push('userId = ?')
        args.push(toSqlArg(where.userId))
      }
      if (where.status) {
        clauses.push('status = ?')
        args.push(toSqlArg(where.status))
      }

      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const order = orderBy ? Object.entries(orderBy)[0] : ['createdAt', 'desc']
      const limitSql = typeof take === 'number' ? ` LIMIT ${take}` : ''

      const rows = await adapter.all<Record<string, unknown>>(
        `SELECT * FROM "Campaign" ${whereSql} ORDER BY ${order[0]} ${String(
          order[1]
        ).toUpperCase()}${limitSql}`,
        args
      )

      return Promise.all(
        rows.map(async (row) => {
          let campaign: Record<string, unknown> = normalizeRow(row)

          if (include?.group) {
            if (campaign.groupId) {
              const group = await adapter.get<Record<string, unknown>>(
                'SELECT id, name FROM "Group" WHERE id = ?',
                [toSqlArg(campaign.groupId)]
              )
              campaign.group = group ? normalizeRow(group) : null
            } else {
              campaign.group = null
            }
          }

          if (include?._count) {
            const count = await countBySql(
              'SELECT COUNT(*) as count FROM "CampaignRecipient" WHERE campaignId = ?',
              [toSqlArg(campaign.id)]
            )
            campaign._count = { recipients: count }
          }

          return campaign
        })
      )
    },

    async create({ data }: { data: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = {
        id: makeId(),
        name: data.name,
        subject: data.subject,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        replyTo: data.replyTo ?? null,
        htmlBody: data.htmlBody,
        textBody: data.textBody ?? null,
        previewText: data.previewText ?? null,
        status: data.status ?? 'draft',
        scheduledAt:
          data.scheduledAt instanceof Date
            ? data.scheduledAt.toISOString()
            : data.scheduledAt ?? null,
        sentAt:
          data.sentAt instanceof Date
            ? data.sentAt.toISOString()
            : data.sentAt ?? null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        userId: data.userId,
        groupId: data.groupId ?? null,
        templateId: data.templateId ?? null,
      }

      await adapter.run(
        'INSERT INTO "Campaign" (id, name, subject, fromEmail, fromName, replyTo, htmlBody, textBody, previewText, status, scheduledAt, sentAt, createdAt, updatedAt, userId, groupId, templateId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        toSqlArgs([
          row.id,
          row.name,
          row.subject,
          row.fromEmail,
          row.fromName,
          row.replyTo,
          row.htmlBody,
          row.textBody,
          row.previewText,
          row.status,
          row.scheduledAt,
          row.sentAt,
          row.createdAt,
          row.updatedAt,
          row.userId,
          row.groupId,
          row.templateId,
        ])
      )

      return normalizeRow(row)
    },

    async update({
      where,
      data,
    }: {
      where: Record<string, unknown>
      data: Record<string, unknown>
    }) {
      const existing = await db.campaign.findUnique({ where })
      if (!existing) throw new Error('Campaign not found')

      const adapter = await getDbAdapter()
      const merged = {
        ...existing,
        ...data,
        updatedAt: nowIso(),
        scheduledAt:
          data.scheduledAt instanceof Date
            ? data.scheduledAt.toISOString()
            : data.scheduledAt ?? existing.scheduledAt,
        sentAt:
          data.sentAt instanceof Date
            ? data.sentAt.toISOString()
            : data.sentAt ?? existing.sentAt,
      }

      await adapter.run(
        'UPDATE "Campaign" SET name = ?, subject = ?, fromEmail = ?, fromName = ?, replyTo = ?, htmlBody = ?, textBody = ?, previewText = ?, status = ?, scheduledAt = ?, sentAt = ?, updatedAt = ?, userId = ?, groupId = ?, templateId = ? WHERE id = ?',
        toSqlArgs([
          merged.name,
          merged.subject,
          merged.fromEmail,
          merged.fromName,
          merged.replyTo ?? null,
          merged.htmlBody,
          merged.textBody ?? null,
          merged.previewText ?? null,
          merged.status,
          merged.scheduledAt
            ? new Date(merged.scheduledAt as string).toISOString()
            : null,
          merged.sentAt ? new Date(merged.sentAt as string).toISOString() : null,
          merged.updatedAt,
          merged.userId,
          merged.groupId ?? null,
          merged.templateId ?? null,
          existing.id,
        ])
      )

      return normalizeRow(merged)
    },

    async delete({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const existing = await db.campaign.findUnique({ where })
      if (!existing) throw new Error('Campaign not found')

      await adapter.run('DELETE FROM "CampaignRecipient" WHERE campaignId = ?', [
        toSqlArg(existing.id),
      ])
      await adapter.run('DELETE FROM "EmailEvent" WHERE campaignId = ?', [
        toSqlArg(existing.id),
      ])
      await adapter.run('DELETE FROM "Campaign" WHERE id = ?', [
        toSqlArg(existing.id),
      ])

      return existing
    },
  },

  campaignRecipient: {
    async count({ where = {} }: { where?: Record<string, unknown> }) {
      const { whereSql, args } = buildCampaignRecipientWhere(where)
      return countBySql(
        `SELECT COUNT(*) as count FROM "CampaignRecipient" cr ${whereSql}`,
        args
      )
    },

    async update({
      where,
      data,
    }: {
      where: Record<string, unknown>
      data: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const existing = await adapter.get<Record<string, unknown>>(
        'SELECT * FROM "CampaignRecipient" WHERE id = ?',
        [toSqlArg(where.id)]
      )
      if (!existing) throw new Error('CampaignRecipient not found')

      const merged = { ...normalizeRow(existing), ...data }

      await adapter.run(
        'UPDATE "CampaignRecipient" SET campaignId = ?, contactId = ?, messageId = ?, sentAt = ?, status = ? WHERE id = ?',
        toSqlArgs([
          merged.campaignId,
          merged.contactId,
          merged.messageId ?? null,
          merged.sentAt instanceof Date
            ? merged.sentAt.toISOString()
            : merged.sentAt ?? null,
          merged.status,
          where.id,
        ])
      )

      return normalizeRow(merged)
    },

    async upsert({
      where,
      create,
    }: {
      where: Record<string, unknown>
      update: Record<string, unknown>
      create: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const key = where.campaignId_contactId as Record<string, unknown>

      const existing = await adapter.get<Record<string, unknown>>(
        'SELECT * FROM "CampaignRecipient" WHERE campaignId = ? AND contactId = ?',
        toSqlArgs([key.campaignId, key.contactId])
      )
      if (existing) return normalizeRow(existing)

      const row = {
        id: makeId(),
        campaignId: create.campaignId,
        contactId: create.contactId,
        messageId: create.messageId ?? null,
        sentAt: create.sentAt ?? null,
        status: create.status ?? 'pending',
      }

      await adapter.run(
        'INSERT INTO "CampaignRecipient" (id, campaignId, contactId, messageId, sentAt, status) VALUES (?, ?, ?, ?, ?, ?)',
        toSqlArgs([
          row.id,
          row.campaignId,
          row.contactId,
          row.messageId,
          row.sentAt,
          row.status,
        ])
      )

      return normalizeRow(row)
    },
  },

  emailEvent: {
    async count({ where = {} }: { where?: Record<string, unknown> }) {
      const { whereSql, args } = buildEventWhere(where)
      return countBySql(`SELECT COUNT(*) as count FROM "EmailEvent" e ${whereSql}`, args)
    },

    async findMany({
      where = {},
      select,
    }: {
      where?: Record<string, unknown>
      select?: Record<string, boolean>
    }) {
      const adapter = await getDbAdapter()
      const { whereSql, args } = buildEventWhere(where)
      const rows = await adapter.all<Record<string, unknown>>(
        `SELECT * FROM "EmailEvent" e ${whereSql}`,
        args
      )
      const normalized = rows.map((row) => normalizeRow(row))
      if (select) {
        return normalized.map((row) =>
          applySelect(row as Record<string, unknown>, select)
        )
      }
      return normalized
    },

    async findFirst({ where = {} }: { where?: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const { whereSql, args } = buildEventWhere(where)
      const row = await adapter.get<Record<string, unknown>>(
        `SELECT * FROM "EmailEvent" e ${whereSql} LIMIT 1`,
        args
      )
      return row ? normalizeRow(row) : null
    },

    async create({ data }: { data: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = {
        id: makeId(),
        type: data.type,
        contactId: data.contactId ?? null,
        campaignId: data.campaignId ?? null,
        messageId: data.messageId ?? null,
        metadata: data.metadata ?? null,
        createdAt: nowIso(),
      }

      await adapter.run(
        'INSERT INTO "EmailEvent" (id, type, contactId, campaignId, messageId, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        toSqlArgs([
          row.id,
          row.type,
          row.contactId,
          row.campaignId,
          row.messageId,
          row.metadata,
          row.createdAt,
        ])
      )

      return normalizeRow(row)
    },
  },

  apiKey: {
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = await adapter.get<Record<string, unknown>>(
        'SELECT * FROM "ApiKey" WHERE keyPrefix = ? LIMIT 1',
        [toSqlArg(where.keyPrefix)]
      )
      return row ? normalizeRow(row) : null
    },

    async update({
      where,
      data,
    }: {
      where: Record<string, unknown>
      data: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const existing = await adapter.get<Record<string, unknown>>(
        'SELECT * FROM "ApiKey" WHERE id = ?',
        [toSqlArg(where.id)]
      )
      if (!existing) throw new Error('ApiKey not found')

      const merged = { ...normalizeRow(existing), ...data }

      await adapter.run(
        'UPDATE "ApiKey" SET name = ?, keyHash = ?, keyPrefix = ?, userId = ?, createdAt = ?, lastUsed = ?, expiresAt = ? WHERE id = ?',
        toSqlArgs([
          merged.name,
          merged.keyHash,
          merged.keyPrefix,
          merged.userId,
          merged.createdAt instanceof Date
            ? merged.createdAt.toISOString()
            : merged.createdAt,
          merged.lastUsed instanceof Date
            ? merged.lastUsed.toISOString()
            : merged.lastUsed ?? null,
          merged.expiresAt instanceof Date
            ? merged.expiresAt.toISOString()
            : merged.expiresAt ?? null,
          where.id,
        ])
      )

      return normalizeRow(merged)
    },

    async findMany({
      where = {},
      select,
      orderBy,
    }: {
      where?: Record<string, unknown>
      select?: Record<string, boolean>
      orderBy?: Record<string, 'asc' | 'desc'>
    }) {
      const adapter = await getDbAdapter()
      const clauses: string[] = []
      const args: SqlArg[] = []

      if (where.userId) {
        clauses.push('userId = ?')
        args.push(toSqlArg(where.userId))
      }

      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const order = orderBy ? Object.entries(orderBy)[0] : ['createdAt', 'desc']

      const rows = await adapter.all<Record<string, unknown>>(
        `SELECT * FROM "ApiKey" ${whereSql} ORDER BY ${order[0]} ${String(
          order[1]
        ).toUpperCase()}`,
        args
      )

      const normalized = rows.map((row) => normalizeRow(row))
      if (select) {
        return normalized.map((row) =>
          applySelect(row as Record<string, unknown>, select)
        )
      }
      return normalized
    },

    async findUnique({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = await adapter.get<Record<string, unknown>>(
        'SELECT * FROM "ApiKey" WHERE id = ?',
        [toSqlArg(where.id)]
      )
      return row ? normalizeRow(row) : null
    },

    async create({ data }: { data: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = {
        id: makeId(),
        name: data.name,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        userId: data.userId,
        createdAt: nowIso(),
        lastUsed: data.lastUsed ?? null,
        expiresAt: data.expiresAt ?? null,
      }

      await adapter.run(
        'INSERT INTO "ApiKey" (id, name, keyHash, keyPrefix, userId, createdAt, lastUsed, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        toSqlArgs([
          row.id,
          row.name,
          row.keyHash,
          row.keyPrefix,
          row.userId,
          row.createdAt,
          row.lastUsed,
          row.expiresAt,
        ])
      )

      return normalizeRow(row)
    },

    async delete({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const existing = await db.apiKey.findUnique({ where })
      if (!existing) throw new Error('ApiKey not found')

      await adapter.run('DELETE FROM "ApiKey" WHERE id = ?', [
        toSqlArg(where.id),
      ])
      return existing
    },
  },

  unsubscribeToken: {
    async findUnique({ where }: { where: Record<string, unknown> }) {
      const adapter = await getDbAdapter()
      const row = await adapter.get<Record<string, unknown>>(
        'SELECT * FROM "UnsubscribeToken" WHERE token = ?',
        [toSqlArg(where.token)]
      )
      return row ? normalizeRow(row) : null
    },

    async upsert({
      where,
      create,
    }: {
      where: Record<string, unknown>
      update: Record<string, unknown>
      create: Record<string, unknown>
    }) {
      const adapter = await getDbAdapter()
      const existing = await db.unsubscribeToken.findUnique({ where })
      if (existing) return existing

      const row = {
        id: makeId(),
        token: create.token,
        email: create.email,
        userId: create.userId,
        createdAt: nowIso(),
      }

      await adapter.run(
        'INSERT INTO "UnsubscribeToken" (id, token, email, userId, createdAt) VALUES (?, ?, ?, ?, ?)',
        toSqlArgs([row.id, row.token, row.email, row.userId, row.createdAt])
      )

      return normalizeRow(row)
    },
  },

  async $queryRaw<T = unknown[]>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T> {
    const sql = strings.reduce(
      (acc, str, i) => acc + str + (i < values.length ? '?' : ''),
      ''
    )
    const adapter = await getDbAdapter()
    const rows = await adapter.all(sql, toSqlArgs(values))
    return normalizeRow(rows) as T
  },
}

export default db