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

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, logout: storeLogout, isSeller, isAdmin, ensureMe } = useAuthStore()
  const { mode, setMode } = useAppModeStore()

  const [isQRDropdownOpen, setIsQRDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const qrRef = useRef(null)

  // 로그인 후 권한 보정
  useEffect(() => {
    if (isLoggedIn) ensureMe()
  }, [isLoggedIn, ensureMe])

  // 경로 기반 모드 자동 동기화
  useEffect(() => {
    if (location.pathname.startsWith('/seller')) setMode('seller')
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
    navigate('/')
    setIsMobileMenuOpen(false)
  }

  const toggleMode = () => {
    if (mode === 'user') {
      setMode('seller')
      navigate('/seller')
    } else {
      setMode('user')
      navigate('/')
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="flex h-16 sm:h-20 items-center justify-between px-3 sm:px-8">

        {/* 왼쪽 데스크탑 버튼 영역 */}
        <div className="flex flex-1 items-center space-x-2 sm:space-x-3">
          {isLoggedIn && isAdmin && (
            <Button variant="admin" size="sm" className="hidden sm:block" onClick={() => navigate('/admin')}>
              관리자 페이지
            </Button>
          )}
          {isLoggedIn && isSeller && (
            <Button variant="admin" size="sm" className="hidden sm:block" onClick={toggleMode}>
              {mode === 'user' ? '셀러 페이지' : '유저 페이지'}
            </Button>
          )}
        </div>

        {/* 가운데 로고 */}
        <div className="flex flex-1 justify-center">
          <img
            src={Logo}
            alt="먼저써봄 로고"
            className="h-[30px] sm:h-[65px] cursor-pointer"
            onClick={() => navigate('/')}
          />
        </div>

        {/* 오른쪽 데스크탑 아이콘 */}
        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4" ref={qrRef}>
          {/* 햄버거 버튼 모바일용 */}
          <button className="sm:hidden" onClick={() => setIsMobileMenuOpen(true)}>
            <img src={MenuIcon} alt="메뉴" className="w-6 h-6" />
          </button>

          {/* 데스크탑 */}
          {isLoggedIn ? (
            <>
              <Button onClick={logout} className="hidden sm:block text-sm px-3 py-1">
                로그아웃
              </Button>
              <Icon src={User} alt="마이 페이지" size={6} onClick={() => navigate('/user/mypage')} />
              <Icon src={Notification} alt="알림" size={6} />
              <Icon src={Message} alt="채팅" size={6} onClick={() => navigate('/user/chat')} />
              <Icon src={BasketIcon} alt="장바구니" size={6} onClick={() => navigate('/user/mypage/cart')} />
              <div className="relative hidden sm:block">
                <Icon
                  src={QRcode}
                  alt="QR 코드"
                  size={6}
                  onClick={() => setIsQRDropdownOpen(prev => !prev)}
                />
                {isQRDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
                    <QRCodeDisplay url={window.location.href} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button onClick={() => navigate('/login')} className="hidden sm:block text-sm px-3 py-1">
              로그인
            </Button>
          )}
        </div>
      </div>

      {/* 모바일 슬라이드 메뉴 */}
      {isMobileMenuOpen && (
        <div className="fixed top-0 right-0 w-64 h-full bg-white shadow-lg z-50 transform transition-transform duration-300">
          <div className="flex justify-end p-4">
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <img src={CloseIcon} alt="닫기" className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col p-4 space-y-3">
            {isLoggedIn ? (
              <>
                <Button onClick={logout}>로그아웃</Button>
                {isSeller && (
                  <Button onClick={toggleMode}>
                    {mode === 'user' ? '셀러 페이지' : '유저 페이지'}
                  </Button>
                )}
                {isAdmin && (
                  <Button onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false) }}>
                    관리자 페이지
                  </Button>
                )}
                <div className="flex items-center space-x-2">
                  <Icon src={User} alt="마이 페이지" size={6} onClick={() => navigate('/user/mypage')} />
                  <Icon src={Notification} alt="알림" size={6} />
                  <Icon src={Message} alt="채팅" size={6} onClick={() => navigate('/user/chat')} />
                  <Icon src={BasketIcon} alt="장바구니" size={6} onClick={() => navigate('/user/mypage/cart')} />
                  <div className="relative">
                    <Icon
                      src={QRcode}
                      alt="QR 코드"
                      size={6}
                      onClick={() => setIsQRDropdownOpen(prev => !prev)}
                    />
                    {isQRDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
                        <QRCodeDisplay url={window.location.href} />
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <Button onClick={() => { navigate('/login'); setIsMobileMenuOpen(false) }}>
                로그인
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
