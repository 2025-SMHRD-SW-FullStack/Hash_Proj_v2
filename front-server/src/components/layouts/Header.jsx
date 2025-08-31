import React, { useEffect } from 'react'
import Logo from '../../assets/images/ReSsol_Logo1.png'
import styles from './Header.module.css'
import User from '../../assets/icons/ic_user.svg'
import Notification from '../../assets/icons/ic_notification.svg'
import Message from '../../assets/icons/ic_message.svg'
import QRcode from '../../assets/icons/ic_qrcode.svg'
import Button from '../common/Button'
import Icon from '../common/Icon'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'
import useAppModeStore from '../../stores/appModeStore'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, logout: storeLogout, isSeller, isAdmin, ensureMe } = useAuthStore()
  const { mode, setMode } = useAppModeStore()

  // 로그인 후 권한 보정
  useEffect(() => {
    if (isLoggedIn) ensureMe()
  }, [isLoggedIn, ensureMe])

  // ✅ 경로 기반 모드 자동 동기화 (/seller/* 는 'seller', 그 외 'user')
  useEffect(() => {
    if (location.pathname.startsWith('/seller')) setMode('seller')
    else setMode('user')
  }, [location.pathname, setMode])

  const logout = () => {
    storeLogout()
    navigate('/')
  }

  const canSeeSellerButton = isLoggedIn && isSeller
  const canSeeAdminButton = isLoggedIn && isAdmin

  const goChat = () => {
    navigate(mode === 'seller' ? '/seller/chat' : '/user/chat')
  }

  return (
    <header className="sticky top-0 z-50 flex flex-row items-center justify-between bg-white text-[#222222] shadow-md">
      <img
        src={Logo}
        alt="먼저써봄 로고"
        className="m-4 h-[30px] cursor-pointer sm:h-[65px]"
        onClick={() => navigate('/')}
      />

      <div className="mr-8 flex items-center space-x-2 sm:space-x-4">
        <Button variant="signUp" size="md" onClick={() => navigate('/user/mypage/cart')}>
          장바구니
        </Button>

        {/* 관리자 전용 */}
        {canSeeAdminButton && (
          <Button variant="admin" size="md" onClick={() => navigate('/admin')}>
            관리자 페이지
          </Button>
        )}

        {/* 셀러 전용 토글 */}
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

        {isLoggedIn ? (
          <div className="flex items-center space-x-2">
            <Button onClick={logout}>로그아웃</Button>
            <Icon src={User} alt="마이 페이지" onClick={() => navigate('/user/mypage')} />
            <Icon src={Notification} alt="알림" />
            <Icon src={Message} alt="채팅" onClick={goChat} />
            <Icon src={QRcode} alt="QR 코드" />
          </div>
        ) : (
          <Button onClick={() => navigate('/login')}>로그인</Button>
        )}
      </div>
    </header>
  )
}

export default Header
