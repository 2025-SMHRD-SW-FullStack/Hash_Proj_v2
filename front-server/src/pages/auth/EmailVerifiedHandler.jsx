import React from 'react'
import { useSearchParams } from 'react-router-dom'
import EmailVerifiedModal from '/src/components/auth/EmailVerifiedModal';

/** [ 이메일 인증 처리 핸들러 ]
 * - 토큰 추출 해서 이메일 인증 모달페이지에 전달
 */
const EmailVerifiedHandler = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    return (
        <EmailVerifiedModal token={token}/>
    )
}

export default EmailVerifiedHandler;