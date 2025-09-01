import axiosInstance from '../config/axiosInstance'

/* ---------------- 공통 유틸 ---------------- */
const onlyDigits = (s = '') => String(s).replace(/[^\d]/g, '')

// '19991221' or '1999-12-21' → 'YYYY-MM-DD'
const normalizeBirthDate = (s = '') => {
  const d = onlyDigits(s)
  if (d.length === 8)
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  return s
}

// 서버가 'M' | 'F' | 'UNKNOWN' 사용한다는 전제
const fmtGender = (g) => {
  const s = String(g || '')
    .trim()
    .toUpperCase()
  if (['M', 'MALE', '남', '남자'].includes(s)) return 'M'
  if (['F', 'FEMALE', '여', '여자'].includes(s)) return 'F'
  return 'UNKNOWN' // 기본값으로 UNKNOWN을 보냅니다.
}

/* ---------------- API ---------------- */

/** 로그인 */
export async function loginRequest({ email, password }) {
  const res = await axiosInstance.post('/api/auth/login', { email, password })
  console.log('응답 결과', res.data)
  return res.data // { token, ... }
}

/** 회원가입  */
export async function signupRequest({
  email,
  password,
  confirmPassword,
  nickname, 
  phoneNumber,
  phoneVerifyToken,
  birthDate,
  gender,
  profileImageUrl, 
}) {
  const payload = {
    email: String(email || '').trim(),
    password,
    confirmPassword,
    nickname, 
    phoneNumber: onlyDigits(phoneNumber), // 하이픈 없이 숫자만 전달
    phoneVerifyToken,
    birthDate: normalizeBirthDate(birthDate),
    gender: fmtGender(gender),
    profileImageUrl, // 필수 필드 추가
  }

  console.log('회원가입 payload', payload)

  const res = await axiosInstance.post('/api/auth/signup', payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

/** * ✅ [신규] 프로필 이미지 업로드
 * 파일을 받아 FormData로 감싸 서버에 전송하고, 저장된 URL을 반환합니다.
 * @param {File} file - 사용자가 선택한 이미지 파일
 * @returns {Promise<string>} 서버에 저장된 새 프로필 이미지 URL
 */
export const uploadProfileImage = async (file) => {
  const formData = new FormData();
  // 'imageFile'은 서버와 약속된 key 이름이어야 합니다.
  formData.append('imageFile', file); 

  const { data } = await axiosInstance.post('/api/users/me/profile-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  // 서버 응답이 { imageUrl: '...' } 형태라고 가정합니다.
  return data.imageUrl;  
};


/** [추가] 내 정보 수정 */
export const updateUserInfo = async (payload) => {
  const res = await axiosInstance.put('/api/users/me', payload);
  return res.data; // 수정된 UserResponse 반환
};

// /** 비밀번호 재설정 */
// export const resetPassword = async ({ email, newPassword }) => {
//   const res = await axiosInstance.post('/api/auth/reset-password', {
//     email: String(email || '').trim(),
//     newPassword,
//   });
//   return res.data;
// };


/** 로그아웃 */
export async function logoutRequest() {
  const res = await axiosInstance.post('/api/auth/logout')
  return res.data
}

/** AccessToken 재발급 */
export async function refreshAccessToken() {
  const res = await axiosInstance.post('/api/auth/refresh')
  return res.data
}

/** 인증번호 발송 → 서버 응답에 맞게 수정 (void 반환) */
export const phoneSend = (phoneNumber) =>
  axiosInstance
    .post('/api/auth/phone/send', {
      phoneNumber: onlyDigits(phoneNumber),
    })
    .then((r) => r.data)

/** 인증번호 검증 → { phoneVerifyToken } 반환 */
export const phoneVerify = ({ phoneNumber, code }) =>
  axiosInstance
    .post('/api/auth/phone/verify', {
      code: String(code || '').trim(),
      phoneNumber: onlyDigits(phoneNumber),
    })
    .then((r) => r.data)