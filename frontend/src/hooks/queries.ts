// ทุกการดึงข้อมูลของแอปอยู่ที่นี่ ใช้ TanStack Query จัดการ cache, loading, error และ refetch
import { skipToken, useQueries, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { getCompanies, getGame, getGames, getGenres, getPlatforms, getScreenshots } from '../services/api'
import { loadPrices } from '../services/priceApi'
import type { GameDetail, GameSummary, GamesParams, Paginated, PickerFilters, PriceMap } from '../types/api'

const MINUTE = 60 * 1000

// staleTime ตามความถี่ที่ข้อมูลเปลี่ยนจริง (ค่าเริ่มต้น 5 นาทีตั้งไว้ที่ lib/queryClient.ts ใช้กับรายการเกม)
const STALE = {
  game: 30 * MINUTE, // รายละเอียดเกมแทบไม่เปลี่ยน และหน้า Collection ใช้ cache ชุดนี้ร่วมกัน
  screenshots: 30 * MINUTE,
  lookup: 24 * 60 * MINUTE, // รายชื่อแนวเกม/แพลตฟอร์ม
  prices: 10 * MINUTE,
} as const

type GamesOptions = Omit<UseQueryOptions<Paginated<GameSummary>>, 'queryKey' | 'queryFn'>

export const useGames = (params: GamesParams, options?: GamesOptions) =>
  useQuery({ queryKey: ['games', params], queryFn: () => getGames(params), ...options })

const gameQuery = (id: number | string) => ({
  queryKey: ['game', String(id)] as const,
  queryFn: (): Promise<GameDetail> => getGame(id),
  staleTime: STALE.game,
})

export const useGame = (id: number | string) => useQuery(gameQuery(id))

/** รายละเอียดเกมหลายเกมตาม ID (ใช้ในหน้า Collection) แชร์ cache กับ useGame */
export const useGameList = (ids: number[]) => useQueries({ queries: ids.map(gameQuery) })

export const useScreenshots = (id: number | string) =>
  useQuery({ queryKey: ['screenshots', String(id)], queryFn: () => getScreenshots(id), staleTime: STALE.screenshots })

export const useGenres = () => useQuery({ queryKey: ['genres'], queryFn: getGenres, staleTime: STALE.lookup })

export const usePlatforms = () => useQuery({ queryKey: ['platforms'], queryFn: getPlatforms, staleTime: STALE.lookup })

export const useCompanies = () => useQuery({ queryKey: ['companies'], queryFn: getCompanies, staleTime: STALE.lookup })

/** query ของตารางราคา (GET /api/prices) ใช้เมื่อต้องการสถานะ loading/error */
export const usePricesQuery = () =>
  useQuery<PriceMap>({ queryKey: ['prices'], queryFn: loadPrices, staleTime: STALE.prices })

/** ตารางราคา (Map) โหลดครั้งเดียวแล้วแชร์ cache ให้ทุกหน้า คืน null ระหว่างโหลดหรือเมื่อโหลดไม่สำเร็จ */
export function usePrices(): PriceMap | null {
  return usePricesQuery().data ?? null
}

/** ชุดเกมให้ Game Picker สุ่ม: ลองหน้าที่สุ่มได้ก่อน ถ้าไม่มีผลลัพธ์ถอยไปใช้หน้า 1 */
async function getPickerPool({ genre, platform, page }: PickerFilters): Promise<GameSummary[]> {
  const base: GamesParams = { genres: genre, parent_platforms: platform, page_size: 40, ordering: '-added' }
  if (page > 1) {
    try {
      const data = await getGames({ ...base, page })
      if (data.results.length) return data.results
    } catch {
      // หน้าเกินจำนวนที่มี ใช้หน้า 1 แทน
    }
  }
  return (await getGames({ ...base, page: 1 })).results
}

export const usePickerPool = (filters: PickerFilters | null) =>
  useQuery({
    queryKey: ['picker-pool', filters],
    // skipToken = ยังไม่ยิง request จนกว่าผู้ใช้จะกดสุ่ม (ไม่ต้อง cast type)
    queryFn: filters ? () => getPickerPool(filters) : skipToken,
  })
