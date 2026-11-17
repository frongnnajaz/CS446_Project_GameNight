import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useCollection } from '../store/collectionStore'
import { useUser } from '../store/authStore'
import { useLogout } from '../hooks/useAuth'
import { HeartIcon, SearchIcon } from './Icons'

const links = [
  { to: '/', label: 'Store', end: true },
  { to: '/collection', label: 'Collection' },
  { to: '/picker', label: 'Game Picker' },
  { to: '/admin', label: 'Admin' },
  { to: '/about', label: 'About' },
]

export function Logo() {
  return (
    <Link to="/" className="font-display text-2xl font-bold tracking-wide text-white" aria-label="Game Night หน้าหลัก">
      GAME<span className="text-primary">NIGHT</span>
    </Link>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('search') || '')
  const { wishlist } = useCollection()
  const user = useUser()
  const logout = useLogout()

  // ให้ช่องค้นหาตรงกับคำค้นใน URL เมื่ออยู่หน้า Store
  useEffect(() => {
    if (pathname === '/') setQ(params.get('search') || '')
  }, [pathname, params])

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/?search=${encodeURIComponent(term)}` : '/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-neutral/95 backdrop-blur">
      <div className="navbar mx-auto min-h-0 max-w-7xl flex-wrap gap-x-6 gap-y-1 px-4 py-2.5 sm:px-8">
        <Logo />
        <nav aria-label="เมนูหลัก" className="tabs tabs-border order-3 w-full overflow-x-auto md:order-none md:w-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `tab shrink-0 ${isActive ? 'tab-active font-semibold text-white' : 'text-sub'}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <form role="search" onSubmit={submit} className="ml-auto flex min-w-0 flex-1 justify-end md:max-w-xs">
          <label className="input w-full">
            <SearchIcon className="h-4 w-4 text-muted" />
            <input
              id="nav-search"
              type="search"
              aria-label="ค้นหาเกม"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อเกม..."
              className="grow"
            />
          </label>
        </form>
        <div className="indicator">
          {wishlist.length > 0 && (
            <span className="badge indicator-item badge-primary badge-sm font-semibold">{wishlist.length}</span>
          )}
          <Link to="/collection" aria-label={`Wishlist มี ${wishlist.length} เกม`} className="btn btn-square text-primary">
            <HeartIcon className="h-5 w-5" />
          </Link>
        </div>
        {user ? (
          <div className="dropdown dropdown-end">
            <button type="button" aria-label={`บัญชีของ ${user.email}`} className="btn btn-square font-display text-lg text-primary">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </button>
            <ul tabIndex={0} className="menu dropdown-content z-40 mt-2 w-60 rounded-box bg-base-200 p-2 shadow-lg">
              <li className="menu-title">
                <span className="truncate text-white">{user.name || 'ผู้ใช้'}</span>
                <span className="truncate text-xs font-normal text-muted">{user.email}</span>
              </li>
              <li>
                <Link to="/collection">คอลเลกชันของฉัน</Link>
              </li>
              <li>
                <button type="button" onClick={() => void logout()}>
                  ออกจากระบบ
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <Link
            to={pathname === '/login' ? '/login' : `/login?next=${encodeURIComponent(pathname)}`}
            className="btn btn-primary btn-outline"
          >
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </header>
  )
}
