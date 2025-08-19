import { useMemo, useState } from "react";

/** [ 회원가입 상태관리 ]
 * - 닉네임, 이메일, 이메일 인증, 비밀번호, 비밀번호 확인, 이름, 생년월일, 성별, 번호
 * - 비밀번호 = 비밀번호 확인 / 생년월일 6자리
 */
export function useSignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const [naverNickname, setNaverNickname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');      // ⬅️ 폼과 동일
  const [phoneVerifyToken, setPhoneVerifyToken] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');          // 'YYYY-MM-DD'
  const [gender, setGender] = useState('남자');
  const [referrer, setReferrer] = useState('');
  const [naverReviewUrl, setNaverReviewUrl] = useState('');


    // 에러 메시지
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');

  // 유효성 (필요에 맞게 조정 가능)
  const isValid = useMemo(() => (
    !!email &&
    !!password &&
    !!confirmPassword &&
    password === confirmPassword &&
    !!name &&
    !!naverNickname &&
    !!phoneNumber &&
    !!birthDate &&
    !!gender &&
    !emailError && !passwordError && !passwordConfirmError
  ), [
    email, password, confirmPassword, name,
    naverNickname, phoneNumber, birthDate, gender,
    emailError, passwordError, passwordConfirmError
  ]);

  return {
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    name, setName,

    naverNickname, setNaverNickname,
    phoneNumber, setPhoneNumber,
    phoneVerifyToken, setPhoneVerifyToken,
    address, setAddress,
    birthDate, setBirthDate,
    gender, setGender,
    referrer, setReferrer,
    naverReviewUrl, setNaverReviewUrl,

    emailError, setEmailError,
    passwordError, setPasswordError,
    passwordConfirmError, setPasswordConfirmError,
    isValid,
  };
}