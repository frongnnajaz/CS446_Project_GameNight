import { cropImage, hueOf } from '../../utils/format'

interface GameCoverProps {
  id: number
  name: string
  src?: string | null
  crop?: boolean
  shift?: number
  showName?: boolean
  className?: string
}

/** ภาพปกเกม ถ้าไม่มีภาพ (background_image ในฐานข้อมูลเป็น null) จะวาดพื้นหลังไล่สีแทน */
export function GameCover({ id, name, src, crop = false, shift = 0, showName = true, className = '' }: GameCoverProps) {
  if (src) {
    return <img src={crop ? cropImage(src) : src} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />
  }
  const h = (hueOf(id) + shift) % 360
  return (
    <div
      aria-hidden="true"
      className={`flex h-full w-full items-end p-3 ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 50% 36%), hsl(${(h + 55) % 360} 55% 15%))` }}
    >
      {showName && <span className="font-display text-lg font-semibold leading-tight text-white/90 drop-shadow">{name}</span>}
    </div>
  )
}
