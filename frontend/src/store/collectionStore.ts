// คอลเลกชันของผู้ใช้ที่ล็อกอิน (Wishlist / Library) เก็บในฐานข้อมูลผ่าน Backend API (/api/wishlist, /api/library)
// อ่านด้วย useQuery และแก้ด้วย useMutation แบบ optimistic: หน้าเว็บเปลี่ยนทันที ถ้า API ล้มเหลวจะย้อนกลับและแจ้ง toast
// ยังไม่ล็อกอิน: คอลเลกชันว่าง และการกด Wishlist/ซื้อ จะพาไปหน้าเข้าสู่ระบบ
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import * as api from '../services/api'
import { useUser } from './authStore'
import { toast } from './toastStore'
import type { CollectionApi, GameRef, LibraryEntry, PlayStatus, WishlistEntry } from '../types/collection'

/** ป้ายชื่อสถานะการเล่นที่แสดงในหน้าเว็บ */
export const STATUS: Record<PlayStatus, string> = {
  unplayed: 'ยังไม่เล่น',
  playing: 'กำลังเล่น',
  finished: 'เล่นจบ',
}

export const isPlayStatus = (v: string): v is PlayStatus => v in STATUS

// key มี id ผู้ใช้ด้วย เพื่อไม่ให้ cache ของผู้ใช้คนก่อนแสดงให้คนถัดไปเห็น
const wishlistKey = (userId: number | undefined) => ['wishlist', userId] as const
const libraryKey = (userId: number | undefined) => ['library', userId] as const

const has = (list: { id: number }[], id: number) => list.some((g) => g.id === id)

function useWishlistQuery() {
  const user = useUser()
  return useQuery({ queryKey: wishlistKey(user?.id), queryFn: api.getWishlist, staleTime: Infinity, enabled: !!user })
}

function useLibraryQuery() {
  const user = useUser()
  return useQuery({ queryKey: libraryKey(user?.id), queryFn: api.getLibrary, staleTime: Infinity, enabled: !!user })
}

type Keys = { wishlist: readonly unknown[]; library: readonly unknown[] }
type Snapshot = { wishlist?: WishlistEntry[]; library?: LibraryEntry[] }

/** เก็บค่าเดิมไว้ย้อนกลับ แล้วแก้ cache ล่วงหน้า */
async function optimistic(
  qc: QueryClient,
  keys: Keys,
  patch: { wishlist?: (l: WishlistEntry[]) => WishlistEntry[]; library?: (l: LibraryEntry[]) => LibraryEntry[] },
): Promise<Snapshot> {
  await Promise.all([qc.cancelQueries({ queryKey: keys.wishlist }), qc.cancelQueries({ queryKey: keys.library })])
  const snap: Snapshot = {
    wishlist: qc.getQueryData<WishlistEntry[]>(keys.wishlist),
    library: qc.getQueryData<LibraryEntry[]>(keys.library),
  }
  if (patch.wishlist) qc.setQueryData<WishlistEntry[]>(keys.wishlist, (l = []) => patch.wishlist!(l))
  if (patch.library) qc.setQueryData<LibraryEntry[]>(keys.library, (l = []) => patch.library!(l))
  return snap
}

function useCollectionMutations(userId: number | undefined) {
  const qc = useQueryClient()
  const keys: Keys = { wishlist: wishlistKey(userId), library: libraryKey(userId) }

  const rollback = (error: unknown, snap: Snapshot | undefined) => {
    if (snap?.wishlist) qc.setQueryData(keys.wishlist, snap.wishlist)
    if (snap?.library) qc.setQueryData(keys.library, snap.library)
    toast(`บันทึกไม่สำเร็จ: ${api.errorText(error)}`)
  }
  const sync = () =>
    Promise.all([qc.invalidateQueries({ queryKey: keys.wishlist }), qc.invalidateQueries({ queryKey: keys.library })])
  const common = { onError: (e: unknown, _v: unknown, snap: Snapshot | undefined) => rollback(e, snap), onSettled: sync }

  const addWish = useMutation({
    mutationFn: (game: GameRef) => api.addToWishlist(Number(game.id)),
    onMutate: (game) =>
      optimistic(qc, keys, { wishlist: (l) => [{ id: Number(game.id), addedAt: new Date().toISOString() }, ...l] }),
    onSuccess: (_d, game) => toast(`เพิ่ม ${game.name} เข้า Wishlist แล้ว`),
    ...common,
  })

  const removeWish = useMutation({
    mutationFn: (game: GameRef) => api.removeFromWishlist(Number(game.id)),
    onMutate: (game) => optimistic(qc, keys, { wishlist: (l) => l.filter((g) => g.id !== Number(game.id)) }),
    onSuccess: (_d, game) => {
      if (game.name) toast(`เอา ${game.name} ออกจาก Wishlist แล้ว`)
    },
    ...common,
  })

  const buy = useMutation({
    mutationFn: (game: GameRef) => api.buyGame(Number(game.id)),
    onMutate: (game) => {
      const id = Number(game.id)
      const entry: LibraryEntry = { id, status: 'unplayed', myRating: 0, purchasedAt: new Date().toISOString() }
      return optimistic(qc, keys, { wishlist: (l) => l.filter((g) => g.id !== id), library: (l) => [entry, ...l] })
    },
    onSuccess: (_d, game) => toast(`ซื้อ ${game.name} แล้ว เกมอยู่ในคลังของคุณ`),
    ...common,
  })

  const removeLib = useMutation({
    mutationFn: (id: number) => api.removeFromLibrary(id),
    onMutate: (id) => optimistic(qc, keys, { library: (l) => l.filter((g) => g.id !== id) }),
    ...common,
  })

  const patchLib = useMutation({
    mutationFn: ({ id, ...patch }: { id: number; status?: PlayStatus; myRating?: number }) =>
      api.updateLibraryItem(id, patch),
    onMutate: ({ id, ...patch }) =>
      optimistic(qc, keys, { library: (l) => l.map((g) => (g.id === id ? { ...g, ...patch } : g)) }),
    ...common,
  })

  return { addWish, removeWish, buy, removeLib, patchLib }
}

/** true เมื่อโหลดคอลเลกชันครั้งแรกเสร็จแล้ว (ยังไม่ล็อกอินถือว่าพร้อมทันที) */
export function useHydrated(): boolean {
  const w = useWishlistQuery()
  const l = useLibraryQuery()
  // query ที่ enabled: false จะเป็น pending ตลอด จึงดูจาก isLoading (กำลังโหลดครั้งแรกจริง ๆ) แทน
  return !w.isLoading && !l.isLoading
}

export function useCollection(): CollectionApi {
  const user = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: wishlist = EMPTY_WISH } = useWishlistQuery()
  const { data: library = EMPTY_LIB } = useLibraryQuery()
  const m = useCollectionMutations(user?.id)

  return useMemo(() => {
    /** ยังไม่ล็อกอิน: แจ้งแล้วพาไปหน้าเข้าสู่ระบบ กลับมาหน้าเดิมหลังล็อกอิน */
    const requireLogin = () => {
      if (user) return true
      toast('กรุณาเข้าสู่ระบบก่อนใช้งาน Wishlist และคลังเกม')
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
      return false
    }
    return {
      wishlist,
      library,
      isInWishlist: (id: number) => has(wishlist, Number(id)),
      isOwned: (id: number) => has(library, Number(id)),
      toggleWishlist: (game) => {
        if (requireLogin()) (has(wishlist, Number(game.id)) ? m.removeWish : m.addWish).mutate(game)
      },
      removeFromWishlist: (id) => m.removeWish.mutate({ id, name: '' }),
      buy: (game) => {
        if (requireLogin() && !has(library, Number(game.id))) m.buy.mutate(game)
      },
      removeFromLibrary: (id) => m.removeLib.mutate(id),
      setStatus: (id, status) => m.patchLib.mutate({ id, status }),
      setRating: (id, myRating) => m.patchLib.mutate({ id, myRating }),
    }
    // mutate ของ useMutation อ้างอิงคงที่ จึงไม่ต้องใส่ m ใน deps (useMutation สร้างใหม่เมื่อ user เปลี่ยน ซึ่งอยู่ใน deps แล้ว)
  }, [wishlist, library, user, navigate, location.pathname, location.search])
}

const EMPTY_WISH: WishlistEntry[] = []
const EMPTY_LIB: LibraryEntry[] = []
