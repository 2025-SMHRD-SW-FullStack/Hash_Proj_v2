import React from 'react'
import logoImg from '/src/assets/images/logo.png'
import styles from './Header.module.css'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import useGoHome from '/src/hooks/useGoHome'
import { logoutHandler } from '../../util/logoutHandler'

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const goHome = useGoHome();

    // 메인, 로그인, 회원가입 페이지에서는 네비바 숨김 처리
    const hideNav = location.pathname === '/' ||
                location.pathname.startsWith('/login') ||
                location.pathname.startsWith('/signup');

    // 로그인 상태 확인
    const isLoggedIn = !!localStorage.getItem('accessToken');
     
    

    /** 로그아웃 처리 함수 */
    const handleLogout = () => {
        logoutHandler();
        alert('로그아웃 되었습니다.');
        navigate('/');
    }  

    return (
        <div>
            <header className={styles.wrapper}>
                <img className={styles.logo} src={logoImg} alt="로고이미지" onClick={goHome} />
                <div className={styles.authButtons}>
                    {/* 로그인 상태에 따라 버튼 조건부 렌더링 */}
                    {isLoggedIn ? (
                        <>
                            <Link to="/mypage">마이페이지</Link>
                            <button onClick={handleLogout} className={styles.logoutBtn}>로그아웃</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">로그인</Link>
                            <Link to="/signup">회원가입</Link>
                        </>
                    )}
                    
                </div>
            </header>

            {/* 메인,로그인,회원가입 페이지 아니면 네비바 보여주기 */}
            {!hideNav &&(   
                <nav className={styles.nav}>
                    <NavLink to='/item' className={({isActive}) => isActive ? styles.active : ''}>품목</NavLink>
                    <NavLink to='/exhibition' className={({isActive}) => isActive ? styles.active : ''}>상품</NavLink>
                    <NavLink to='/platform' className={({isActive}) => isActive ? styles.active : ''}>중개 플랫폼</NavLink>
                    <NavLink to='/chatbot' className={({isActive}) => isActive ? styles.active : ''}>챗봇</NavLink>
                </nav>
            )}
        </div>
    )
}
export default Header