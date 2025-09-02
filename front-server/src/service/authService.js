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

/** [추가] 내 정보 수정 */
export const updateUserInfo = async (payload) => {
  const res = await axiosInstance.put('/api/users/me', payload);
  return res.data; // 수정된 UserResponse 반환
};

/** 아이디(이메일) 찾기 */
export const findId = async ({ phoneNumber, phoneVerifyToken }) => {
  const res = await axiosInstance.post('/api/auth/recovery/id', {
    phoneNumber,
    phoneVerifyToken,
  });
  return res.data; // { emails: [...], count: ... }
};

/** 비밀번호 재설정 */
export const resetPassword = async ({ loginId, phoneNumber, phoneVerifyToken, newPassword, newPasswordConfirm }) => {
  const res = await axiosInstance.post('/api/auth/recovery/password', {
    loginId,
    phoneNumber,
    phoneVerifyToken,
    newPassword,
    newPasswordConfirm,
  });
  return res.data; // 성공 시 void
};


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

/** 회원 탈퇴 */
export const deleteAccount = async (payload) => {
  // payload: { password } 또는 { confirmText: '탈퇴합니다' }
  const { data } = await axiosInstance.post('/api/users/me/delete', payload);
  return data;
};