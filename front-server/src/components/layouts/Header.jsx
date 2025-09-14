import React, { useEffect, useRef, useState } from 'react'
import Logo from '../../assets/images/Meonjeo_Logo.png'
import User from '../../assets/icons/ic_user.svg'
import Notification from '../../assets/icons/ic_notification.svg'
import Message from '../../assets/icons/ic_message.svg'
import QRcode from '../../assets/icons/ic_qrcode.svg'
import BasketIcon from '../../assets/icons/ic_basket.svg'
import MenuIcon from '../../assets/icons/ic_menu.svg'
import CloseIcon from '../../assets/icons/ic_close.svg'
import Button from '../common/Button'
import Icon from '../common/Icon'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'
import useAppModeStore from '../../stores/appModeStore'
import QRCodeDisplay from '../common/QRCode'
import { motion, AnimatePresence } from 'framer-motion'
import LeftIcon from '../../assets/icons/ic_arrow_left.svg'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, logout: storeLogout, isSeller, isAdmin, ensureMe } = useAuthStore()
  const { mode, setMode } = useAppModeStore()

  const [isQRDropdownOpen, setIsQRDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const qrRef = useRef(null)

  // ✅ 홈(메인) 최상단으로 확실히 이동하는 유틸
  const goHomeTop = () => {
    setIsQRDropdownOpen(false)
    setIsMobileMenuOpen(false)
    // ScrollToTop에 'top' 신호 전달 + 타이밍 안전망
    const snapTop = () => {
      const root =
        document.querySelector('[data-scroll-root]') ||
        document.getElementById('scroll-root') ||
        document.scrollingElement ||
        document.documentElement
      try { root.scrollTo({ top: 0, left: 0, behavior: 'auto' }) } catch { root.scrollTop = 0 }
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    navigate('/', { state: { scroll: 'top', forceTop: true, ts: Date.now() } })
    // 즉시 + 다음 프레임 한번 더 (더블 세이프티)
    snapTop()
    requestAnimationFrame(() => setTimeout(snapTop, 0))
  }

  // 로그인 후 권한 보정
  useEffect(() => {
    if (isLoggedIn) ensureMe()
  }, [isLoggedIn, ensureMe])

  // 경로 기반 모드 자동 동기화
  useEffect(() => {
    if (location.pathname.startsWith('/seller')) setMode('seller')
    else if (location.pathname.startsWith('/admin')) setMode('admin')
    else setMode('user')
  }, [location.pathname, setMode])

  // 바깥 클릭 시 QR 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (qrRef.current && !qrRef.current.contains(e.target)) {
        setIsQRDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const logout = () => {
    storeLogout()
    goHomeTop()
  }

  const toggleMode = () => {
    if (mode === 'user') {
      setMode('seller')
      navigate('/seller')
    } else {
      setMode('user')
      goHomeTop()
    }
    setIsMobileMenuOpen(false)
  }

  const handleAdminToggle = () => {
    if (mode === 'user') {
      setMode('admin')
      navigate('/admin')
    } else {
      setMode('user')
      goHomeTop()
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="flex h-16 sm:h-20 items-center justify-between px-3 sm:px-8">

        {/* 왼쪽 데스크탑 버튼 영역 */}
        <div className="flex flex-1 items-center space-x-2 sm:space-x-3">

          {/* 모바일 버튼 */}
          <div className="sm:hidden flex items-center">
            <Icon src={LeftIcon} onClick={() => navigate(-1)}/>
            {isLoggedIn && isAdmin && (
              <Button variant={mode === 'user' ? 'admin' : 'signUp'} size="sm" onClick={handleAdminToggle}>
                {mode === 'user' ? '관리자 페이지' : '유저 페이지'}
              </Button>
            )}
            {isLoggedIn && isSeller && (
              <Button variant={mode === 'user' ? 'admin' : 'signUp'} size="sm" onClick={toggleMode}>
                {mode === 'user' ? '셀러 페이지' : '유저 페이지'}
              </Button>
            )}
          </div>

          {/* 데스크탑 버튼 */}
          <div className="hidden sm:flex items-center space-x-2">
            {isLoggedIn && isAdmin && (
              <Button variant={mode === 'user' ? 'admin' : 'signUp'} size="md" onClick={handleAdminToggle}>
                {mode === 'user' ? '관리자 페이지' : '유저 페이지'}
              </Button>
            )}
            {isLoggedIn && isSeller && (
              <Button variant={mode === 'user' ? 'admin' : 'signUp'} size="md" onClick={toggleMode}>
                {mode === 'user' ? '셀러 페이지' : '유저 페이지'}
              </Button>
            )}
          </div>

</div>



        {/* 가운데 로고 */}
        <div className="flex justify-center">
          <img
            src={Logo}
            alt="먼저써봄 로고"
            className="h-[30px] sm:h-[65px] cursor-pointer"
            onClick={goHomeTop}
          />
        </div>

        {/* 오른쪽 */}
        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4" ref={qrRef}>
          {isLoggedIn ? (
            <>
              {/* 모바일: 로그아웃 + 햄버거 */}
              <div className="flex items-center sm:hidden">
                <Button variant='signUp' size='sm' onClick={logout}>
                  로그아웃
                </Button>
                <button onClick={() => setIsMobileMenuOpen(true)} className='border-none bg-transparent'>
                  <img src={MenuIcon} alt="메뉴" className="w-6 h-6" />
                </button>
              </div>

              {/* 데스크탑 아이콘들 */}
              <div className="hidden  sm:flex items-center space-x-4">
                <Button variant='signUp' size='sm' onClick={logout}>
                  로그아웃
                </Button>
                <Icon src={User} alt="마이 페이지" onClick={() => navigate('/user/mypage')} />
                <Icon src={Message} alt="채팅" onClick={() => navigate('/user/chat')} />
                <Icon src={BasketIcon} alt="장바구니" onClick={() => navigate('/user/mypage/cart')} />
                <div className="relative">
                  <Icon
                    src={QRcode}
                    alt="QR 코드"
                    onClick={() => setIsQRDropdownOpen(prev => !prev)}
                  />
                  {isQRDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
                      <QRCodeDisplay url={`${window.location.origin}/`} />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center">
              <Button size='md' className='hidden sm:block' onClick={() => navigate('/login')} >
                로그인
              </Button>
              <Button size='sm' className='flex sm:hidden' onClick={() => navigate('/login')}>
                로그인
              </Button>
              {/* 👇 비로그인 상태에서도 QR 노출 (CSS 영향 최소: inline-block + ml-2만 추가) */}
              <div className="relative inline-block ml-2">
                <Icon
                  src={QRcode}
                  alt="QR 코드"
                  onClick={() => setIsQRDropdownOpen(prev => !prev)}
                />
                {isQRDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
                    {/* 🔒 항상 메인으로 고정 */}
                    <QRCodeDisplay url={`${window.location.origin}/`} />
                  </div>
                )}
              </div>

            </div>
            
          )}
        </div>
      </div>

      {/* 모바일 슬라이드 메뉴 */}
      <AnimatePresence>
        {isLoggedIn && isMobileMenuOpen && (
          <>
            {/* 배경 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* 슬라이드 메뉴 */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3 }}
              className="fixed top-0 right-0 w-4/5 max-w-xs h-full bg-white shadow-lg z-50"
            >
              <div className="flex justify-end p-4">
                <button onClick={() => setIsMobileMenuOpen(false)} className='border-none bg-transparent'>
                  <img src={CloseIcon} alt="닫기" className="w-6 h-6" />
                </button>
              </div>
              
              {/* 모바일 메뉴 버튼 */}
              <div className="flex flex-col p-4 space-y-3">
                <Button variant='signUp' onClick={() => { navigate('/user/mypage'); setIsMobileMenuOpen(false) }}>마이페이지</Button>
                <Button variant='signUp' onClick={() => { navigate('/user/chat'); setIsMobileMenuOpen(false) }}>채팅</Button>
                <Button variant='signUp' onClick={() => { navigate('/user/mypage/cart'); setIsMobileMenuOpen(false) }}>장바구니</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Header
