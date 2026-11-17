import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useGame, useGames, usePrices, useScreenshots } from '../hooks/queries'
import { priceFor } from '../services/priceApi'
import { useCollection } from '../store/collectionStore'
import { formatDate, platformText, shortText } from '../utils/format'
import { GameGrid } from '../components/GameCard'
import { CartIcon, CheckIcon, ExternalIcon, HeartIcon } from '../components/Icons'
import { ErrorState, GameCover, InlineError, LinkButton, PriceTag, Tag, btn } from '../components/ui'

interface GalleryImage {
  src: string | null
  shift: number
}

export default function GameDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const gameQ = useGame(id)
  const shotsQ = useScreenshots(id)
  const prices = usePrices()
  const game = gameQ.data
  const firstGenre = game?.genres[0]?.slug ?? ''
  const similarQ = useGames({ genres: firstGenre, page_size: 6, ordering: '-added' }, { enabled: !!firstGenre })
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const { isInWishlist, isOwned, toggleWishlist, buy } = useCollection()

  useEffect(() => {
    setActive(0)
    setExpanded(false)
  }, [id])

  useEffect(() => {
    if (game) document.title = `${game.name} · Game Night`
    return () => {
      document.title = 'Game Night'
    }
  }, [game])

  if (gameQ.isPending) return <DetailSkeleton />

  if (gameQ.isError) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16">
        <ErrorState error={gameQ.error} onRetry={() => void gameQ.refetch()} />
        <LinkButton to="/" variant="ghost">
          กลับไปหน้า Store
        </LinkButton>
      </div>
    )
  }

  const g = gameQ.data
  const shots = (shotsQ.data ?? []).filter((s) => !s.image || s.image !== g.background_image)
  const gallery: GalleryImage[] = [
    { src: g.background_image, shift: 0 },
    ...shots.map((s, i) => ({ src: s.image, shift: (i + 1) * 30 })),
  ].slice(0, 8)
  const current = gallery[Math.min(active, gallery.length - 1)] ?? { src: null, shift: 0 }
  const price = priceFor(g, prices)
  const owned = isOwned(g.id)
  const inWish = isInWishlist(g.id)
  const similar = (similarQ.data?.results ?? []).filter((s) => s.id !== g.id).slice(0, 4)
  const description = g.description_raw || 'ยังไม่มีคำอธิบายสำหรับเกมนี้'
  const longDesc = description.length > 600
  const mainGenre = g.genres[0]

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-2">
        <nav aria-label="breadcrumb" className="breadcrumbs p-0 text-sm text-muted">
          <ul>
            <li>
              <Link to="/" className="text-primary">
                Store
              </Link>
            </li>
            {mainGenre && (
              <li>
                <Link to={`/?genre=${mainGenre.slug}`} className="text-primary">
                  {mainGenre.name}
                </Link>
              </li>
            )}
            <li aria-current="page">{g.name}</li>
          </ul>
        </nav>
        <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">{g.name}</h1>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-3">
          <figure className="m-0 aspect-[16/9] overflow-hidden rounded-xl bg-slate">
            <GameCover key={active} id={g.id} name={g.name} src={current.src} shift={current.shift} showName={false} className="pop-in" />
          </figure>
          {shotsQ.isPending ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6" aria-busy="true" aria-label="กำลังโหลดภาพหน้าจอ">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton aspect-[16/9] rounded-md" />
              ))}
            </div>
          ) : shotsQ.isError ? (
            <InlineError error={shotsQ.error} onRetry={() => void shotsQ.refetch()} label="โหลดภาพหน้าจอไม่สำเร็จ" />
          ) : (
            gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`ดูภาพที่ ${i + 1}`}
                    aria-current={i === active ? 'true' : undefined}
                    className={`aspect-[16/9] overflow-hidden rounded-md border-2 transition ${
                      i === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <GameCover id={g.id} name={g.name} src={img.src} shift={img.shift} crop showName={false} />
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        <aside className="flex flex-[1_1_320px] flex-col gap-4">
          <div className="hidden aspect-[16/9] overflow-hidden rounded-xl bg-slate lg:block">
            <GameCover id={g.id} name={g.name} src={g.background_image_additional || g.background_image} shift={180} />
          </div>
          <p className="leading-7 text-sub">{shortText(description)}</p>
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
            <dt className="text-muted">วันวางขาย</dt>
            <dd>{formatDate(g.released)}</dd>
            <dt className="text-muted">ผู้พัฒนา</dt>
            <dd>{(g.developers ?? []).map((d) => d.name).join(', ') || 'ไม่ระบุ'}</dd>
            <dt className="text-muted">ผู้จัดจำหน่าย</dt>
            <dd>{(g.publishers ?? []).map((d) => d.name).join(', ') || 'ไม่ระบุ'}</dd>
            <dt className="text-muted">แพลตฟอร์ม</dt>
            <dd>{platformText(g)}</dd>
          </dl>
          <div className="stats bg-base-200">
            <div className="stat place-items-center p-3">
              <div className="stat-value text-2xl text-star">★ {g.rating ? g.rating.toFixed(1) : '–'}</div>
              <div className="stat-title text-xs">User Rating</div>
            </div>
            <div className="stat place-items-center p-3">
              <div className="stat-value text-2xl text-meta">{g.metacritic ?? '–'}</div>
              <div className="stat-title text-xs">Metacritic</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {g.genres.map((genre) => (
              <Tag key={genre.id}>{genre.name}</Tag>
            ))}
          </div>
        </aside>
      </div>

      <section aria-label="ซื้อเกม" className="flex flex-wrap items-center gap-4 rounded-xl bg-base-200 px-5 py-5 sm:px-6">
        <p className="flex-[1_1_260px] font-display text-xl font-medium text-white">ซื้อ {g.name}</p>
        {owned ? (
          <>
            <span className="flex items-center gap-2 font-semibold text-success">
              <CheckIcon className="h-5 w-5" /> อยู่ในคลังของคุณแล้ว
            </span>
            <LinkButton to="/collection?tab=library" variant="ghost">
              ไปที่คลังเกม
            </LinkButton>
          </>
        ) : (
          <>
            <PriceTag price={price} size="lg" />
            <button type="button" onClick={() => buy(g)} disabled={!price} className={btn.buy}>
              <CartIcon className="h-5 w-5" /> {price?.free ? 'เพิ่มเข้าคลัง' : 'ซื้อเกม (จำลอง)'}
            </button>
            <button type="button" onClick={() => toggleWishlist(g)} aria-pressed={inWish} className={btn.outline}>
              <HeartIcon filled={inWish} className="h-5 w-5" />
              {inWish ? 'อยู่ใน Wishlist' : 'Wishlist'}
            </button>
          </>
        )}
      </section>

      <section aria-labelledby="about-title" className="flex max-w-3xl flex-col gap-3">
        <h2 id="about-title" className="font-display text-2xl font-semibold text-white">
          เกี่ยวกับเกมนี้
        </h2>
        <div className={`whitespace-pre-line leading-7 text-sub ${longDesc && !expanded ? 'line-clamp-[10]' : ''}`}>{description}</div>
        {longDesc && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="link link-primary self-start">
            {expanded ? 'ย่อ' : 'อ่านเพิ่มเติม'}
          </button>
        )}
        {g.website && (
          <a href={g.website} target="_blank" rel="noreferrer" className="link link-primary inline-flex items-center gap-1.5 self-start">
            เว็บไซต์ทางการ <ExternalIcon className="h-4 w-4" />
          </a>
        )}
      </section>

      {firstGenre && (similarQ.isPending || similarQ.isError || similar.length > 0) && (
        <section aria-labelledby="similar-title" className="flex flex-col gap-4">
          <h2 id="similar-title" className="font-display text-2xl font-semibold text-white">
            เกมแนวเดียวกัน
          </h2>
          {similarQ.isError ? (
            <ErrorState error={similarQ.error} onRetry={() => void similarQ.refetch()} />
          ) : (
            <GameGrid games={similar} prices={prices} loading={similarQ.isPending} skeletons={4} min={220} />
          )}
        </section>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8" aria-busy="true" aria-label="กำลังโหลดข้อมูลเกม">
      <div className="skeleton h-10 w-72 max-w-full" />
      <div className="flex flex-wrap gap-6">
        <div className="skeleton aspect-[16/9] flex-[999_1_600px] rounded-xl" />
        <div className="flex flex-[1_1_320px] flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-5" />
          ))}
        </div>
      </div>
    </div>
  )
}
