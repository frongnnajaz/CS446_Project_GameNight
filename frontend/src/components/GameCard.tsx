import { Link } from 'react-router'
import { useCollection } from '../store/collectionStore'
import { priceFor } from '../services/priceApi'
import { genreText } from '../utils/format'
import { HeartIcon } from './Icons'
import { GameCover, PriceTag } from './ui'
import type { GameSummary, PriceMap } from '../types/api'

interface GameCardProps {
  game: GameSummary
  prices: PriceMap | null
}

export default function GameCard({ game, prices }: GameCardProps) {
  const { isInWishlist, isOwned, toggleWishlist } = useCollection()
  const price = priceFor(game, prices)
  const inWish = isInWishlist(game.id)
  const owned = isOwned(game.id)

  return (
    <article className="card group relative overflow-hidden bg-base-200 transition hover:-translate-y-0.5 hover:bg-panel-hover">
      <Link to={`/game/${game.id}`} className="flex flex-1 flex-col">
        <figure className="aspect-[16/9] overflow-hidden bg-slate">
          <GameCover id={game.id} name={game.name} src={game.background_image} crop className="transition duration-300 group-hover:scale-105" />
        </figure>
        <div className="card-body gap-1 p-4">
          <h3 className="line-clamp-1 font-semibold text-white">{game.name}</h3>
          <p className="line-clamp-1 text-[13px] text-muted">{genreText(game)}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className="text-sm text-star">
              <span aria-hidden="true">★</span> {game.rating ? game.rating.toFixed(1) : '–'}
              <span className="sr-only"> คะแนนจาก 5</span>
            </span>
            {owned ? <span className="text-sm font-semibold text-success">อยู่ในคลังแล้ว</span> : <PriceTag price={price} compact />}
          </div>
        </div>
      </Link>
      {!owned && (
        <button
          type="button"
          onClick={() => toggleWishlist(game)}
          aria-pressed={inWish}
          aria-label={inWish ? `เอา ${game.name} ออกจาก Wishlist` : `เพิ่ม ${game.name} เข้า Wishlist`}
          className={`btn btn-circle absolute right-2 top-2 border-0 bg-base-100/75 backdrop-blur hover:bg-base-100 ${inWish ? 'text-primary' : 'text-white'}`}
        >
          <HeartIcon filled={inWish} className="h-5 w-5" />
        </button>
      )}
    </article>
  )
}

interface GameGridProps {
  games: GameSummary[]
  prices: PriceMap | null
  loading: boolean
  skeletons?: number
  min?: number
}

export function GameGrid({ games, prices, loading, skeletons = 8, min = 240 }: GameGridProps) {
  const style = { gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))` }
  if (loading) {
    return (
      <div className="grid gap-5" style={style} aria-busy="true" aria-label="กำลังโหลดเกม">
        {Array.from({ length: skeletons }, (_, i) => (
          <div key={i} className="card overflow-hidden bg-base-200">
            <div className="skeleton aspect-[16/9] rounded-none" />
            <div className="card-body gap-2 p-4">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid gap-5" style={style}>
      {games.map((g) => (
        <GameCard key={g.id} game={g} prices={prices} />
      ))}
    </div>
  )
}
