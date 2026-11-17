// แปลงแถวจากฐานข้อมูลเป็น JSON ที่ Frontend ใช้ (ชื่อฟิลด์รูปแบบเดียวกับ API เดิม เพื่อให้หน้าเว็บไม่ต้องเปลี่ยน)
import type { Prisma } from '../generated/prisma/client'

/** relation ที่ต้อง include ทุกครั้งที่ส่งข้อมูลเกมออกไป */
export const gameInclude = {
  genres: { include: { genre: true } },
  platforms: { include: { platform: true } },
  developers: { include: { company: true } },
  publishers: { include: { company: true } },
  price: true,
} satisfies Prisma.GameInclude

type GameRow = Prisma.GameGetPayload<{ include: typeof gameInclude }>

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

export function serializePrice(p: { id: number; gameId: number; price: number; discountPercent: number; isFeatured: boolean }) {
  return { id: p.id, gameId: p.gameId, price: p.price, discountPercent: p.discountPercent, isFeatured: p.isFeatured }
}

/** เกมในหน้ารายการ (GET /api/games) */
export function serializeGameSummary(g: GameRow) {
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    released: isoDate(g.released),
    rating: g.rating,
    ratings_count: g.ratingsCount,
    added: g.added,
    metacritic: g.metacritic,
    background_image: g.backgroundImage,
    genres: g.genres.map(({ genre }) => ({ id: genre.id, name: genre.name, slug: genre.slug })),
    parent_platforms: g.platforms.map(({ platform }) => ({
      platform: { id: platform.id, name: platform.name, slug: platform.slug },
    })),
    price: g.price ? serializePrice(g.price) : null,
  }
}

/** รายละเอียดเกม (GET /api/games/:id) */
export function serializeGameDetail(g: GameRow) {
  return {
    ...serializeGameSummary(g),
    description_raw: g.description,
    website: g.website,
    developers: g.developers.map(({ company }) => ({ id: company.id, name: company.name })),
    publishers: g.publishers.map(({ company }) => ({ id: company.id, name: company.name })),
  }
}
