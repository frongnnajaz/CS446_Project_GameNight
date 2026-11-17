// ผู้ใช้ที่ล็อกอินอยู่ (token + ข้อมูลผู้ใช้) เก็บใน Zustand และจำไว้ใน localStorage ให้รีเฟรชหน้าแล้วยังล็อกอินอยู่
// ถ้าเบราว์เซอร์ปิด localStorage ไว้ จะจำได้แค่จนกว่าจะปิดแท็บ
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

export interface AuthUser {
  id: number
  email: string
  name: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
}

const memory = new Map<string, string>()

/** localStorage ที่ไม่ throw (โหมดส่วนตัวบางเบราว์เซอร์ใช้ไม่ได้) */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return memory.get(k) ?? null
    }
  },
  setItem: (k, v) => {
    memory.set(k, v)
    try {
      localStorage.setItem(k, v)
    } catch {
      // ใช้หน่วยความจำแทน
    }
  },
  removeItem: (k) => {
    memory.delete(k)
    try {
      localStorage.removeItem(k)
    } catch {
      // ไม่มีอะไรต้องทำ
    }
  },
}

export const useAuthStore = create<AuthState>()(
  persist((): AuthState => ({ token: null, user: null }), {
    name: 'gamenight.auth.v1',
    storage: createJSONStorage(() => safeStorage),
  }),
)

export const setSession = (token: string, user: AuthUser) => useAuthStore.setState({ token, user })

export const clearSession = () => useAuthStore.setState({ token: null, user: null })

/** token ปัจจุบัน (ใช้นอก component เช่นใน axios interceptor) */
export const getToken = () => useAuthStore.getState().token

/** ผู้ใช้ที่ล็อกอินอยู่ หรือ null */
export const useUser = () => useAuthStore((s) => s.user)
