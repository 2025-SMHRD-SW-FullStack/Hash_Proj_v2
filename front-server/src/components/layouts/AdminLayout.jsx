// /src/components/layouts/AdminLayout.jsx
import React, { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Header from './Header'
import adminNav from '/src/config/adminNav'
import Button from '/src/components/common/Button'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '../common/Icon'
import CloseIcon from '../../assets/icons/ic_close.svg'

const baseLinkStyle =
  'block w-full p-3 text-left text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors no-underline'
const selectedLinkStyle = 'bg-[#CFADE5] text-white font-semibold'

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* 모바일 상단 바 */}
      <div className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 lg:hidden">
        <div className="pl-4 mt-4 lg:hidden">
          <Button variant="admin" size="md" onClick={() => setMobileOpen(true)}>
            메뉴
          </Button>
        </div>
      </div>

      <div className="flex w-full gap-8 justify-center lg:justify-start px-4 lg:px-6 pb-6">
        {/* 사이드바(데스크톱) */}
        <aside className="hidden fixed left-0 top-0 h-full w-56 shadow-sm shrink-0 lg:block p-4">
          <nav className="space-y-2">
            {adminNav.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  `${baseLinkStyle} ${isActive ? selectedLinkStyle : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* 모바일 드로어 */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* 오버레이 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-50 bg-black lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              {/* 드로어 */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3 }}
                role="dialog"
                aria-modal="true"
                className="fixed left-0 top-0 z-50 h-full w-80 bg-white shadow-xl ring-1 ring-black/5 lg:hidden"
              >
                <button className="border-none bg-transparent">
                  <Icon src={CloseIcon} onClick={() => setMobileOpen(false)} className='!w-5 !h-5 px-4 py-3'/>
                </button>
                <nav className="space-y-2 p-3 pr-16">
                  {adminNav.map(({ to, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/admin'}
                      className={({ isActive }) =>
                        `${baseLinkStyle} ${isActive ? selectedLinkStyle : ''}`
                      }
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </NavLink>
                  ))}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 본문: Outlet */}
        <main className="w-full max-w-[1600px] p-4 sm:p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
