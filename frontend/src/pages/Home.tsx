import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useGames, useGenres, usePlatforms, usePrices } from '../hooks/queries'
import { priceFor } from '../services/priceApi'
import { useCollection } from '../store/collectionStore'
import { formatDate } from '../utils/format'
import { GameGrid } from '../components/GameCard'
import { GenreChips, PlatformSelect } from '../components/Filters'
import { Pagination } from '../components/Pagination'
import { HeartIcon } from '../components/Icons'
import { EmptyState, ErrorState, GameCover, PriceTag, Tag, btn, selectCls } from '../components/ui'
import type { GameSummary, Ordering, PriceMap } from '../types/api'

const PAGE_SIZE = 20

const ORDERINGS: [Ordering, string][] = [
  ['-added', 'ยอดนิยม'],
  ['-rating', 'เรตติ้งสูงสุด'],
  ['-released', 'วางขายล่าสุด'],
  ['-metacritic', 'คะแนน Metacritic'],
  ['name', 'ชื่อ A–Z'],
]

const isOrdering = (v: string | null): v is Ordering => ORDERINGS.some(([o]) => o === v)

type FilterKey = 'search' | 'genre' | 'platform' | 'ordering' | 'page'

export default function Home() {
  const [sp, setSp] = useSearchParams()
  const search = sp.get('search') || ''
  const genre = sp.get('genre') || ''
  const platform = sp.get('platform') || ''
  const rawOrdering = sp.get('ordering')
  const ordering: Ordering = isOrdering(rawOrdering) ? rawOrdering : '-added'
  const page = Math.max(1, Number(sp.get('page')) || 1)

  // เก็บตัวกรองไว้ใน URL เพื่อให้กดย้อนกลับหรือแชร์ลิงก์ได้
  const update = (patch: Partial<Record<FilterKey, string>>) => {
    const next = new URLSearchParams(sp)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in patch)) next.delete('page')
    setSp(next)
  }

  const genresQ = useGenres()
  const platformsQ = usePlatforms()
  const gamesQ = useGames({ page, page_size: PAGE_SIZE, search, genres: genre, parent_platforms: platform, ordering })
  const prices = usePrices()

  const results = useMemo(() => gamesQ.data?.results ?? [], [gamesQ.data])
  const count = gamesQ.data?.count ?? 0
  const totalPages = Math.min(Math.ceil(count / PAGE_SIZE), 500)
  const showHero = !search && !genre && !platform && page === 1

  const featured = useMemo(() => {
    if (!showHero || !results.length || !prices) return null
    return results.find((g) => (priceFor(g, prices)?.discount ?? 0) > 0) ?? results[0] ?? null
  }, [showHero, results, prices])

  const goPage = (p: number) => {
    update({ page: p > 1 ? String(p) : '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sortLabel = ORDERINGS.find(([v]) => v === ordering)?.[1] ?? 'ยอดนิยม'

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="sr-only">Game Night ร้านค้าเกมออนไลน์</h1>

      {showHero && gamesQ.isPending && <div className="skeleton h-[380px] rounded-2xl" aria-hidden="true" />}
      {featured && <Featured game={featured} prices={prices} />}

      <section aria-label="ตัวกรองเกม" className="flex flex-col gap-4">
        <GenreChips query={genresQ} value={genre} onChange={(g) => update({ genre: g })} />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="platform" className="text-sm text-muted">
            แพลตฟอร์ม
          </label>
          <PlatformSelect id="platform" query={platformsQ} value={platform} onChange={(p) => update({ platform: p })} className={selectCls} />
          <label htmlFor="ordering" className="text-sm text-muted sm:ml-2">
            เรียงตาม
          </label>
          <select id="ordering" value={ordering} onChange={(e) => update({ ordering: e.target.value })} className={selectCls}>
            {ORDERINGS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          {(genre || platform || search) && (
            <button type="button" onClick={() => setSp({})} className="link link-primary ml-auto text-sm">
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="list-title" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="list-title" className="font-display text-2xl font-semibold text-white">
            {search ? `ผลการค้นหา “${search}”` : showHero ? 'เกมมาใหม่และยอดนิยม' : `เกมทั้งหมด · ${sortLabel}`}
          </h2>
          {gamesQ.isSuccess && <p className="text-sm text-muted">{count.toLocaleString('en-US')} เกม</p>}
        </div>

        {gamesQ.isError ? (
          <ErrorState error={gamesQ.error} onRetry={() => void gamesQ.refetch()} />
        ) : gamesQ.isSuccess && results.length === 0 ? (
          <EmptyState
            title="ไม่พบเกมที่ตรงกับเงื่อนไข"
            actions={
              <button type="button" onClick={() => setSp({})} className={btn.outline}>
                ล้างตัวกรอง
              </button>
            }
          >
            ลองค้นหาด้วยคำอื่น หรือเปลี่ยนแนวเกมและแพลตฟอร์ม
          </EmptyState>
        ) : (
          <GameGrid games={results} prices={prices} loading={gamesQ.isPending} skeletons={PAGE_SIZE / 2} />
        )}
      </section>

      {gamesQ.isSuccess && <Pagination page={page} totalPages={totalPages} onChange={goPage} />}
    </div>
  )
}

function Featured({ game, prices }: { game: GameSummary; prices: PriceMap | null }) {
  const { isInWishlist, isOwned, toggleWishlist } = useCollection()
  const price = priceFor(game, prices)
  const inWish = isInWishlist(game.id)
  const owned = isOwned(game.id)

  return (
    <section aria-labelledby="featured-title" className="pop-in card grid overflow-hidden bg-base-200 lg:grid-cols-[1.65fr_1fr]">
      <Link to={`/game/${game.id}`} tabIndex={-1} aria-hidden="true" className="block aspect-[16/9] overflow-hidden bg-slate lg:aspect-auto lg:min-h-[380px]">
        <GameCover id={game.id} name={game.name} src={game.background_image} showName={false} />
      </Link>
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <p className="text-[13px] font-semibold tracking-wider text-primary">เกมเด่นประจำสัปดาห์</p>
        <h2 id="featured-title" className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
          {game.name}
        </h2>
        <div className="flex flex-wrap gap-2">
          {game.genres.slice(0, 3).map((g) => (
            <Tag key={g.id}>{g.name}</Tag>
          ))}
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted">เรตติ้ง</dt>
            <dd className="mt-0.5 font-semibold text-star">★ {game.rating ? game.rating.toFixed(1) : '–'}</dd>
          </div>
          <div>
            <dt className="text-muted">Metacritic</dt>
            <dd className="mt-0.5 font-semibold text-meta">{game.metacritic ?? '–'}</dd>
          </div>
          <div>
            <dt className="text-muted">วางขาย</dt>
            <dd className="mt-0.5 font-semibold text-white">{formatDate(game.released)}</dd>
          </div>
        </dl>
        <div className="mt-auto pt-2">
          {owned ? <span className="font-semibold text-success">อยู่ในคลังของคุณแล้ว</span> : <PriceTag price={price} size="lg" />}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={`/game/${game.id}`} className={`${btn.primary} flex-1`}>
            ดูรายละเอียด
          </Link>
          {!owned && (
            <button type="button" onClick={() => toggleWishlist(game)} aria-pressed={inWish} className={`${btn.outline} flex-1`}>
              <HeartIcon filled={inWish} className="h-5 w-5" />
              {inWish ? 'อยู่ใน Wishlist' : 'Wishlist'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
