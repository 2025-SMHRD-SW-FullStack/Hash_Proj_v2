// /src/components/layouts/SellerLayout.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import sellerNav from '../../config/sellerNav'
import { fetchOrderStatusCounts } from '../../service/statsService'
import Button from '/src/components/common/Button'

const itemBase = 'block w-full rounded-xl px-3 py-2 text-sm transition-colors select-none text-center'
const itemIdle = 'text-gray-900 hover:bg-gray-100'
const itemActive = 'bg-black text-white'

const cx = (...xs) => xs.filter(Boolean).join(' ')
const navClass = (isActive, extraIdle, extraActive) =>
  cx(itemBase, isActive ? itemActive : itemIdle, isActive ? extraActive : extraIdle)

const ORDERS_PATH = '/seller/orders'

export default function SellerLayout({ children }) {
  const { pathname } = useLocation()

  const inFeedback = pathname.startsWith('/seller/feedbacks')
  const [openFeedback, setOpenFeedback] = useState(inFeedback)

  const [orderCounts, setOrderCounts] = useState({ READY: 0, SHIPPING: 0, DELIVERED: 0, ALL: 0 })
  const [loadingCounts, setLoadingCounts] = useState(false)

  // 모바일 드로어
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setOpenFeedback(pathname.startsWith('/seller/feedbacks'))
    // 라우트 바뀌면 드로어 닫기
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    let alive = true
      ; (async () => {
        try {
          setLoadingCounts(true)
          const res = await fetchOrderStatusCounts()
          if (alive && res) setOrderCounts(res)
        } finally {
          if (alive) setLoadingCounts(false)
        }
      })()
    return () => { alive = false }
  }, [])

  // 화면이 lg 이상으로 커지면 드로어 자동 닫힘
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e) => e.matches && setMobileOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const navItems = useMemo(() => sellerNav, [])

  const OrdersMini = () => (
    <div className="text-center text-[11px] text-gray-600">
    </div>
  )

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <Header />

      {/* 🔹 모바일 상단 바(햄버거 버튼) — Admin처럼 */}
      <div className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 lg:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="px-3 pb-3 pt-4 lg:hidden">
            <Button variant="admin" onClick={() => setMobileOpen(true)}>메뉴</Button>
          </div>
        </div>
      </div>

      <div className="flex w-full gap-8 px-6 py-6">
        {/* 사이드바(데스크톱) */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="space-y-1">
            {navItems.map((it) => {
              if (it.type !== 'group') {
                const isOrders = it.to === ORDERS_PATH
                return (
                  <div key={it.to} className="space-y-1">
                    <NavLink
                      to={it.to}
                      end={it.to === '/seller'}
                      className={({ isActive }) =>
                        navClass(isActive, it.className, it.activeClassName)
                      }
                    >
                      {it.label}
                    </NavLink>
                    {isOrders && <OrdersMini />}
                  </div>
                )
              }
              const groupActive = inFeedback
              return (
                <div key={it.to} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setOpenFeedback((v) => !v)}
                    className={navClass(groupActive, it.className, it.activeClassName)}
                  >
                    {it.label}
                  </button>
                  {openFeedback && (
                    <div className="space-y-1">
                      {it.children?.map((c) => (
                        <NavLink
                          key={c.to}
                          to={c.to}
                          className={({ isActive }) =>
                            navClass(isActive, c.className, c.activeClassName)
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

        {/* 🔹 모바일 드로어 */}
        {mobileOpen && (
          <>
            <button
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="오버레이 닫기"
            />
            <div
              role="dialog"
              aria-modal="true"
              className={`fixed left-0 top-0 z-50 h-full w-80 bg-white shadow-xl ring-1 ring-black/5 transition-transform lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold">메뉴</span>
                <Button variant="admin" size="sm" onClick={() => setMobileOpen(false)}>
                  닫기
                </Button>
              </div>
              <nav className="space-y-1 p-3">
                {navItems.map((it) => {
                  if (it.type !== 'group') {
                    const isOrders = it.to === ORDERS_PATH
                    return (
                      <div key={it.to} className="space-y-1">
                        <NavLink
                          to={it.to}
                          end={it.to === '/seller'}
                          className={({ isActive }) =>
                            navClass(isActive, it.className, it.activeClassName)
                          }
                          onClick={() => setMobileOpen(false)}
                        >
                          {it.label}
                        </NavLink>
                        {isOrders && <OrdersMini />}
                      </div>
                    )
                  }
                  return (
                    <div key={it.to} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setOpenFeedback((v) => !v)}
                        className={navClass(inFeedback, it.className, it.activeClassName)}
                      >
                        {it.label}
                      </button>
                      {openFeedback && (
                        <div className="space-y-1">
                          {it.children?.map((c) => (
                            <NavLink
                              key={c.to}
                              to={c.to}
                              className={({ isActive }) =>
                                navClass(isActive, c.className, c.activeClassName)
                              }
                              onClick={() => setMobileOpen(false)}
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
            </div>
          </>
        )}

        {/* 콘텐츠 */}
        <section 
        className="max-w-[1600px] flex-1">
          {children || <Outlet />}
        </section>
      </div>
    </div>
  )
}
