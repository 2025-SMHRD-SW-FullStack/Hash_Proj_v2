import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { verifyEmail } from '/src/service/authService';

const EmailVerified = () => {
    const location = useLocation();
    const [message, setMessage] = useState('이메일 인증 중...');
    const [status, setStatus] = useState(null); // success | error

    useEffect(()=> {
        const verifyToken = async () => {
            const token = new URLSearchParams(location.search).get('token');
            if (!token) {
                setMessage('인증 토큰이 존재하지 않습니다.');
                setStatus('error');
                return;
            }

            try {
                await verifyEmail(token);
                setMessage('이메일 인증이 완료되었습니다.');
                setStatus('success');
            } catch (err) {
                setMessage(err.message || '인증에 실패했습니다.');
                setStatus('error');
            }
        };

        verifyToken();
        
    },[location])

    return (
        <div>
            <h2>{message}</h2>
        </div>
    )
}

export default EmailVerified