// src/hooks/useSignupForm.js

import { useMemo, useState } from "react";

/** [ 회원가입 상태관리 ] - 백엔드 DTO 기준 */
export function useSignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVerifyToken, setPhoneVerifyToken] = useState('');
  const [birthDate, setBirthDate] = useState(''); // 'YYYY-MM-DD'
  const [gender, setGender] = useState('남자');
  
  // 에러 메시지
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [agreements, setAgreements] = useState({
    termsOfService: false,
    privacyPolicy: false,
  });

  // 유효성 (백엔드 필수값 기준)
  const isValid = useMemo(() => (
    !!email &&
    !!password &&
    !!confirmPassword &&
    password === confirmPassword &&
    !!nickname &&
    !!phoneNumber &&
    !!birthDate &&
    !!gender &&
    !emailError && !passwordError && !passwordConfirmError &&
    agreements.termsOfService && agreements.privacyPolicy
  ), [
    email, password, confirmPassword, nickname,
    phoneNumber, birthDate, gender,
    emailError, passwordError, passwordConfirmError,
    agreements,
  ]);

  return {
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    nickname, setNickname,
    phoneNumber, setPhoneNumber,
    phoneVerifyToken, setPhoneVerifyToken,
    birthDate, setBirthDate,
    gender, setGender,
    agreements, setAgreements, // agreements와 setAgreements를 반환해야 합니다.

    emailError, setEmailError,
    passwordError, setPasswordError,
    passwordConfirmError, setPasswordConfirmError,
    isValid,
  };
}