import React from 'react'
import { useSearchParams } from 'react-router-dom'
import PhoneVerifiedModal from '../../components/auth/PhoneVerifiedModal'

/** [ 휴대폰 인증 처리 핸들러 ]
 * - 토큰 추출 해서 이메일 인증 모달페이지에 전달
 */
const PhoneVerifiedHandler = () => {
  const [searchParams] = useSearchParams()
  const phoneNumber = searchParams.get('phoneNumber') // 숫자만(하이픈 X)
  const code = searchParams.get('code') // 인증번호

  return <PhoneVerifiedModal phoneNumber={phoneNumber} code={code} />
}

export default PhoneVerifiedHandler
