import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/** [ 인증 성공 시 액세스 토큰 저장 ]
 * - URL에 담긴 액세스 토큰 추출해서 localStorage에 저장한 뒤
 * - 메인 페이지로 리다이렉트 
 */
const OAuthSuccess = () => {
    const navigate = useNavigate();

    useEffect(()=> {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            // accessToken 저장
            console.log("받은 토큰: ", token);
            localStorage.setItem("accessToken", token);

            setTimeout(() => {
                navigate("/", { replace: true });
            }, 300);
            // 메인페이지로 이동
            // navigate("/", {replace: true});
        } else {
            alert("토큰이 존재하지 않습니다.");
            navigate("/login");
        }

    },[])

    

    return (
        <div>
            <p>로그인 처리 중입니다...</p>
        </div>
    )
}

export default OAuthSuccess