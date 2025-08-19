// /src/service/authService.js
import axiosInstance from '/src/config/axiosInstance';

/* ---------------- 공통 유틸 ---------------- */
const onlyDigits = (s = '') => String(s).replace(/[^\d]/g, '');

// 가입 전송용: 하이픈 포함 형식(010-1234-5678)
const normalizePhoneForSignup = (s = '') => {
  const d = onlyDigits(s);
  if (!d) return '';
  if (d.length === 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`; // length 11 기본
};

// 인증 API용: 숫자만
const normalizePhoneDigits = (s = '') => onlyDigits(s);

// '19991221' or '1999-12-21' → 'YYYY-MM-DD'
const normalizeBirthDate = (s = '') => {
  const d = onlyDigits(s);
  if (d.length === 8) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  return s;
};

const nullIfEmpty = (v) =>
  v === undefined || v === null || String(v).trim() === '' ? null : v;

// 서버가 'M' | 'F' 사용한다는 전제
const fmtGender = (g) => {
  const s = String(g || '').trim().toUpperCase();
  if (['M', 'MALE', '남', '남자'].includes(s)) return 'M';
  if (['F', 'FEMALE', '여', '여자'].includes(s)) return 'F';
  return nullIfEmpty(g);
};

/* ---------------- API ---------------- */

/** 로그인 */
export async function loginRequest({ email, password }) {
  const res = await axiosInstance.post('/api/auth/login', { email, password });
  console.log('응답 결과', res.data);
  return res.data; // { token, ... }
}

/** 회원가입  */
export async function signupRequest({
  email,
  password,
  confirmPassword,
  name,
  naverNickname,
  phoneNumber,
  phoneVerifyToken,
  address,
  birthDate,
  gender,
  referrer,
  naverReviewUrl,
}) {
  const payload = {
    email: String(email || '').trim(),
    password,
    confirmPassword,
    name,
    naverNickname,
    phoneNumber: normalizePhoneForSignup(phoneNumber),
    phoneVerifyToken,
    address: String(address || '').trim(),
    birthDate: normalizeBirthDate(birthDate),
    gender: fmtGender(gender),
    referrer: nullIfEmpty(referrer),
    naverReviewUrl: nullIfEmpty(naverReviewUrl),
  };

  console.log('회원가입 payload', payload);

  const res = await axiosInstance.post('/api/auth/signup', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.data;
}

/** 로그아웃 */
export async function logoutRequest() {
  const res = await axiosInstance.post('/api/auth/logout');
  return res.data;
}

/** AccessToken 재발급 */
export async function refreshAccessToken() {
  const res = await axiosInstance.post('/api/auth/refresh');
  return res.data;
}

/** 인증번호 발송 → { requestId, ... } 반환 가정 */
export const phoneSend = (phoneNumber) =>
  axiosInstance
    .post('/api/auth/phone/send', { phoneNumber: normalizePhoneDigits(phoneNumber) })
    .then((r) => r.data);

/** 인증번호 검증 → { phoneVerifyToken } 반환 가정 */
export const phoneVerify = ({ requestId, code, phoneNumber }) =>
  axiosInstance
    .post('/api/auth/phone/verify', {
      requestId,
      code: String(code || '').trim(),
      phoneNumber: normalizePhoneDigits(phoneNumber),
    })
    .then((r) => r.data);
