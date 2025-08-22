import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { phoneverify } from '../../service/authService'

const PhoneVerified = () => {
  const location = useLocation()
  const [message, setMessage] = useState('휴대폰 인증 중...')
  const [status, setStatus] = useState(null) // success | error

  useEffect(() => {
    const verifyToken = async () => {
      const params = new URLSearchParams(location.search)
      const phoneNumber = params.get('phoneNumber') // 숫자만(하이픈 X)
      const code = params.get('code')

      if (!phoneNumber || !code) {
        setMessage('인증 정보가 존재하지 않습니다.')
        setStatus('error')
        return
      }

      try {
        const res = await phoneverify({ phoneNumber, code })
        const token = res?.phoneverifyToken

        if (!token) throw new Error('인증 토큰을 받지 못했습니다.')

        localStorage.setItem('phoneVerifide', 'true')
        localStorage.setItem('phoneVerifyToken', token)

        setMessage('이메일 인증이 완료되었습니다.')
        setStatus('success')
      } catch (err) {
        setMessage(err.message || '인증에 실패했습니다.')
        setStatus('error')
      }
    }

    verifyToken()
  }, [location])

  return (
    <div>
      <h2>{message}</h2>
    </div>
  )
}

export default PhoneVerified
