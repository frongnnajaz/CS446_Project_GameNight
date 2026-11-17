import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useGenres, usePickerPool, usePlatforms, usePrices } from '../hooks/queries'
import { priceFor } from '../services/priceApi'
import { useCollection } from '../store/collectionStore'
import { formatDate, genreText } from '../utils/format'
import { GenreChips, PlatformSelect } from '../components/Filters'
import { DiceIcon, HeartIcon } from '../components/Icons'
import { ErrorState, GameCover, PriceTag, btn, selectCls } from '../components/ui'
import type { GameSummary, PickerFilters } from '../types/api'

const MIN_RATINGS: [number, string][] = [
  [0, 'ไม่จำกัด'],
  [3, '3.0 ขึ้นไป'],
  [3.5, '3.5 ขึ้นไป'],
  [4, '4.0 ขึ้นไป'],
  [4.5, '4.5 ขึ้นไป'],
]

/** เงื่อนไขของการสุ่มแต่ละครั้ง (เก็บค่าตอนกดปุ่ม เพื่อให้ผลไม่เปลี่ยนตามตัวกรองที่แก้ทีหลัง) */
interface Roll {
  filters: PickerFilters
  minRating: number
  seed: number
  excludeId: number | null
}

function pickFrom(pool: GameSummary[], roll: Roll): GameSummary | null {
  let candidates = pool.filter((g) => (g.rating ?? 0) >= roll.minRating)
  if (candidates.length > 1 && roll.excludeId !== null) candidates = candidates.filter((g) => g.id !== roll.excludeId)
  return candidates[Math.floor(roll.seed * candidates.length)] ?? null
}

export default function Picker() {
  const genresQ = useGenres()
  const platformsQ = usePlatforms()
  const prices = usePrices()
  const { isInWishlist, isOwned, toggleWishlist } = useCollection()

  const [genre, setGenre] = useState('')
  const [platform, setPlatform] = useState('')
  const [minRating, setMinRating] = useState(4)
  const [roll, setRoll] = useState<Roll | null>(null)

  // ดึงชุดเกมผ่าน TanStack Query (cache ตามแนว/แพลตฟอร์ม/หน้า) แล้วสุ่ม 1 เกมจากชุดนั้นฝั่ง client
  const poolQ = usePickerPool(roll?.filters ?? null)
  const result = useMemo(() => (roll && poolQ.data ? pickFrom(poolQ.data, roll) : null), [roll, poolQ.data])

  const rolling = roll !== null && poolQ.isFetching
  const start = () =>
    setRoll({
      // สุ่มหน้าผลลัพธ์ 1–3 แล้วสุ่มเกมที่ผ่านเรตติ้งขั้นต่ำ 1 เกม (เลี่ยงเกมเดิม)
      filters: { genre, platform, page: 1 + Math.floor(Math.random() * 3) },
      minRating,
      seed: Math.random(),
      excludeId: result?.id ?? null,
    })

  const price = result ? priceFor(result, prices) : null

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-7 px-4 py-8 sm:px-8 sm:py-10">
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">Game Picker</h1>
        <p className="mt-2 text-lg text-sub">ไม่รู้จะเล่นอะไรดี? เลือกเงื่อนไขแล้วให้ Game Night สุ่มเกมให้</p>
      </div>

      <section aria-label="ตั้งค่าการสุ่ม" className="flex flex-col gap-5 rounded-2xl bg-base-200 p-5 sm:p-6">
        <div className="flex flex-col gap-2.5">
          <p className="text-sm text-muted">แนวเกม</p>
          <GenreChips query={genresQ} value={genre} onChange={setGenre} allLabel="ทุกแนว" />
        </div>
        <div className="flex flex-wrap gap-5">
          <div className="flex flex-[1_1_200px] flex-col gap-2">
            <label htmlFor="pk-platform" className="text-sm text-muted">
              แพลตฟอร์ม
            </label>
            <PlatformSelect id="pk-platform" query={platformsQ} value={platform} onChange={setPlatform} className={`${selectCls} bg-base-100`} />
          </div>
          <div className="flex flex-[1_1_200px] flex-col gap-2">
            <label htmlFor="pk-rating" className="text-sm text-muted">
              เรตติ้งขั้นต่ำ
            </label>
            <select id="pk-rating" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className={`${selectCls} bg-base-100`}>
              {MIN_RATINGS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={rolling}
          className="btn btn-primary btn-lg mx-auto gap-2.5 px-10 font-display text-xl"
        >
          {rolling ? <span className="loading loading-spinner" /> : <DiceIcon className="h-6 w-6" />}
          {rolling ? 'กำลังสุ่ม...' : result ? 'สุ่มอีกครั้ง' : 'สุ่มเกม'}
        </button>
      </section>

      <section aria-live="polite" aria-label="ผลการสุ่ม">
        {!roll ? (
          <div className="rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center text-muted">
            ตั้งเงื่อนไขด้านบน แล้วกด <span className="font-semibold text-white">สุ่มเกม</span> เพื่อเริ่ม
          </div>
        ) : poolQ.isPending ? (
          <ResultSkeleton />
        ) : poolQ.isError ? (
          <ErrorState error={poolQ.error} onRetry={() => void poolQ.refetch()} />
        ) : !result ? (
          <div className="rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center">
            <p className="font-semibold text-white">ไม่พบเกมที่ตรงเงื่อนไข</p>
            <p className="mt-1 text-sub">ลองลดเรตติ้งขั้นต่ำ หรือเลือกแนวเกมอื่น</p>
          </div>
        ) : (
          <article key={result.id} className="pop-in flex flex-wrap gap-6 rounded-2xl border border-primary/60 bg-base-200 p-5 sm:p-6">
            <Link to={`/game/${result.id}`} tabIndex={-1} aria-hidden="true" className="aspect-[16/10] flex-[1_1_300px] overflow-hidden rounded-xl bg-slate">
              <GameCover id={result.id} name={result.name} src={result.background_image} showName={false} />
            </Link>
            <div className="flex flex-[1_1_280px] flex-col gap-3">
              <p className="text-[13px] font-semibold tracking-wider text-primary">เกมที่สุ่มได้</p>
              <h2 className="font-display text-3xl font-semibold leading-tight text-white">{result.name}</h2>
              <p className="text-muted">{genreText(result, 3)}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span className="text-lg font-semibold text-star">★ {result.rating ? result.rating.toFixed(1) : '–'}</span>
                <span className="text-sub">วางขาย {formatDate(result.released)}</span>
              </div>
              <div className="mt-1">
                {isOwned(result.id) ? <span className="font-semibold text-success">อยู่ในคลังของคุณแล้ว</span> : <PriceTag price={price} size="lg" />}
              </div>
              <div className="mt-auto flex flex-wrap gap-2.5 pt-2">
                <Link to={`/game/${result.id}`} className={`${btn.primary} flex-1`}>
                  ดูรายละเอียด
                </Link>
                {!isOwned(result.id) && (
                  <button type="button" onClick={() => toggleWishlist(result)} aria-pressed={isInWishlist(result.id)} className={`${btn.outline} flex-1`}>
                    <HeartIcon filled={isInWishlist(result.id)} className="h-5 w-5" />
                    {isInWishlist(result.id) ? 'อยู่ใน Wishlist' : 'Wishlist'}
                  </button>
                )}
              </div>
            </div>
          </article>
        )}
      </section>
    </div>
  )
}

function ResultSkeleton() {
  return (
    <div className="flex flex-wrap gap-6 rounded-2xl bg-base-200 p-5 sm:p-6" aria-busy="true" aria-label="กำลังสุ่มเกม">
      <div className="skeleton aspect-[16/10] flex-[1_1_300px] rounded-xl" />
      <div className="flex flex-[1_1_280px] flex-col gap-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-9 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-6 w-28" />
        <div className="skeleton mt-auto h-11 w-full" />
      </div>
    </div>
  )
}
