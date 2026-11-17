// อีเมล + รหัสผ่าน -> session token (เก็บในตาราง sessions พร้อม TTL ให้ DynamoDB ลบเองเมื่อหมดอายุ)
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { deleteItem, getItem, putItem, T, type SessionDoc } from './db'
import { ApiError } from './errors'

export const SESSION_DAYS = 7

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export interface AuthUser {
  id: number
  email: string
  name: string
}

export async function createSession(user: AuthUser): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  const doc: SessionDoc = {
    token,
    userId: user.id,
    email: user.email,
    name: user.name,
    expiresAt: new Date(expires).toISOString(),
    ttl: Math.floor(expires / 1000),
  }
  await putItem(T.sessions, doc)
  return token
}

export const bearerToken = (header: string | undefined) => header?.match(/^Bearer\s+(.+)$/i)?.[1]

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req.headers.authorization)
  if (!token) throw new ApiError(401, 'กรุณาเข้าสู่ระบบ')
  const s = await getItem<SessionDoc>(T.sessions, { token })
  if (!s || new Date(s.expiresAt) < new Date()) {
    if (s) await deleteItem(T.sessions, { token })
    throw new ApiError(401, 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่')
  }
  req.user = { id: s.userId, email: s.email, name: s.name }
  next()
}

export function currentUser(req: { user?: AuthUser }): AuthUser {
  if (!req.user) throw new ApiError(401, 'กรุณาเข้าสู่ระบบ')
  return req.user
}
