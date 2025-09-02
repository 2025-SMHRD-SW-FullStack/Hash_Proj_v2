// /src/components/layouts/AdminLayout.jsx
import React, { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Header from './Header'
import adminNav from '/src/config/adminNav'
import Button from '/src/components/common/Button'

const itemBase   = 'block w-full rounded-xl px-3 py-2 text-sm transition-colors select-none text-center focus:outline-none'
const itemIdle   = 'text-gray-900 hover:bg-gray-100'
const itemActive = 'bg-[#ADD973] text-white'
const cx = (...xs) => xs.filter(Boolean).join(' ')
const navClass = ({ isActive }) => cx(itemBase, isActive ? itemActive : itemIdle)

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header />

      {/* 모바일 메뉴 버튼 */}
      <div className="px-3 pb-3 pt-4 lg:hidden">
        <Button variant="admin" onClick={() => setMobileOpen(true)}>메뉴</Button>
      </div>

      {/* 레이아웃 */}
      <div className="flex gap-4 px-4 pb-6 lg:gap-6 lg:px-6">
        {/* 사이드바 */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="rounded-2xl border p-3 shadow-sm">
            <nav className="space-y-1">
              {adminNav.map(({ to, label }) => (
                <NavLink key={to} to={to} end={to === '/admin'} className={navClass}>
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* 본문: Outlet만 남김 */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* 모바일 드로어 */}
      {mobileOpen && (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="오버레이"
          />
          <div
            className={`fixed left-0 top-0 z-50 h-full w-80 bg-white shadow-xl ring-1 ring-black/5 transition-transform lg:hidden ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">관리자 메뉴</span>
              <Button variant="admin" size="sm" onClick={() => setMobileOpen(false)}>
                닫기
              </Button>
            </div>
            <nav className="space-y-1 p-3">
              {adminNav.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin'}
                  className={navClass}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
