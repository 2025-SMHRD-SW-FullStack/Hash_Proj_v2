import React from 'react'
import Logo from '../../assets/images/ReSsol_Logo1.png'
import styles from './Header.module.css'
import User from '../../assets/icons/ic_user.svg'
import Notification from '../../assets/icons/ic_notification.svg'
import Message from '../../assets/icons/ic_message.svg'
import QRcode from '../../assets/icons/ic_qrcode.svg'
import Button from '../Button'
import Icon from '../Icon'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Header = () => {
  const { isLoggedIn, login, logout, userRole } = useAuth()
  const navigate = useNavigate()

  const clickMessage = () => {
    navigate('/chat')
  }

  return (
    <header className="sticky top-0 z-50 flex flex-row items-center justify-between bg-white text-[#222222] shadow-md">
      {/* 왼쪽 영역 */}
      <div className="flex items-center space-x-6">
        <img src={Logo} alt="리쏠 로고" className="m-4 h-[30px] sm:h-[65px]" />
        <div className={styles.nav}>가게</div>
        <div className={styles.nav}>상품</div>
      </div>

      {/* 오른쪽 영역 */}
      <div className="mr-8 flex items-center space-x-4">
        {isLoggedIn && (userRole === 'OWNER' || userRole === 'ADMIN') && (
          <Button className="bg-[#ADD973]">관리자 페이지</Button>
        )}

        {isLoggedIn ? (
          <div className="flex items-center space-x-2">
            <Button
              className="border px-4 py-1 hover:bg-gray-400"
              onClick={logout}
            >
              로그아웃
            </Button>
            <Icon src={User} alt="마이 페이지" />
            <Icon src={Notification} alt="알림" />
            <Icon src={Message} alt="채팅" onClick={clickMessage} />
            <Icon src={QRcode} alt="QR 코드" />
          </div>
        ) : (
          <Button
            className="border px-4 py-1 hover:bg-gray-400"
            onClick={() => login('OWNER')}
          >
            로그인
          </Button>
        )}
      </div>
    </header>
  )
}

export default Header
