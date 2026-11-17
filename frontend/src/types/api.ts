// Type ของข้อมูลที่รับ-ส่งกับ Backend API (server/)

export interface Genre {
  id: number
  name: string
  slug: string
  /** จำนวนเกมในแนวนี้ (มีเฉพาะ GET /genres) */
  games_count?: number
}

export interface Platform {
  id: number
  name: string
  slug: string
  games_count?: number
}

export interface ParentPlatform {
  platform: Platform
}

export interface Company {
  id: number
  name: string
  developed_count?: number
  published_count?: number
}

/** เกมในหน้ารายการ: GET /games */
export interface GameSummary {
  id: number
  slug: string
  name: string
  released: string | null
  rating: number
  ratings_count: number
  added: number
  metacritic: number | null
  background_image: string | null
  genres: Genre[]
  parent_platforms?: ParentPlatform[]
  price?: PriceEntry | null
}

/** รายละเอียดเกม: GET /games/{id} */
export interface GameDetail extends GameSummary {
  description_raw: string
  website: string
  developers: Company[]
  publishers: Company[]
  background_image_additional?: string | null
}

/** ภาพหน้าจอ: GET /games/{id}/screenshots */
export interface Screenshot {
  id: number
  image: string | null
  width?: number
  height?: number
}

/** รูปแบบผลลัพธ์แบบแบ่งหน้า */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Ordering = '-added' | '-rating' | '-released' | '-metacritic' | 'name'

/** query string ของ GET /games */
export interface GamesParams {
  page?: number
  page_size?: number
  search?: string
  genres?: string
  parent_platforms?: string
  ordering?: Ordering
}

/** เงื่อนไขของชุดเกมใน Game Picker (แปลงเป็น GamesParams ตอนเรียก GET /games) */
export interface PickerFilters {
  genre: string
  platform: string
  page: number
}

/** หนึ่งแถวจาก GET /prices */
export interface PriceEntry {
  id: number
  gameId: number
  price: number
  discountPercent: number
  isFeatured: boolean
}

/** ตารางราคา key เป็น gameId */
export type PriceMap = Map<number, PriceEntry>

/** ราคาที่คำนวณแล้วสำหรับแสดงผล */
export interface Price {
  free: boolean
  base: number
  final: number
  discount: number
}

/** body ของ POST/PUT /games */
export interface GameInput {
  name: string
  slug?: string
  released: string | null
  rating: number
  ratings_count?: number
  added?: number
  metacritic: number | null
  background_image: string | null
  description_raw: string
  website: string
  genreIds: number[]
  platformIds: number[]
  developerIds: number[]
  publisherIds: number[]
  price: { price: number; discountPercent: number; isFeatured: boolean }
}

/** body ของ POST/PUT /genres, /platforms, /companies */
export interface NamedInput {
  name: string
  slug?: string
}
