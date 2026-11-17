// ตารางราคาเกมจาก Backend (GET /api/prices ตาราง Price ในฐานข้อมูล)
import { getPrices } from './api'
import type { GameSummary, Price, PriceMap } from '../types/api'

/** queryFn ของตารางราคา คืน Map ที่ key เป็น gameId */
export async function loadPrices(): Promise<PriceMap> {
  const list = await getPrices()
  return new Map(list.map((p) => [p.gameId, p]))
}

/** คืนค่า { free, base, final, discount } ของเกม (เกมที่ยังไม่มีราคาในฐานข้อมูลถือเป็นเกมฟรี) */
export function priceFor(game: Pick<GameSummary, 'id'> | null | undefined, map: PriceMap | null): Price | null {
  if (!game || !map) return null
  const entry = map.get(Number(game.id))
  const base = entry?.price ?? 0
  const discount = entry?.discountPercent ?? 0
  if (!base) return { free: true, base: 0, final: 0, discount: 0 }
  return { free: false, base, final: Math.round((base * (100 - discount)) / 100), discount }
}
