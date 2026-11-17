// npm run db:start: เปิด Prisma Postgres ในเครื่องชื่อ game-night แบบทำงานเบื้องหลัง
// ถ้าเปิดอยู่แล้วจะไม่สั่งซ้ำ (สั่ง `prisma dev --name game-night` ซ้ำตอนที่เปิดอยู่จะเจอ error "Port 51215 is not available")
// ถ้าหยุดอยู่หรือยังไม่เคยสร้าง จะเปิดด้วย --detach (ข้อมูลเดิมของชื่อ game-night ยังอยู่)
import { execSync } from 'node:child_process'

const NAME = 'game-night'
const plain = (s) => s.replace(/\x1b\[[0-9;]*m|\x1b\]8;;[^\x07\x1b]*(\x07|\x1b\\)/g, '')

const list = plain(execSync('npx prisma dev ls', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
const row = list.split('\n').find((l) => l.trim().startsWith(`${NAME} `))
const status = row?.trim().split(/\s+/)[1]

if (status === 'running') {
  console.log(`ฐานข้อมูล ${NAME} เปิดอยู่แล้ว (TCP: localhost:51214)`)
} else {
  console.log(`กำลังเปิดฐานข้อมูล ${NAME} ...`)
  // หลัง db:stop ไม่กี่วินาที lock file ของ prisma dev อาจยังไม่ถูกปล่อย จึงลองซ้ำสูงสุด 10 ครั้ง
  for (let attempt = 1; ; attempt++) {
    try {
      execSync(`npx prisma dev --name ${NAME} --detach`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      break
    } catch (e) {
      const msg = plain(`${e.stdout ?? ''}${e.stderr ?? ''}`)
      if (attempt >= 10 || !/Lock file is already being held|is not available/.test(msg)) {
        console.error(msg)
        process.exit(1)
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500) // รอ 1.5 วินาที
    }
  }
  console.log(`เปิดฐานข้อมูล ${NAME} แล้ว (TCP: localhost:51214)`)
}
