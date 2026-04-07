// app/api/templates/[id]/route.ts
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, ok, err } from '@/lib/api-helpers'

export const GET = withAuth<{ id: string }>(
  async (_req: NextRequest, { userId, params }) => {
    const { id } = await params

    const template = await db.template.findUnique({
      where: { id },
    })

    if (!template || template.userId !== userId) {
      return err('Not found', 404)
    }

    return ok(template)
  }
)

export const PATCH = withAuth<{ id: string }>(
  async (req: NextRequest, { userId, params }) => {
    const { id } = await params

    const existing = await db.template.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== userId) {
      return err('Not found', 404)
    }

    const body = (await req.json()) as {
      name?: string
      subject?: string
      htmlBody?: string
      textBody?: string | null
    }

    const updated = await db.template.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.subject !== undefined ? { subject: body.subject } : {}),
        ...(body.htmlBody !== undefined ? { htmlBody: body.htmlBody } : {}),
        ...(body.textBody !== undefined ? { textBody: body.textBody } : {}),
      },
    })

    return ok(updated)
  }
)

export const DELETE = withAuth<{ id: string }>(
  async (_req: NextRequest, { userId, params }) => {
    const { id } = await params

    const existing = await db.template.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== userId) {
      return err('Not found', 404)
    }

    await db.template.delete({
      where: { id },
    })

    return ok({ ok: true })
  }
)