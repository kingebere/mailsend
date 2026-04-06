// lib/auth.ts
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { verifyToken, signToken, type JWTPayload } from './auth-token'

export { verifyToken, signToken }
export type { JWTPayload }

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<JWTPayload | null> {
  const cookieToken = req.cookies.get('auth_token')?.value
  if (cookieToken) {
    return verifyToken(cookieToken)
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return verifyToken(token)
  }

  return null
}