import React, { useState, useRef, useEffect } from 'react'
import Logo from '../../assets/images/ReSsol_Logo1.png'
import User from '../../assets/icons/ic_user.svg'
import Notification from '../../assets/icons/ic_notification.svg'
import Message from '../../assets/icons/ic_message.svg'
import QRcode from '../../assets/icons/ic_qrcode.svg'
import BasketIcon from '../../assets/icons/ic_basket.svg'
import Button from '../common/Button'
import Icon from '../common/Icon'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'
import QRCodeDisplay from '../common/QRCode'

const Header = () => {
  const navigate = useNavigate()
  const { isLoggedIn, logout: storeLogout, userRole } = useAuthStore()
  const [isQRDropdownOpen, setIsQRDropdownOpen] = useState(false)
  const qrRef = useRef(null)

  const logout = () => {
    storeLogout()
    navigate('/')
  }

  const canSeeSellerButton = isLoggedIn && userRole === 'Admin'

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (qrRef.current && !qrRef.current.contains(e.target)) {
        setIsQRDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="flex items-center justify-between px-4 sm:px-8 h-16 sm:h-20">
        <div className="flex-1" />
        
        {/* 로고 */}
        <div className="flex-1 flex justify-center">
          <img
            src={Logo}
            alt="먼저써봄 로고"
            className="h-[30px] sm:h-[65px] cursor-pointer"
            onClick={() => navigate('/')}
          />
        </div>

        {/* 오른쪽 */}
        <div className="flex-1 flex justify-end items-center space-x-3 sm:space-x-4">
          {canSeeSellerButton && (
            <Button variant="admin" size="md" onClick={() => navigate('/seller')}>
              셀러 페이지
            </Button>
          )}
          {isLoggedIn ? (
            <div className="flex items-center space-x-2 sm:space-x-3 relative" ref={qrRef}>
              <Button onClick={logout} className="hidden sm:block">로그아웃</Button>
              <Icon src={User} alt="마이 페이지" size="6" onClick={() => navigate('/user/mypage')} />
              <Icon src={Notification} alt="알림" size="6" />
              <Icon src={Message} alt="채팅" size="6" onClick={() => navigate('/user/chat')} />
              <Icon src={BasketIcon} alt="장바구니" size="6" onClick={() => navigate('/user/mypage/cart')} />
              
              {/* ✅ QR 코드 아이콘 (드롭다운 토글) */}
              <div className="hidden sm:block relative">
                <Icon
                  src={QRcode}
                  alt="QR 코드"
                  size="6"
                  onClick={() => setIsQRDropdownOpen((prev) => !prev)}
                />
                {isQRDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <QRCodeDisplay url={window.location.href} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Button onClick={() => navigate('/login')}>로그인</Button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
