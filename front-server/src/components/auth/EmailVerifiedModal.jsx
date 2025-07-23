import React, { useEffect, useState } from 'react'
import styles from './EmailVerifiedModal.module.css'
import { verifyEmail } from '/src/service/authService'

/** [ 이메일 인증 확인 모달창 ]
 * - 이메일 인증 시 인증됐다는 문구
 * - 확인 버튼 시 모달창 닫힘
 * - 이메일로 회원가입 페이지에서 인증완료 문구 표시
*/
const EmailVerifiedModal = ({ token }) => {
    const [message, setMessage] = useState('이메일 인증 중...');
    const [status, setStatus] = useState(null); // success | error

    useEffect(()=>{
        const verify = async () => {
            try {
                const result = await verifyEmail(token);
                console.log('인증 성공:', result);
                setMessage('이메일 인증이 완료되었습니다!');
                setStatus('success');
            } catch (err) {
                console.log('인증 실패:', err);
                setMessage(err.message || '인증에 실패했습니다.');
                setStatus('error');
            }
        };

        if (token) verify();
    },[token]);

    const handleConfirm = () => {
        // 부모 창에 인증 완료 메시지 전송
        if (window.opener) {
            window.opener.postMessage({type: 'emailVerified'}, '*');
        }
        localStorage.setItem('emailVerified', 'true');
        window.close(); // 확인 버튼 시 창 닫기
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

export default EmailVerifiedModal