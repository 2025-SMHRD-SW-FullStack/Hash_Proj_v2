import React, { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import styles from './Mypage.module.css'

const menus = [
  { to: 'user_info', label: '회원 정보' },
  { to: 'com_info', label: '회사 정보' },
  { to: 'favorite_item', label: '즐겨찾기' },
  { to: 'product_list', label: '내 상품 리스트' },
]

const MyPage = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // ✅ 최초 경로가 /mypage면 /mypage/user_info로 이동
  useEffect(() => {
    if (location.pathname === '/mypage') {
      navigate('user_info', { replace: true })
    }
  }, [location.pathname, navigate])

  return (
    <div className={styles.pageWrapper}>
      <nav className={styles.sideNav}>
        {menus.map((menu) => (
          <Link
            key={menu.to}
            to={menu.to}
            className={location.pathname.includes(menu.to) ? styles.active : ''}
          >
            {menu.label}
          </Link>
        ))}
      </nav>
      <div className={styles.contentArea}>
        <Outlet />
      </div>
    </div>
  )
}

export default MyPage
