import React from 'react'
import logoImg from '/src/assets/images/logo.png'
import { Link, useNavigate } from 'react-router-dom'
import styles from './LoginForm.module.css'
import SocialLoginButtons from './SocialLoginButtons'
import TextField from '../common/TextField'
import { useLoginForm } from '/src/hooks/useLoginForm'
import { loginRequest } from '/src/service/authService'
import useGoHome from '/src/hooks/useGoHome'
import Button from '../Button'

const LoginForm = () => {
  const navigate = useNavigate()
  const goHome = useGoHome()

  const { email, setEmail, password, setPassword, isValid } = useLoginForm()

  /** [ 로그인 처리 함수 ] */
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const res = await loginRequest({ email, password })
      console.log('응답 결과: ', res)

      if (res.token) {
        // 로그인 성공 시 accessToken 저장
        localStorage.setItem('accessToken', res.token)
        // localStorage.setItem('userId', res.user.id.toString());
      } else {
        console.warn('accessToken 없음: ', res)
      }

      alert('로그인에 성공했습니다.')
      console.log('토큰 확인:', res.token)
      console.log('로컬스토리지 토큰:', localStorage.getItem('accessToken'))
      navigate('/')
    } catch (error) {
      if (error.response && error.response.status === 401) {
        alert('비밀번호가 일치하지 않습니다.')
      } else if (error.response && error.response.status === 404) {
        alert('해당 이메일로 등록된 계정이 없습니다.')
      } else {
        alert('로그인에 실패했습니다. 다시 시도해주세요.')
      }

      console.log('로그인 실패: ', error)
    }
  }

  return (
    <div className={styles.wrapper}>
      <img
        className={styles.logo}
        src={logoImg}
        alt="로고이미지"
        onClick={goHome}
      />
      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          id="email"
          label="이메일"
          type="email"
          required
          singleFirst
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          id="password"
          label="비밀번호"
          type="password"
          required
          singleLast
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={!isValid}>
          로그인
        </Button>
        <Button variant="signUp" onClick={() => navigate('/email_signup')}>
          이메일로 회원가입
        </Button>
      </form>
      <SocialLoginButtons title={'간편 로그인'} />
    </div>
  )
}

export default LoginForm
