// app/api/templates/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, ok, err } from '@/lib/api-helpers'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
})

export const GET = withAuth(async (req, { userId }) => {
  const templates = await prisma.template.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })
  return ok(templates)
})

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)
  const template = await prisma.template.create({ data: { ...parsed.data, userId } })
  return ok(template, 201)
})
