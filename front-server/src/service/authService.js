import axiosInstance from '/src/config/axiosInstance';

/** 로그인 요청 */
export async function loginRequest({ email, password }) {
    const res = await axiosInstance.post('/api/auth/login', { email, password });
    console.log("응답 결과", res.data); // 이 구조 확인
    return res.data;
}

/** 회원가입 요청 */
export async function signupRequest({
    nickname, email, password, confirmPassword, name, birth, gender, phone,
    companyName,      // 추가
    businessNumber,   // 추가
    address,          // 추가
    ceoName,          // 추가
    industry,  
}) {
    const res = await axiosInstance.post('/api/auth/signup', {
        nickname, email, password, confirmPassword, name, birth, gender, phone,
        companyName,      // 추가
        businessNumber,   // 추가
        address,          // 추가
        ceoName,          // 추가
        industry,  
    });
    return res.data;
}

/** 로그아웃 요청 */
export async function logoutRequest() {
    const res = await axiosInstance.post('/api/auth/logout');
    return res.data;
}

/** AccessToken 재발급 */
export async function refreshAccessToken() {
    const res = await axiosInstance.post('/api/auth/refresh');
    return res.data;
}

/** 이메일 인증 링크 전송(요청) */
export async function sendEmailVerification(email) {
    console.log("요청 보낼 이메일:", email)
    const res = await axiosInstance.post('/api/email/send', {email});
    return res.data;
}

/** 이메일 인증 확인 */
export async function verifyEmail(token) {
    const res = await axiosInstance.get(`/api/email/verify?token=${token}`);
    return res.data;
}
// export async function verifyEmail({email, code}) {
//     const res = await axiosInstance.get(`/api/email/verify?token=${getTokenFromURL()}`);
//     return res.data;
// }

/** 이메일 인증 URL의 토큰을 추출하는 함수 */
const getTokenFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
}