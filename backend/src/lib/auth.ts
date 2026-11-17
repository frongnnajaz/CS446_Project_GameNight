// ระบบระบุตัวตนแบบง่าย: อีเมล + รหัสผ่าน -> session token (เก็บในตาราง Session)
// รหัสผ่านถูก hash ด้วย scrypt ของ Node (ไม่ต้องติดตั้งแพ็กเกจเพิ่ม) ไม่เก็บรหัสผ่านจริงในฐานข้อมูล
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { prisma } from '../db'
import { ApiError } from './errors'

/** อายุ session 7 วัน */
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

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await prisma.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000) },
  })
  return token
}

export const bearerToken = (header: string | undefined) => header?.match(/^Bearer\s+(.+)$/i)?.[1]

export interface AuthUser {
  id: number
  email: string
  name: string
}

declare module 'express-serve-static-core' {
  interface Request {
    /** ผู้ใช้ที่ล็อกอิน (มีค่าเฉพาะ route ที่ผ่าน requireAuth) */
    user?: AuthUser
  }
}

/** ใช้กับ route ที่ต้องล็อกอิน ตอบ 401 ถ้าไม่มี token หรือ token หมดอายุ */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req.headers.authorization)
  if (!token) throw new ApiError(401, 'กรุณาเข้าสู่ระบบ')
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, name: true } } },
  })
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { token } })
    throw new ApiError(401, 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่')
  }
  req.user = session.user
  next()
}

/** ดึงผู้ใช้จาก req (เรียกหลัง requireAuth เท่านั้น) */
export function currentUser(req: { user?: AuthUser }): AuthUser {
  if (!req.user) throw new ApiError(401, 'กรุณาเข้าสู่ระบบ')
  return req.user
}
