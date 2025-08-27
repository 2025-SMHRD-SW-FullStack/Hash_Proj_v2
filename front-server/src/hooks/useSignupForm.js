import { useMemo, useState } from "react";

/** [ 회원가입 상태관리 ] - 백엔드 DTO 기준 */
export function useSignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState(''); // name -> nickname
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVerifyToken, setPhoneVerifyToken] = useState('');
  const [birthDate, setBirthDate] = useState(''); // 'YYYY-MM-DD'
  const [gender, setGender] = useState('남자');
  
  // profileImageUrl은 UI에 없으므로 handleSubmit에서 임시값으로 처리

  // 에러 메시지
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');

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
    !emailError && !passwordError && !passwordConfirmError
  ), [
    email, password, confirmPassword, nickname,
    phoneNumber, birthDate, gender,
    emailError, passwordError, passwordConfirmError
  ]);

  return {
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    nickname, setNickname, // name -> nickname
    phoneNumber, setPhoneNumber,
    phoneVerifyToken, setPhoneVerifyToken,
    birthDate, setBirthDate,
    gender, setGender,

    emailError, setEmailError,
    passwordError, setPasswordError,
    passwordConfirmError, setPasswordConfirmError,
    isValid,
  };
}