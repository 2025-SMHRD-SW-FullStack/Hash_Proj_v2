import { useMemo, useState } from "react";

/** [ 회원가입 상태관리 ]
 * - 닉네임, 이메일, 이메일 인증, 비밀번호, 비밀번호 확인, 이름, 생년월일, 성별, 번호
 * - 비밀번호 = 비밀번호 확인 / 생년월일 6자리
 */
export function useSignUpForm() {
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [birth, setBirth] = useState('');
    const [gender, setGender] = useState('남자');
    const [phone, setPhone] = useState('');

    // 회사 정보 관련 상태
    const [companyName, setCompanyName] = useState('');
    const [businessNumber, setBusinessNumber] = useState('');
    const [address, setAddress] = useState('');
    const [ceoName, setCeoName] = useState('');
    const [industry, setIndustry] = useState('');
    const [product, setProduct] = useState('');

    // 에러 메시지 상태 추가
    const [nicknameError, setNicknameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordConfirmError, setPasswordConfirmError] = useState('');

    // 유효성 조건 통합
    const isValid = useMemo(()=>
            email && password && confirmPassword && 
            password === confirmPassword &&
            name && nickname && birth.length === 6 && 
            gender && phone && emailVerified &&
            !nicknameError && !emailError && !passwordError && !passwordConfirmError,
        [
            email, password, confirmPassword, name, nickname, birth, gender, phone,
            nicknameError, emailError, passwordError, passwordConfirmError
        ]);

    return {
        nickname, setNickname,
        email, setEmail,
        emailVerified, setEmailVerified,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        name, setName,
        birth, setBirth,
        gender, setGender,
        phone, setPhone,
         // ✅ 회사 정보 추가
        companyName, setCompanyName,
        businessNumber, setBusinessNumber,
        address, setAddress,
        ceoName, setCeoName,
        industry, setIndustry,
        product, setProduct,
        nicknameError, setNicknameError,
        emailError, setEmailError,
        passwordError, setPasswordError,
        passwordConfirmError, setPasswordConfirmError,
        isValid,
    };
}