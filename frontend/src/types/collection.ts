// Type ของ Client State ใน Zustand (คอลเลกชันของผู้ใช้ และ Toast)
import type { GameSummary } from './api'

export type PlayStatus = 'unplayed' | 'playing' | 'finished'

export interface WishlistEntry {
  id: number
  addedAt: string
}

export interface LibraryEntry {
  id: number
  status: PlayStatus
  myRating: number
  purchasedAt: string
}

/** ข้อมูลเกมขั้นต่ำที่ action ต้องใช้ (เก็บแค่ id ส่วน name ใช้แสดง toast) */
export type GameRef = Pick<GameSummary, 'id' | 'name'>

export interface CollectionActions {
  toggleWishlist: (game: GameRef) => void
  removeFromWishlist: (id: number) => void
  /** "ซื้อ" แบบจำลอง: ย้ายเกมเข้าคลัง และเอาออกจาก Wishlist */
  buy: (game: GameRef) => void
  removeFromLibrary: (id: number) => void
  setStatus: (id: number, status: PlayStatus) => void
  setRating: (id: number, rating: number) => void
}

export interface CollectionState {
  wishlist: WishlistEntry[]
  library: LibraryEntry[]
  actions: CollectionActions
}


/** ค่าที่ hook useCollection() คืนให้ component */
export interface CollectionApi extends CollectionActions {
  wishlist: WishlistEntry[]
  library: LibraryEntry[]
  isInWishlist: (id: number) => boolean
  isOwned: (id: number) => boolean
}

export interface Toast {
  text: string
  key: number
}

export interface ToastState {
  toast: Toast | null
}
