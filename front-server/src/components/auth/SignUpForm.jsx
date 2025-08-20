import React from 'react'
import styles from '../auth/SignUpForm.module.css'
import logoImg from '../../assets/images/logo.png'
import { Link, useNavigate } from 'react-router-dom'
import SocialLoginButtons from './SocialLoginButtons'
import useGoHome from '../../hooks/useGoHome'

const SignUpForm = () => {
  const goHome = useGoHome()
  const navigate = useNavigate()
  /** [ 이메일 회원가입 페이지 로 이동 버튼 ]
   * - 버튼 클릭 시 이메일 회원가입 페이지로 이동한다*/
  const emailSignUpPage = () => {
    navigate('/email_signup')
  }

  return (
    <div className={styles.wrapper}>
      <img
        className={styles.logo}
        src={logoImg}
        alt="로고 이미지"
        onClick={goHome}
      />
      <button onClick={emailSignUpPage}>이메일로 회원가입</button>
      <div className={styles.loginRedirect}>
        <p>이미 계정이 있으신가요?</p>
        <Link to="/login">로그인 하기</Link>
      </div>
      <SocialLoginButtons title={'간편 회원가입'} />
    </div>
  )
}

export default SignUpForm
