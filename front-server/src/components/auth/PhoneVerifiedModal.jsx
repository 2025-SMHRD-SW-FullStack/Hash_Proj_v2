import React, { useEffect, useState } from 'react'
import styles from './PhoneVerifiedModal.module.css'
import { phoneVerify } from '../../service/authService'

/** [ 휴대폰 인증 확인 모달창 ]
 * - 휴대폰 인증 시 인증됐다는 문구
 * - 확인 버튼 시 모달창 닫힘
 * - 회원가입 페이지에서 인증완료 문구 표시
 */

const PhoneVerifiedModal = ({ phoneNumber, code }) => {
  const [message, setMessage] = useState('휴대폰 인증 중...')
  const [status, setStatus] = useState(null) // success | error
  const [phoneVerifyToken, setPhoneVerifyToken] = useState(null)

  useEffect(() => {
    const verify = async () => {
      try {
        const result = await phoneVerify({ phoneNumber, code })
        setMessage('휴대폰 인증이 완료되었습니다!')
        setStatus('success')
        setPhoneVerifyToken(result.phoneVerifyToken) // 서버에서 내려주는 임시 토큰
      } catch (err) {
        console.error('인증 실패:', err)
        setMessage(err.message || '인증에 실패했습니다.')
        setStatus('error')
      }
    }

    if (phoneNumber && code) verify()
  }, [phoneNumber, code])

  const handleConfirm = () => {
    if (status === 'success') {
      // 부모 창으로 성공 이벤트 및 토큰 전달(팝업에서만 동작)
      if (window.opener) {
        window.opener.postMessage(
          { type: 'phoneVerified', phoneVerifyToken },
          '*'
        )
      }
      // 로컬 저장(부모창 메시지를 못 받았을 때 대비)
      localStorage.setItem('phoneVerified', 'true')
      if (phoneVerifyToken) {
        localStorage.setItem('phoneVerifyToken', phoneVerifyToken)
      }
    } else {
      // (선택) 실패 알림도 보낼 수 있음
      if (window.opener) {
        window.opener.postMessage({ type: 'phoneVerifyFailed' }, '*')
      }
    }

    // 팝업/모달 닫기 (내부 모달로 쓰면 onClose 콜백 사용 권장)
    window.close?.()
  }

  return (
    <div className={styles.modelOverlay}>
      <div className={styles.modal}>
        <h2>{message}</h2>
        <button onClick={handleConfirm}>확인</button>
      </div>
    </div>
  )
}

export default PhoneVerifiedModal
