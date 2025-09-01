import React, { useEffect, useRef, useState } from 'react'
import Logo from '../../assets/images/Meonjeo_Logo.png'
import User from '../../assets/icons/ic_user.svg'
import Notification from '../../assets/icons/ic_notification.svg'
import Message from '../../assets/icons/ic_message.svg'
import QRcode from '../../assets/icons/ic_qrcode.svg'
import BasketIcon from '../../assets/icons/ic_basket.svg'
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
  const qrRef = useRef(null)

  // 로그인 후 권한 보정
  useEffect(() => {
    if (isLoggedIn) ensureMe()
  }, [isLoggedIn, ensureMe])

  // ✅ 경로 기반 모드 자동 동기화
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
  }

  const canSeeSellerButton = isLoggedIn && isSeller
  const canSeeAdminButton = isLoggedIn && isAdmin

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="flex h-16 items-center justify-between px-4 sm:h-20 sm:px-8">
        
        {/* 왼쪽 (셀러/관리자 버튼) */}
        <div className="flex flex-1 items-center">
          {canSeeAdminButton && (
            <Button variant="admin" size="md" onClick={() => navigate('/admin')}>
              관리자 페이지
            </Button>
          )}

          {canSeeSellerButton && mode === 'user' && (
            <Button
              variant="admin"
              size="md"
              onClick={() => { setMode('seller'); navigate('/seller') }}
            >
              셀러 페이지
            </Button>
          )}
          {canSeeSellerButton && mode === 'seller' && (
            <Button
              variant="admin"
              size="md"
              onClick={() => { setMode('user'); navigate('/') }}
            >
              유저 페이지
            </Button>
          )}
        </div>

        {/* 가운데 로고 */}
        <div className="flex flex-1 justify-center">
          <img
            src={Logo}
            alt="먼저써봄 로고"
            className="h-[30px] cursor-pointer sm:h-[65px]"
            onClick={() => navigate('/')}
          />
        </div>

        {/* 오른쪽 아이콘 영역 */}
        <div className="flex flex-1 items-center justify-end space-x-3 sm:space-x-4" ref={qrRef}>
          {isLoggedIn ? (
            <>
              <Button onClick={logout} className="hidden sm:block">로그아웃</Button>
              <Icon src={User} alt="마이 페이지" size="6" onClick={() => navigate('/user/mypage')} />
              <Icon src={Notification} alt="알림" size="6" />
              <Icon src={Message} alt="채팅" size="6" onClick={() => navigate('/user/chat')} />
              <Icon src={BasketIcon} alt="장바구니" size="6" onClick={() => navigate('/user/mypage/cart')} />

              {/* ✅ QR 코드 드롭다운 */}
              <div className="relative hidden sm:block">
                <Icon
                  src={QRcode}
                  alt="QR 코드"
                  size="6"
                  onClick={() => setIsQRDropdownOpen((prev) => !prev)}
                />
                {isQRDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
                    <QRCodeDisplay url={window.location.href} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button onClick={() => navigate('/login')}>로그인</Button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
