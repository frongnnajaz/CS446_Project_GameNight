# Game Night 🎮 เว็บแอปร้านค้าเกมออนไลน์ (Full-Stack)

เว็บแอปร้านค้าเกมแนว Steam แบบ Full-Stack CRUD ทุกส่วนพัฒนาขึ้นเองทั้งหมด ไม่ใช้ข้อมูลจาก API ภายนอก และไม่มีข้อมูลฝังในโค้ด Frontend

| ชั้น | เทคโนโลยี |
| --- | --- |
| Frontend | React + TypeScript + Vite + Tailwind CSS + daisyUI, React Router, TanStack Query, Zustand (Toast) |
| Backend | RESTful API ด้วย Express 5 + Zod (ตรวจข้อมูล) |
| ORM | Prisma ORM 7 (`@prisma/adapter-pg`) |
| Database | PostgreSQL (ตอน dev ใช้ Prisma Postgres ในเครื่องผ่าน `prisma dev`) |

มี 7 หน้า: Store, รายละเอียดเกม, Collection (Wishlist/Library ของแต่ละบัญชี), Game Picker, **Admin (จัดการข้อมูล CRUD)**, **เข้าสู่ระบบ/สมัครสมาชิก** และ About

## วิธีรัน

ต้องมี [Node.js](https://nodejs.org) เวอร์ชัน 20 ขึ้นไป

โปรเจกต์แยกเป็น 2 โฟลเดอร์ แต่ละโฟลเดอร์มี `package.json` และ `node_modules` ของตัวเอง ติดตั้ง/รัน/deploy แยกกันได้

```
game-night/
  frontend/   React + Vite (port 5173)
  backend/    Express + Prisma + ฐานข้อมูล (port 3000)
  package.json  คำสั่งรวมสำหรับรันทั้งสองฝั่งพร้อมกันจากโฟลเดอร์หลัก
```

รันจากโฟลเดอร์หลัก (ครั้งแรก):

```bash
npm run setup                          # ติดตั้งแพ็กเกจของ root, backend และ frontend
cp backend/.env.example backend/.env   # ครั้งแรกเท่านั้น
npm run db:start                       # เปิด PostgreSQL ในเครื่อง (Prisma Postgres) ทำงานเบื้องหลัง
npm run db:migrate                     # สร้างตารางตาม backend/prisma/schema.prisma
npm run db:seed                        # ใส่ข้อมูลตัวอย่างจาก backend/prisma/seed.ts
npm run dev                            # เปิด Backend (3000) + Frontend (5173) พร้อมกัน
```

เปิด http://localhost:5173 (Frontend เรียก `/api/*` แล้ว Vite proxy ไปที่ Backend http://localhost:3000)

หรือรันแยกทีละฝั่งในเทอร์มินัล 2 หน้าต่าง:

```bash
cd backend && npm install && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

คำสั่งที่โฟลเดอร์หลัก (ส่งต่อไปยังโฟลเดอร์ที่เกี่ยวข้อง):

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | Backend + Frontend พร้อมกัน |
| `npm run build` | ตรวจ TypeScript ของ Backend แล้ว build Frontend (`frontend/dist/`) |
| `npm run db:start` / `db:stop` | เปิด/ปิดฐานข้อมูลในเครื่อง |
| `npm run db:migrate` | สร้าง/อัปเดตตารางจาก schema |
| `npm run db:seed` | ล้างข้อมูลแล้วใส่ข้อมูลตัวอย่างใหม่ |
| `npm run db:reset` | ลบฐานข้อมูล สร้างตารางใหม่ และ seed |
| `npm run db:studio` | เปิด Prisma Studio ดู/แก้ข้อมูลในตาราง |
| `npm run typecheck` | ตรวจ TypeScript ทั้ง Frontend และ Backend |

> ใช้ PostgreSQL ตัวอื่นได้ (เช่น Docker หรือ Cloud) แค่เปลี่ยน `DATABASE_URL` ใน `backend/.env` และตั้ง `DB_POOL_MAX=10`
> (`prisma dev` ในเครื่องรับได้ทีละ connection จึงต้องเป็น `1`)

## ฐานข้อมูล (backend/prisma/schema.prisma)

แยกข้อมูล API เดิม (รายการเกม แนวเกม แพลตฟอร์ม ราคา และคอลเลกชันของผู้ใช้) เป็นตารางที่สัมพันธ์กัน

| ตาราง | ความสัมพันธ์กับ Game |
| --- | --- |
| `Genre` ผ่าน `GameGenre` | N : M |
| `Platform` ผ่าน `GamePlatform` | N : M |
| `Company` ผ่าน `GameDeveloper` / `GamePublisher` | N : M (แยกบทบาทผู้พัฒนา/ผู้จัดจำหน่าย) |
| `Price` | 1 : 1 (ราคา ส่วนลด เกมแนะนำ) |
| `Screenshot` | 1 : N |
| `WishlistItem` | N (ไม่ซ้ำต่อผู้ใช้ `@@unique([userId, gameId])`) |
| `LibraryItem` | N (ไม่ซ้ำต่อผู้ใช้, `status`: unplayed / playing / finished, `myRating`) |

ตารางผู้ใช้: `User` (อีเมลไม่ซ้ำ, ชื่อ, รหัสผ่านที่ hash แล้ว) มี `Session` (token ล็อกอิน อายุ 7 วัน), `WishlistItem`, `LibraryItem` เป็นของตัวเอง ลบผู้ใช้แล้วข้อมูลเหล่านี้ถูกลบตาม

- ความสัมพันธ์ N:M ใช้ตารางเชื่อม (`GameGenre`, `GamePlatform`, `GameDeveloper`, `GamePublisher`)
- ลบเกมแล้ว ราคา ภาพหน้าจอ ตารางเชื่อม และรายการในคอลเลกชันถูกลบตาม (`onDelete: Cascade`)
- ข้อมูลตัวอย่าง (`backend/prisma/seed.ts`): 24 เกม, 12 แนวเกม, 6 แพลตฟอร์ม, 16 บริษัท, ราคาทุกเกม และผู้ใช้ตัวอย่าง 2 คนพร้อม Wishlist/Library ของแต่ละคน

## ระบบผู้ใช้ (Personal Collection)

Wishlist และคลังเกม (Library) เป็นของแต่ละบัญชี ระบุตัวตนแบบง่ายด้วย **อีเมล + รหัสผ่าน**

- สมัคร/เข้าสู่ระบบที่หน้า `/login` ได้ token กลับมา Frontend เก็บใน localStorage และแนบ `Authorization: Bearer <token>` ไปกับทุก request
- ยังไม่ล็อกอินแล้วกด Wishlist หรือซื้อ จะพาไปหน้าเข้าสู่ระบบ แล้วกลับมาหน้าเดิมหลังล็อกอิน
- token หมดอายุหรือไม่ถูกต้อง API ตอบ 401 แล้วหน้าเว็บออกจากระบบให้อัตโนมัติ
- รหัสผ่านเก็บเป็น hash (scrypt ของ Node) ไม่เก็บรหัสจริง ส่วนกติการหัสผ่านตั้งไว้แบบง่าย (อย่างน้อย 4 ตัว) **สำหรับการบ้านเท่านั้น**

บัญชีตัวอย่าง (จาก `backend/prisma/seed.ts`):

| อีเมล | รหัสผ่าน |
| --- | --- |
| `demo@gamenight.test` | `1234` |
| `mai@gamenight.test` | `1234` |

## Backend RESTful API (backend/)

Base URL: `http://localhost:3000/api` ทุก endpoint รับ/ส่ง JSON error ตอบรูปแบบ `{ "error": "ข้อความ" }`
(400 ข้อมูลไม่ถูกต้อง, 404 ไม่พบ, 409 ข้อมูลซ้ำ, 500 เซิร์ฟเวอร์ขัดข้อง)

| Method | Endpoint | คำอธิบาย |
| --- | --- | --- |
| GET | `/games?page&page_size&search&genres&parent_platforms&ordering` | รายการเกมแบบแบ่งหน้า ค้นหา กรอง เรียง (`-added`, `-rating`, `-released`, `-metacritic`, `name`) |
| GET | `/games/:id` | รายละเอียดเกม (แนวเกม แพลตฟอร์ม ผู้พัฒนา ผู้จัดจำหน่าย ราคา) |
| GET | `/games/:id/screenshots` | ภาพหน้าจอ |
| POST | `/games` | เพิ่มเกม (`name` จำเป็น, `genreIds`, `platformIds`, `developerIds`, `publisherIds`, `price`) |
| PUT / PATCH | `/games/:id` | แก้เกม (ส่งเฉพาะฟิลด์ที่ต้องการแก้ ถ้าส่ง `genreIds` ฯลฯ จะแทนที่ทั้งชุด) |
| DELETE | `/games/:id` | ลบเกม |
| GET / POST | `/genres`, `/platforms`, `/companies` | ดูทั้งหมด (พร้อมจำนวนเกม) / เพิ่ม `{ name, slug? }` |
| GET / PUT / DELETE | `/genres/:id`, `/platforms/:id`, `/companies/:id` | ดู / แก้ / ลบ |
| GET | `/prices`, `/prices/:gameId` | ตารางราคา |
| PUT | `/prices/:gameId` | สร้างหรือแก้ราคา `{ price, discountPercent, isFeatured }` |
| POST | `/auth/register` | สมัครสมาชิก `{ email, password, name? }` ได้ `{ token, user }` |
| POST | `/auth/login` | เข้าสู่ระบบ `{ email, password }` ได้ `{ token, user }` |
| GET | `/auth/me` | ผู้ใช้ปัจจุบัน 🔒 |
| POST | `/auth/logout` | ลบ session ปัจจุบัน |
| GET / POST | `/wishlist` | ดู Wishlist ของฉัน / เพิ่ม `{ gameId }` 🔒 |
| DELETE | `/wishlist/:gameId` | เอาออกจาก Wishlist 🔒 |
| GET / POST | `/library` | ดูคลังเกม / "ซื้อ" `{ gameId }` (ย้ายจาก Wishlist เข้าคลังใน transaction เดียว) 🔒 |
| PATCH | `/library/:gameId` | แก้ `{ status?, myRating? }` 🔒 |
| DELETE | `/library/:gameId` | เอาออกจากคลัง 🔒 |
| GET | `/health` | ตรวจว่า API และฐานข้อมูลพร้อม |

🔒 = ต้องส่ง header `Authorization: Bearer <token>` (ไม่ส่งหรือ token ไม่ถูกต้องตอบ 401)

ตัวอย่าง:

```bash
curl -X POST http://localhost:3000/api/games -H "Content-Type: application/json" \
  -d '{"name":"Pixel Pirates","rating":4.4,"genreIds":[3,51],"platformIds":[1],"price":{"price":790,"discountPercent":25}}'
```

## โครงสร้างโปรเจกต์

```
package.json          คำสั่งรวม (setup, dev, build, db:*) ใช้ concurrently รันสองฝั่งพร้อมกัน
netlify.toml          ตั้งค่า deploy Frontend บน Netlify (base = frontend)

backend/
  package.json        express, prisma, zod ...  (npm run dev / start / db:*)
  .env                DATABASE_URL, DB_POOL_MAX, API_PORT, CORS_ORIGIN (ตัวอย่างใน .env.example)
  prisma.config.ts    ตั้งค่า Prisma CLI (schema, migrations, seed, DATABASE_URL)
  prisma/
    schema.prisma     โครงสร้างตาราง
    migrations/       ประวัติการเปลี่ยนแปลงตาราง
    seed.ts           ข้อมูลตัวอย่าง
  scripts/db-start.mjs  เปิดฐานข้อมูลในเครื่อง (ไม่สั่งซ้ำถ้าเปิดอยู่แล้ว)
  src/
    index.ts          Express app รวม route ทั้งหมด
    db.ts             PrismaClient + driver adapter
    routes/           auth.ts, games.ts, lookups.ts (genres/platforms/companies), collection.ts (prices/wishlist/library)
    lib/              auth.ts (hash รหัสผ่าน, session, requireAuth), validate.ts (Zod), serialize.ts, errors.ts
    generated/        Prisma Client ที่ generate อัตโนมัติ (ไม่ commit)

frontend/
  package.json        react, vite, tanstack query ...  (npm run dev / build / preview)
  .env                VITE_API_URL (เว้นว่าง = ใช้ Vite proxy)
  vite.config.ts      proxy /api -> http://localhost:3000
  vercel.json, public/_redirects   ตั้งค่า SPA สำหรับ Vercel/Netlify
  src/
    services/         api.ts (เรียก Backend ทุก endpoint ด้วย axios), priceApi.ts (คำนวณราคาหลังส่วนลด)
    hooks/            queries.ts, useAuth.ts
    store/            authStore.ts (token + ผู้ใช้), collectionStore.ts (Wishlist/Library แบบ optimistic update), toastStore.ts
    pages/            Home, GameDetail, Collection, Picker, Admin, Login, About, NotFound, RouteError
    components/       Navbar, Footer, GameCard, Filters, Pagination, ui/ ...
    types/            api.ts, collection.ts
```

## สถาปัตยกรรม

- **TanStack Query** ดูแลข้อมูลจาก Backend ทั้งหมด (cache, loading, error, retry) การแก้ไขใช้ `useMutation` แล้ว invalidate query ที่เกี่ยวข้อง
- Wishlist/Library ใช้ **optimistic update**: หน้าเว็บเปลี่ยนทันที ถ้า API ล้มเหลวจะย้อนค่ากลับและแจ้ง toast
- Backend ตรวจข้อมูลทุก request ด้วย **Zod** ก่อนแตะฐานข้อมูล และแปลง error ของ Prisma เป็นรหัส HTTP ที่เหมาะสม
- TypeScript แบบ `strict` ทั้งสองฝั่ง ตรวจด้วย `npm run typecheck` (รันอัตโนมัติก่อน `npm run build`)

## Deploy

- **Frontend** (โฟลเดอร์ `frontend/`, `npm run build` ได้ `frontend/dist/`)
  - Netlify: ใช้ `netlify.toml` ที่โฟลเดอร์หลักได้เลย (ตั้ง `base = "frontend"` ไว้แล้ว)
  - Vercel: ตั้ง Root Directory เป็น `frontend`
  - ตั้ง Environment Variable `VITE_API_URL` เป็น URL ของ Backend เช่น `https://your-api.example.com/api`
- **Backend** (โฟลเดอร์ `backend/`) ต้องรันบนเซิร์ฟเวอร์ Node.js (เช่น Render, Railway, Fly.io) ตั้ง Root Directory เป็น `backend`
  - Environment Variables: `DATABASE_URL`, `DB_POOL_MAX=10`, `CORS_ORIGIN` (โดเมนของ Frontend) ส่วนพอร์ตใช้ `PORT` ที่โฮสต์ตั้งให้ได้เลย
  - Build: `npm install && npm run db:deploy` · Start: `npm start`

## หมายเหตุ

- การซื้อเป็นแบบจำลอง ไม่มีการชำระเงินจริง
- ระบบล็อกอินเป็นแบบง่ายสำหรับการบ้าน: ไม่มียืนยันอีเมล ไม่มีลืมรหัสผ่าน และหน้า Admin ยังไม่จำกัดสิทธิ์ (ใครก็แก้ข้อมูลเกมได้)
