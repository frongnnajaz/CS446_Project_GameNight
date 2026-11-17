// Zod schema ตรวจข้อมูลที่ส่งเข้ามา (params / query / body) ก่อนแตะฐานข้อมูล
import { z } from 'zod'

export const idParam = z.object({ id: z.coerce.number().int().positive() })
export const gameIdParam = z.object({ gameId: z.coerce.number().int().positive() })

const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug ใช้ได้เฉพาะ a-z 0-9 และ - เท่านั้น')

/** แปลงชื่อเป็น slug เช่น "Neon Drift!" -> "neon-drift" */
export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `game-${Date.now()}`

/** แนวเกม / แพลตฟอร์ม */
export const namedBody = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slug.optional(),
})

export const companyBody = z.object({ name: z.string().trim().min(1).max(120) })

export const priceBody = z.object({
  price: z.number().int().min(0).max(1_000_000),
  discountPercent: z.number().int().min(0).max(100).default(0),
  isFeatured: z.boolean().default(false),
})

const ids = z.array(z.number().int().positive()).max(50)

// ฟิลด์ของเกม (ไม่มีค่าเริ่มต้น) ใช้กับ PUT/PATCH ซึ่งแก้เฉพาะฟิลด์ที่ส่งมา
const gameFields = {
  name: z.string().trim().min(1).max(200),
  slug: slug,
  released: z.iso.date().nullable(),
  rating: z.number().min(0).max(5),
  ratings_count: z.number().int().min(0),
  added: z.number().int().min(0),
  metacritic: z.number().int().min(0).max(100).nullable(),
  background_image: z.union([z.url(), z.literal('').transform(() => null)]).nullable(),
  description_raw: z.string().max(20_000),
  website: z.union([z.url(), z.literal('')]),
  genreIds: ids,
  platformIds: ids,
  developerIds: ids,
  publisherIds: ids,
  price: priceBody,
}

/** PUT/PATCH ส่งมาเฉพาะฟิลด์ที่ต้องการแก้ก็ได้ ถ้าส่ง genreIds ฯลฯ จะแทนที่ทั้งชุด */
export const gameUpdateBody = z.object(gameFields).partial()

/** POST: ต้องมี name ที่เหลือใช้ค่าเริ่มต้น */
export const gameBody = z.object({
  ...gameFields,
  slug: slug.optional(),
  released: gameFields.released.optional(),
  rating: gameFields.rating.default(0),
  ratings_count: gameFields.ratings_count.default(0),
  added: gameFields.added.default(0),
  metacritic: gameFields.metacritic.optional(),
  background_image: gameFields.background_image.optional(),
  description_raw: gameFields.description_raw.default(''),
  website: gameFields.website.default(''),
  genreIds: ids.default([]),
  platformIds: ids.default([]),
  developerIds: ids.default([]),
  publisherIds: ids.default([]),
  price: priceBody.optional(),
})

const ORDERINGS = ['-added', '-rating', '-released', '-metacritic', 'name', '-created'] as const

export const gamesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  genres: z.string().optional(), // "action,4" รับทั้ง slug และ id คั่นด้วย ,
  parent_platforms: z.string().optional(), // "1,2"
  ordering: z.enum(ORDERINGS).default('-added'),
})

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('รูปแบบอีเมลไม่ถูกต้อง'))

export const registerBody = z.object({
  email,
  password: z.string().min(4, 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร').max(100),
  name: z.string().trim().max(80).optional(),
})

export const loginBody = z.object({ email, password: z.string().min(1).max(100) })

export const wishlistBody =z.object({ gameId: z.number().int().positive() })

export const libraryBody = z.object({ gameId: z.number().int().positive() })

export const libraryUpdateBody = z
  .object({
    status: z.enum(['unplayed', 'playing', 'finished']).optional(),
    myRating: z.number().int().min(0).max(5).optional(),
  })
  .refine((v) => v.status !== undefined || v.myRating !== undefined, 'ต้องส่ง status หรือ myRating อย่างน้อยหนึ่งค่า')
