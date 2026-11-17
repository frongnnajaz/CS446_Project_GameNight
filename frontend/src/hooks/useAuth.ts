// การกระทำเกี่ยวกับผู้ใช้: เข้าสู่ระบบ / สมัครสมาชิก / ออกจากระบบ
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../services/api'
import { clearSession, setSession } from '../store/authStore'
import { toast } from '../store/toastStore'

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onSuccess: ({ token, user }) => {
      setSession(token, user)
      toast(`ยินดีต้อนรับ ${user.name || user.email}`)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      api.register(email, password, name),
    onSuccess: ({ token, user }) => {
      setSession(token, user)
      toast(`สมัครสมาชิกสำเร็จ ยินดีต้อนรับ ${user.name || user.email}`)
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return async () => {
    try {
      await api.logout()
    } catch {
      // ถึงเรียก API ไม่สำเร็จก็ออกจากระบบฝั่งหน้าเว็บได้
    }
    clearSession()
    qc.removeQueries({ queryKey: ['wishlist'] })
    qc.removeQueries({ queryKey: ['library'] })
    toast('ออกจากระบบแล้ว')
  }
}
