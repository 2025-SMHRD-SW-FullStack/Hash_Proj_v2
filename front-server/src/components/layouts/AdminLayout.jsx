import React, { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

const navItem = (
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100'
)

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden rounded-md border px-2 py-1" onClick={() => setOpen(v => !v)} aria-label="Toggle Menu">☰</button>
            <Link to="/admin" className="text-base font-bold">먼저써봄 Admin</Link>
          </div>
          <div className="text-sm text-gray-500">관리자 콘솔</div>
        </div>
      </header>

      {/* 본문 레이아웃 */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        {/* 사이드바 */}
        <aside className={`${open ? 'block' : 'hidden'} md:block`}>
          <nav className="rounded-xl border bg-white p-2 shadow-sm">
            <NavLink to="/admin" end className={({isActive}) => `${navItem} ${isActive ? 'bg-gray-100' : ''}`}>대시보드</NavLink>
            <NavLink to="/admin/feedbacks/reports" className={({isActive}) => `${navItem} ${isActive ? 'bg-gray-100' : ''}`}>피드백 신고관리</NavLink>
            {/* <NavLink to="/admin/ads/review" className={({isActive}) => `${navItem} ${isActive ? 'bg-gray-100' : ''}`}>광고 심사</NavLink> */}
          </nav>
        </aside>

        {/* 콘텐츠 */}
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}