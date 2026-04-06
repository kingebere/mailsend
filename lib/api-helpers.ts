// lib/api-helpers.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from './auth'
import { db } from './db'
import bcrypt from 'bcryptjs'

type RouteParams = Record<string, string>

type AuthenticatedContext<TParams extends RouteParams = {}> = {
  userId: string
  params: Promise<TParams>
}

export type ApiHandler<TParams extends RouteParams = {}> = (
  req: NextRequest,
  context: AuthenticatedContext<TParams>
) => Promise<NextResponse>

export function withAuth<TParams extends RouteParams = {}>(
  handler: ApiHandler<TParams>
) {
  return async (
    req: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    const session = await getSessionFromRequest(req)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      return await handler(req, {
        userId: session.userId,
        params: context.params,
      })
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err : new Error('Internal server error')

      console.error('[API Error]', error)

      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

export function withApiKeyAuth<TParams extends RouteParams = {}>(
  handler: ApiHandler<TParams>
) {
  return async (
    req: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    try {
      const session = await getSessionFromRequest(req)
      if (session) {
        return await handler(req, {
          userId: session.userId,
          params: context.params,
        })
      }

      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer sk_')) {
        const rawKey = authHeader.slice(7)
        const prefix = rawKey.slice(0, 8)

        const apiKey = await db.apiKey.findFirst({
          where: { keyPrefix: prefix },
        })

        if (apiKey && (await bcrypt.compare(rawKey, apiKey.keyHash))) {
          await db.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsed: new Date() },
          })

          return await handler(req, {
            userId: apiKey.userId,
            params: context.params,
          })
        }
      }

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err : new Error('Internal server error')

      console.error('[API Error]', error)

      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status })
}