// app/api/contacts/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { parse } from 'csv-parse/sync'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const groupId = formData.get('groupId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  
  let records: Record<string, string>[]
  try {
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 })
  }

  if (!records.length) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 })

  // Detect column names (case-insensitive)
  const normalize = (row: Record<string, string>) => {
    const n: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) n[k.toLowerCase().replace(/\s/g, '_')] = v
    return n
  }

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const rawRow of records) {
    const row = normalize(rawRow)
    const email = row.email || row.email_address
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors++
      continue
    }

    try {
      const contact = await db.contact.upsert({
        where: { email_userId: { email: email.toLowerCase(), userId: session.userId } },
        update: {
          firstName: row.first_name || row.firstname || undefined,
          lastName: row.last_name || row.lastname || undefined,
        },
        create: {
          email: email.toLowerCase(),
          firstName: row.first_name || row.firstname || undefined,
          lastName: row.last_name || row.lastname || undefined,
          userId: session.userId,
        },
      })

      // Handle tags column (comma-separated)
      const tagsRaw = row.tags || row.tag || ''
      if (tagsRaw) {
        const tagNames = tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
        for (const tagName of tagNames) {
          const tag = await db.tag.upsert({
            where: { name_userId: { name: tagName, userId: session.userId } },
            update: {},
            create: { name: tagName, userId: session.userId },
          })
          await db.contactTag.upsert({
            where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
            update: {},
            create: { contactId: contact.id, tagId: tag.id },
          })
        }
      }

      // Add to group if specified
      if (groupId) {
        await db.groupMember.upsert({
          where: { groupId_contactId: { groupId, contactId: contact.id } },
          update: {},
          create: { groupId, contactId: contact.id },
        })
      }

      imported++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ imported, skipped, errors, total: records.length })
}
