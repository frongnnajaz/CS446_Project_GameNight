// npm run db:seed-if-empty: ใส่ข้อมูลตัวอย่างเฉพาะตอนที่ฐานข้อมูลยังไม่มีเกม
// ใช้ใน User data ของ EC2 ซึ่งรันทุกครั้งที่ Auto Scaling เปิดเครื่องใหม่
// prisma db seed จะล้างข้อมูลเดิมทั้งหมด จึงต้องเช็กก่อน ไม่อย่างนั้นทุกเครื่องใหม่จะลบข้อมูลผู้ใช้ทิ้ง
import { execSync } from 'node:child_process'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM "Game"')
await client.end()

if (rows[0].n > 0) {
  console.log(`ฐานข้อมูลมีเกมอยู่แล้ว ${rows[0].n} เกม ข้ามการ seed`)
} else {
  console.log('ฐานข้อมูลยังว่าง กำลัง seed ...')
  execSync('npx prisma db seed', { stdio: 'inherit' })
}
