// lib/api-helpers.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from './auth'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export type ApiHandler = (
  req: NextRequest,
  context: { userId: string; params?: Record<string, string> }
) => Promise<NextResponse>

// Wrap an API handler with auth — returns 401 if not authenticated
export function withAuth(handler: ApiHandler) {
  return async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      return await handler(req, { userId: session.userId, params: context?.params })
    } catch (err: unknown) {
      const error = err as Error
      console.error('[API Error]', error)
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Also support API key auth for developer access
export function withApiKeyAuth(handler: ApiHandler) {
  return async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    // Try JWT first
    const session = await getSessionFromRequest(req)
    if (session) {
      return handler(req, { userId: session.userId, params: context?.params })
    }

    // Try API key
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer sk_')) {
      const rawKey = authHeader.slice(7)
      const keyHash = await bcrypt.hash(rawKey, 10) // NOT how we check — see below
      
      // Find by prefix and verify hash
      const prefix = rawKey.slice(0, 8)
      const apiKey = await prisma.apiKey.findFirst({ where: { keyPrefix: prefix } })
      
      if (apiKey && (await bcrypt.compare(rawKey, apiKey.keyHash))) {
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsed: new Date() },
        })
        return handler(req, { userId: apiKey.userId, params: context?.params })
      }
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
