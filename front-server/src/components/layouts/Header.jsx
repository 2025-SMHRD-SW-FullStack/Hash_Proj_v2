import React from 'react'
import Logo from '../../assets/images/ReSsol_Logo1.png'
import styles from './Header.module.css'
import User from '../../assets/icons/ic_user.svg'
import Notification from '../../assets/icons/ic_notification.svg'
import Message from '../../assets/icons/ic_message.svg'
import QRcode from '../../assets/icons/ic_qrcode.svg'
import Button from '../common/Button'
import Icon from '../common/Icon'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'

const Header = () => {
  const navigate = useNavigate()
  const { isLoggedIn, logout: storeLogout } = useAuthStore()

  const logout = () => {
    storeLogout()
    navigate('/')
  }

  // 현재 정책: 로그인하면 모두에게 셀러 페이지 버튼 노출
  const canSeeSellerButton = isLoggedIn

  return (
    <header className="sticky top-0 z-50 flex flex-row items-center justify-between bg-white text-[#222222] shadow-md">
      {/* 왼쪽: 로고 */}
      <img
        src={Logo}
        alt="먼저써봄 로고"
        className="m-4 h-[30px] cursor-pointer sm:h-[65px]"
        onClick={() => navigate('/')}
      />

      {/* 오른쪽: 액션들 */}
      <div className="mr-8 flex items-center space-x-2 sm:space-x-4">
        {/* ✅ 장바구니 버튼 추가 (누구나 노출해도 무방) */}
        <Button
          variant="signUp"
          size="md"
          onClick={() => navigate('/user/mypage/cart')}
        >
          장바구니
        </Button>

        {canSeeSellerButton && (
          <Button
            variant="admin"
            size="md"
            onClick={() => navigate('/seller')}
          >
            셀러 페이지
          </Button>
        )}

        {isLoggedIn ? (
          <div className="flex items-center space-x-2">
            <Button onClick={logout}>로그아웃</Button>
            <Icon src={User} alt="마이 페이지" onClick={() => navigate('/user/mypage')} />
            <Icon src={Notification} alt="알림" />
            <Icon
              src={Message}
              alt="채팅"
              onClick={() => navigate('/user/chat')}
            />
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
