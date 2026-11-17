// PrismaClient ตัวเดียวของทั้ง Backend (Prisma 7 ต้องส่ง driver adapter เอง)
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('ไม่พบ DATABASE_URL ในไฟล์ .env')

// Prisma Postgres ในเครื่อง (prisma dev) รับได้ทีละ 1 connection ถ้าเปิดหลาย connection พร้อมกัน
// query จะชนกันและได้ผลลัพธ์ผิด จึงตั้งค่าเริ่มต้นเป็น 1 ถ้าใช้ PostgreSQL จริงตั้ง DB_POOL_MAX เพิ่มได้ (เช่น 10)
const max = Number(process.env.DB_POOL_MAX) || 1

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max }) })
