// /src/components/layouts/SellerLayout.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import sellerNav from '../../config/sellerNav'

const itemBase =
  'block w-full rounded-xl px-3 py-2 text-sm transition-colors select-none'
const itemIdle = 'text-gray-900 hover:bg-gray-100'
const itemActive = 'bg-black text-white'

export default function SellerLayout({ children }) {
  const { pathname } = useLocation()

  // 피드백 그룹 open 상태: 경로가 /seller/feedbacks* 이면 자동 open
  const inFeedback = pathname.startsWith('/seller/feedbacks')
  const [openFeedback, setOpenFeedback] = useState(inFeedback)

  // 라우트 변경 시 동기화
  useEffect(() => {
    setOpenFeedback(pathname.startsWith('/seller/feedbacks'))
  }, [pathname])

  const navItems = useMemo(() => sellerNav, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <Header />

      <div className="flex w-full gap-8 px-6 py-6">
        {/* 사이드바 */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="space-y-1">
            {navItems.map((it) => {
              // 일반 항목
              if (it.type !== 'group') {
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === '/seller'}
                    className={({ isActive }) =>
                      `${itemBase} ${isActive ? itemActive : itemIdle}`
                    }
                  >
                    {it.label}
                  </NavLink>
                )
              }

              // 그룹(상품 피드백)
              const groupActive = inFeedback
              return (
                <div key={it.to} className="space-y-1">
                  {/* 그룹 헤더 */}
                  <button
                    type="button"
                    onClick={() => setOpenFeedback((v) => !v)}
                    className={`${itemBase} ${groupActive ? itemActive : itemIdle} text-left`}
                  >
                    {it.label}
                  </button>

                  {/* 서브메뉴 */}
                  {openFeedback && (
                    <div className="space-y-1 pl-4">
                      {it.children?.map((c) => (
                        <NavLink
                          key={c.to}
                          to={c.to}
                          className={({ isActive }) =>
                            `${itemBase} ${isActive ? itemActive : itemIdle}`
                          }
                        >
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </aside>

        {/* 콘텐츠 */}
        <section className="flex-1 max-w-[1600px]">
          {children || <Outlet />}
        </section>
      </div>
    </div>
  )
}
