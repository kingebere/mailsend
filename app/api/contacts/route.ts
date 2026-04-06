// app/api/contacts/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'
import { z } from 'zod'

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const groupId = searchParams.get('groupId') || ''

  const where = {
    userId,
    ...(search && {
      OR: [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ],
    }),
    ...(status && { status }),
    ...(groupId && { groupMembers: { some: { groupId } } }),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ])

  return ok({ contacts, total, page, limit, pages: Math.ceil(total / limit) })
})

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { email, firstName, lastName, tags } = parsed.data

  const existing = await prisma.contact.findUnique({
    where: { email_userId: { email, userId } },
  })
  if (existing) return err('Contact with this email already exists', 409)

  const contact = await prisma.contact.create({
    data: {
      email,
      firstName,
      lastName,
      userId,
    },
  })

  // Handle tags
  if (tags?.length) {
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name_userId: { name: tagName, userId } },
        update: {},
        create: { name: tagName, userId },
      })
      await prisma.contactTag.create({
        data: { contactId: contact.id, tagId: tag.id },
      })
    }
  }

  return ok(contact, 201)
})
