import type { GameSummary } from '../types/api'

export const baht = (n: number): string => `฿${Math.round(n).toLocaleString('en-US')}`

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'ยังไม่ระบุ'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const genreText = (game: Pick<GameSummary, 'genres'> | null | undefined, max = 2): string =>
  (game?.genres ?? []).slice(0, max).map((g) => g.name).join(' · ') || 'ไม่ระบุแนว'

export const platformText = (game: Pick<GameSummary, 'parent_platforms'> | null | undefined): string =>
  (game?.parent_platforms ?? []).map((p) => p.platform?.name).filter(Boolean).join(' · ') || 'ไม่ระบุ'

// ถ้า URL ภาพเป็นรูปแบบ /media/games/ (เช่นภาพจาก RAWG) ขอภาพขนาดเล็กลงด้วย /media/crop/{w}/{h}/
export function cropImage(url: string, w = 600, h = 400): string {
  return url.includes('/media/games/') ? url.replace('/media/games/', `/media/crop/${w}/${h}/games/`) : url
}

export const hueOf = (id: number): number => (Number(id) * 47) % 360

export function shortText(text: string, max = 220): string {
  if (!text) return ''
  const first = text.split('\n').find((l) => l.trim()) ?? ''
  return first.length > max ? `${first.slice(0, max).trim()}…` : first
}
