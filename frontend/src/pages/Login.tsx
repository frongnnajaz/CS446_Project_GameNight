// หน้าเข้าสู่ระบบ / สมัครสมาชิก (ระบุตัวตนด้วยอีเมล + รหัสผ่าน)
// หลังสำเร็จจะกลับไปหน้าที่มาจาก ?next=
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useLogin, useRegister } from '../hooks/useAuth'
import { errorText } from '../services/api'
import { useUser } from '../store/authStore'
import { btn } from '../components/ui'

/** ยอมให้กลับไปเฉพาะ path ภายในเว็บ (กันการส่งต่อไปเว็บอื่น) */
const safeNext = (v: string | null) =>
  v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/login') ? v : '/collection'

export default function Login() {
  const [sp, setSp] = useSearchParams()
  const mode = sp.get('mode') === 'register' ? 'register' : 'login'
  const next = safeNext(sp.get('next'))
  const navigate = useNavigate()
  const user = useUser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const loginM = useLogin()
  const registerM = useRegister()
  const active = mode === 'login' ? loginM : registerM

  // ล็อกอินแล้ว (หรือเพิ่งสำเร็จ) กลับไปหน้าเดิม
  useEffect(() => {
    if (user) navigate(next, { replace: true })
  }, [user, next, navigate])

  const switchMode = (m: 'login' | 'register') => {
    const params = new URLSearchParams(sp)
    if (m === 'register') params.set('mode', 'register')
    else params.delete('mode')
    setSp(params, { replace: true })
    loginM.reset()
    registerM.reset()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'login') loginM.mutate({ email, password })
    else registerM.mutate({ email, password, name })
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10 sm:py-14">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">
          {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </h1>
        <p className="mt-2 text-sub">เข้าสู่ระบบเพื่อเก็บ Wishlist และคลังเกมของคุณไว้ในบัญชี ใช้ได้ทุกเครื่อง</p>
      </div>

      <div role="tablist" aria-label="เลือกการทำงาน" className="tabs tabs-box justify-center bg-base-200">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`tab flex-1 ${mode === m ? 'tab-active font-semibold' : 'text-muted'}`}
          >
            {m === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-base-200 p-6">
        {mode === 'register' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">ชื่อที่แสดง (ไม่บังคับ)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="nickname"
              className="input w-full"
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">อีเมล</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="input w-full"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">รหัสผ่าน{mode === 'register' && ' (อย่างน้อย 4 ตัวอักษร)'}</span>
          <input
            type="password"
            required
            minLength={mode === 'register' ? 4 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="input w-full"
          />
        </label>

        {active.isError && (
          <div role="alert" className="alert alert-error alert-soft text-sm">
            {errorText(active.error)}
          </div>
        )}

        <button type="submit" disabled={active.isPending} className={`${btn.primary} mt-1`}>
          {active.isPending && <span className="loading loading-spinner loading-sm" />}
          {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        {mode === 'login' ? 'ยังไม่มีบัญชี? ' : 'มีบัญชีแล้ว? '}
        <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="link link-primary">
          {mode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
        </button>
        {' · '}
        <Link to="/" className="link">
          กลับไปหน้า Store
        </Link>
      </p>
    </div>
  )
}
