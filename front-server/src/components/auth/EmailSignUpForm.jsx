import React, { useEffect, useRef, useState, useMemo } from 'react'
import TextField from '../common/TextField';
import logoImg from '/src/assets/images/logo.png'
import lockIcon from '/src/assets/images/lockIcon.png'
import checkIcon from '/src/assets/images/checkIcon.png'
import errorIcon from '/src/assets/images/error.png'
import successIcon from '/src/assets/images/success.png'
import { loginRequest, signupRequest, phoneSend, phoneVerify } from '/src/service/authService'
import { useSignUpForm } from '/src/hooks/useSignupForm';
import { useNavigate } from 'react-router-dom';
import useGoHome from '/src/hooks/useGoHome';

const EmailSignUpForm = () => {

    const navigate = useNavigate();
    const goHome = useGoHome();

    const  { 
        email, setEmail, 
        password, setPassword ,
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
        isValid,
        emailError, setEmailError,
        passwordError, setPasswordError,
        passwordConfirmError, setPasswordConfirmError
    } = useSignUpForm();

    // 도메인 옵션 (필요시 hanmail.net/daum.net 중 택1)
    const DOMAIN_OPTIONS = [
    { value: '',           label: '직접 입력' },
    { value: 'naver.com',  label: 'naver.com' },
    { value: 'gmail.com',  label: 'gmail.com' },
    { value: 'daum.net',   label: 'daum.net' },
    { value: 'nate.com',   label: 'nate.com' },
    { value: 'kakao.com',  label: 'kakao.com' },
    ];



    const [emailId, setEmailId] = useState(""); // 입력 왼쪽: 아이디
    const [emailDomain, setEmailDomain] = useState(""); // 입력 오른쪽: 도메인(텍스트)
    const [selectedDomain, setSelectedDomain] = useState(''); // 드롭다운 선택값
    const domainInputRef = useRef(null);


    // 셀렉트 핸들러
    const domainSelected = (e) => {
    const v = e.target.value;
    setSelectedDomain(v);
    setEmailDomain(v); // ''이면 직접입력 유지
    if (v === '') {
        requestAnimationFrame(() => domainInputRef.current?.focus());
    }
    };

    // 이메일 아이디와 도메민이 모두 있으면 email 합치기
    useEffect(() => {
        if(emailId && emailDomain) {
            const fullEmail = `${emailId}@${emailDomain}`;
            setEmail(fullEmail);
            console.log('이메일 전체 주소:', fullEmail);
            setEmailError('');
        } else {
            setEmail('');
        }

    },[emailId, emailDomain])

    
    // 휴대폰 인증
    const [phone1, setPhone1] = useState("010"); // 앞자리 select
    const [phone2, setPhone2] = useState(""); // 중간 3~4자리
    const [phone3, setPhone3] = useState(""); // 끝 4자리

    // 숫자만 저장하기
    const onlyDigits = (v) => v.replace(/\D/g, "");

    const onPhone2 = (e) =>{
        const v = onlyDigits(e.target.value).slice(0, 4);
        setPhone2(v);
    };

    const onPhone3 = (e) => {
        const v = onlyDigits(e.target.value).slice(0, 4);
        setPhone3(v);
    };


    // 전화번호 합치기
    useEffect(()=>{
        const joined = `${phone1}${phone2}${phone3}`;
        setPhoneNumber(joined);
    }, [phone1, phone2, phone3]);

    
    // 핸드폰 인증
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [otp, setOtp] = useState("");
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [phoneError, setPhoneError] = useState("");
    const [otpError, setOtpError] = useState("");
    const [infoMsg, setInfoMsg] = useState("");

    // 타이머(3분)
    const [leftSec, setLeftSec] = useState(0);
    const timerRef = useRef(null);

    // 인증번호 재발송 가능 여부 계산
    // - leftSec === 0  → 타이머가 끝난 상태
    // - !isSending     → 현재 발송 요청 중이 아님
    // 두 조건이 모두 true일 때만 발송 버튼 활성화
    const canSend = useMemo(() => leftSec === 0 && !isSending, [leftSec, isSending]);

     useEffect(() => {
        if (leftSec === 0) return;
        timerRef.current && clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
        setLeftSec((s) => {
            if (s <= 1) {
                clearInterval(timerRef.current);
                 return 0;
            }
            return s - 1;
        });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [leftSec]);

    const mmss = useMemo(() => {
        const m = Math.floor(leftSec / 60)
        .toString()
        .padStart(2, "0");
        const s = (leftSec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }, [leftSec]);

    const onSendCode = async () => {
        const digits = `${phone1}${phone2}${phone3}`;
        if (digits.length < 10) {
            setPhoneError("휴대폰 번호를 정확히 입력해 주세요.");
            return;
        }
        try {
            setIsSending(true);
            setOtp("");
            setOtpError("");
            setInfoMsg("");
            const res = await phoneSend(digits);
            setPhoneVerifyToken(res.requestId)
            setLeftSec(180); // 3분 카운트 시작
            setInfoMsg("인증번호를 발송했습니다. 3분 안에 입력해 주세요.");
        } catch (e) {
            console.error(e);
            setPhoneError("인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setIsSending(false);
        }
    };

    const onVerifyCode = async () => {
        if (!otp || otp.length < 4) {
            setOtpError("인증번호 4~6자리를 입력해 주세요.");
            return;
        }
        if (leftSec === 0) {
            setOtpError("인증 시간이 만료되었습니다. 다시 발송해 주세요.");
            return;
        }
        try {
        setIsVerifying(true);
        const res = await phoneVerify({
            requestId: phoneVerifyToken,
            code: otp,
            phoneNumber: `${phone1}${phone2}${phone3}`,
        });
        if (res?.phoneVerifyToken) {
            setPhoneVerifyToken(res.phoneVerifyToken)
            setPhoneVerified(true);
            setInfoMsg("휴대폰 인증이 완료되었습니다.");
            setOtpError("");
            setLeftSec(0);
        } else {
            setOtpError("인증번호가 올바르지 않습니다.");
        }
        } catch (e) {
            console.error(e);
            setOtpError("인증 처리 중 오류가 발생했습니다.");
        } finally {
            setIsVerifying(false);
        }
    };


    // 비밀번호 유효성
    const validatePassword = (value) => {
        if (!value) {
            setPasswordError('');
            return;
        }

        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/;
        if (!regex.test(value)) {
            setPasswordError('8~16자의 영문 대/소문자, 숫자, 특수문자를 사용해 주세요.');
        } else {
            setPasswordError('');
        }
    };

    const validatePasswordConfirm = (value) => {
        if (!value) {
            setPasswordConfirmError('');
            return;
        }

        if (value !== password) {
            setPasswordConfirmError('비밀번호가 같지 않습니다. 다시 입력해주세요.');
        } else {
            setPasswordConfirmError('');
        }
    }


    // 회원가입 완료 시 DB 저장 및 자동 로그인 처리
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!phoneVerified) {
            setPhoneError("휴대폰 인증을 완료해주세요.");
            return;
        }
        try {
            // 회원가입 요청
            const response = await signupRequest({
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
            });

            // 바로 로그인 요청
            const { token } = await loginRequest({email, password});

            // AccessToken 저장
            localStorage.setItem('accessToken', token);

            // 메인 페이지 이동
            navigate('/');

            alert('회원가입이 완료되었습니다!');
            console.log('회원가입 결과: ', response);

        } catch (error) {
            console.error('회원가입 실패: ', error);
            alert('회원가입에 실패했습니다. 다시 시도해주세요.');
        }
    }


    // 헬퍼: 윤년/월별 일수
    const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const daysInMonth = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

    // 셀렉트 상태 (연/월/일)
    const [birthYear, setBirthYear] = useState('');
    const [birthMonth, setBirthMonth] = useState('');
    const [birthDay, setBirthDay] = useState('');

    // 연도/월/일 옵션
    const currentYear = new Date().getFullYear();
    
    const years = useMemo(() => {
    // 필요 정책에 맞게 범위 조정 (예: 1950~현재년)
    const start = 1950;
    return Array
            .from({ length: currentYear - start + 1 }, (_, i) => start + i);
    }, []);

    const months = useMemo(() => 
        Array.from({ length: 12 }, (_, i) => i + 1), []);

    const days = useMemo(() => {
        if (!birthYear || !birthMonth) return [];
        const d = daysInMonth(Number(birthYear), Number(birthMonth));
        return Array.from({ length: d }, (_, i) => i + 1);
    }, [birthYear, birthMonth]);


    // 연/월 변경 시 존재하지 않는 일자가 선택돼 있으면 초기화
    useEffect(() => {
    if (!birthYear || !birthMonth || !birthDay) return;
    const max = daysInMonth(Number(birthYear), Number(birthMonth));
    if (Number(birthDay) > max) setBirthDay('');
    }, [birthYear, birthMonth]);

    // 셀렉트 3개가 모두 선택되면 birthDate를 'YYYY-MM-DD'로 저장
    useEffect(() => {
        if (!birthYear || !birthMonth || !birthDay) return;
        const mm = String(birthMonth).padStart(2, '0');
        const dd = String(birthDay).padStart(2, '0');
        setBirthDate(`${birthYear}-${mm}-${dd}`);
    }, [birthYear, birthMonth, birthDay, setBirthDate]);


    return (
    <div className="flex flex-col items-center px-4 pt-8 pb-28">
        {/* ✅ 로고: 컨테이너 좌상단(작게) */}
            <img
                src={logoImg}
                alt="로고"
                onClick={goHome}
                className="block select-none cursor-pointer max-w-none !h-10 w-[200px] sm:!h-12"  // ← 여기만 크기 조절
            />

        <form className="w-full max-w-[960px] mx-auto" onSubmit={handleSubmit}>
            {/* 페이지 타이틀 */}
            <h1 className="text-2xl font-bold">리쏠 회원가입</h1>

            {/* 섹션 타이틀 + 구분선 (2번 시안) */}
            <div className="mt-4 mb-3 flex items-center gap-3">
                <h2 className="section-title">필수 기본 정보 입력</h2>
                <div className="divider-line" />
            </div>

            {/* 아이디(이메일) — 한 줄 레이아웃 */}
            <div className="mt-2">
            <label htmlFor="emailId" className="form-label">아이디(이메일)</label>

            <div className="mt-1 flex items-center gap-2 flex-wrap md:flex-nowrap">
                {/* (@ 앞) 아이디 입력 - 고정폭 */}
                <div className="w-[220px] sm:w-[260px] md:w-[280px] shrink-0">
                <TextField
                    id="emailId"
                    label="아이디"
                    required
                    isRequiredMark
                    singleFirst
                    value={emailId}
                    onChange={(e) => setEmailId(e.target.value.trim())}
                />
                </div>

                {/* @ 기호 - 고정폭 */}
                <span className="px-1 text-gray-600 shrink-0 select-none">@</span>

                {/* (@ 뒤) 도메인 입력 - 가변폭 */}
                <div className="flex-1 min-w-0">
                {selectedDomain === '' ? (
                    <TextField
                    id="email_domain"
                    label="직접입력"
                    singleMiddle2
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value.trim())}
                    inputRef={domainInputRef}
                    />
                ) : (
                    <TextField
                    id="email_domain_ro"
                    label="도메인"
                    singleMiddle2
                    value={selectedDomain}
                    readOnly
                    />
                )}
                </div>

                {/* 도메인 셀렉트 - 고정폭, 왼쪽 모서리 이어주기 */}
                <select
                className="select-basic rounded-l-none w-36 sm:w-40 md:w-44 shrink-0"
                value={selectedDomain}
                onChange={domainSelected}
                aria-label="도메인 선택"
                >
                {DOMAIN_OPTIONS.map(({ value, label }) => (
                    <option key={label} value={value}>{label}</option>
                ))}
                </select>
            </div>

                {/* 에러 메시지 */}
                {emailError && (
                    <span className="form-error">
                    <img src={errorIcon} alt="에러 아이콘" className="h-5 mr-1.5" />
                    {emailError}
                    </span>
                )}
            </div>

                {/* 비밀번호 */}
                <div className="mt-2 space-y-3">
                    
                    <TextField id="password" label="비밀번호" type="password" required isRequiredMark singleFirst 
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            validatePassword(e.target.value);
                        }}
                        icon={<img src={lockIcon} alt='비밀번호 아이콘'/>} />

                    <TextField id="password_confirm" label="비밀번호 확인" type="password" required isRequiredMark singleLast 
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            validatePasswordConfirm(e.target.value);
                        }}
                        icon={<img src={checkIcon} alt='비밀번호 아이콘'/>} />
                    
                    {passwordError && (
                        <span className="mt-1 inline-flex items-center text-sm text-red-600">
                            <img
                                src={errorIcon}
                                alt="에러 아이콘"
                                className="h-5 mr-1.5"
                            />
                            {passwordError}
                        </span>
                    )}
                    {passwordConfirmError && (
                        <span className="mt-1 inline-flex items-center text-sm text-red-600">
                            <img
                                src={errorIcon}
                                alt="에러 아이콘"
                                className="h-5 w-5 mr-1.5"
                            />
                        {passwordConfirmError}
                        </span>
                    )}


                    {/* 이름 */}
                    <TextField 
                        id="user_name" 
                        label="이름" 
                        type="text" 
                        required 
                        isRequiredMark 
                        single
                        value={name}
                        onChange={(e) => setName(e.target.value)}/>
                </div>

                {/* 휴대폰 */}
                    <div className="
                        grid gap-2 items-center mt-2
                        grid-cols-1
                        md:[grid-template-columns:110px_12px_1fr_12px_1fr_auto]
                    ">

                    {/* 앞자리 */}
                        <select
                            className="h-11 rounded-xl border border-gray-200 px-2"
                            value={phone1}
                            onChange={(e) => setPhone1(e.target.value)}
                        >
                            {["010","011","016","017","018","019"].map(p => (
                            <option key={p} value={p}>{p}</option>
                            ))}
                        </select>

                        <span className="hidden md:block text-center text-gray-500">
                            -
                        </span>

                        {/* 중간자리 */}
                        <input
                            className="h-11 rounded-xl border border-gray-200 px-3"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="1234"
                            value={phone2}
                            onChange={onPhone2}/>

                        <span className="hidden md:block text-center text-gray-500">
                            -
                        </span>

                        {/* 끝자리 */}
                        <input
                            className="h-11 rounded-xl border border-gray-200 px-3"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="5678"
                            value={phone3}
                            onChange={onPhone3}/>


                        {/* 인증번호 발송 버튼 */}
                        <button
                            type="button"
                            onClick={onSendCode}
                            disabled={!canSend || phoneVerified || !phone2 || !phone3}
                            aria-disabled={!canSend || phoneVerified || !phone2 || !phone3}
                            className="h-11 rounded-xl border bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >

                            {phoneVerified ? "인증완료"
                                : leftSec > 0 ? `재전송(${mmss})`
                                : isSending ? "발송중..."
                                : "인증번호 발송"}
                        </button>

                    </div>
                    {phoneError && (
                        <span className="mt-1 inline-flex items-center text-sm text-red-600">
                            <img src={errorIcon} alt="에러" className="h-5 mr-1.5" />
                            {phoneError}
                        </span>
                    )}                   

                    {/* 인증번호 입력 + 확인 */}
                    {!phoneVerified && leftSec > 0 && (
                    <div className="flex flex-col md:flex-row gap-2 mt-2">
                        <TextField
                            id="otp"
                            label="인증번호"
                            type="text"
                            single
                            value={otp}
                            onChange={(e) => {
                                const v = onlyDigits(e.target.value).slice(0, 6);
                                setOtp(v);
                                setOtpError("");
                            }}
                        />
                        <button
                            type="button" 
                            className="h-11 px-4 rounded-xl border border-gray-200 bg-indigo-50 disabled:opacity-60"
                            onClick={onVerifyCode}
                            disabled={isVerifying}>
                            {isVerifying ? "확인중..." : "인증확인"}
                        </button>
                    </div>
                    )}

                    {/* 인증실패 */}
                    {otpError && (
                    <span className="mt-1 inline-flex items-center text-sm text-red-600">
                        <img src={errorIcon} alt="에러" className="h-5 mr-1.5" />
                        {otpError}
                    </span>
                    )}

                    {/* 인증성공 */}
                    {phoneVerified && (
                    <span className="mt-1 inline-flex items-center text-sm text-green-600">
                        <img src={successIcon} alt="성공" className="h-5 mr-1.5" />
                        휴대폰 인증이 완료되었습니다.
                    </span>
                    )}
                    {infoMsg && !phoneVerified && (
                        <span className="mt-1 text-sm text-gray-500">{infoMsg}</span>
                    )}

                    <TextField
                        id = "address"
                        label = "주소"
                        type="text"
                        required
                        isRequiredMark
                        single
                        value={address}
                        onChange={(e)=>{
                            setAddress(e.target.value)
                        }}
                    />


                    {/* 네이버 닉네임 */}
                    <TextField 
                        id="naverNickname"
                        label="네이버닉네임"
                        type="text"
                        required
                        isRequiredMark
                        single
                        value={naverNickname}
                        onChange={(e) => {
                            setNaverNickname(e.target.value);
                        }}/>

                    <p>정확한 네이버 닉네임을 입력해주세요.</p>



                    {/* 기타 필수 입력*/}

                    {/* 선택 입력: 추천인/AI 추가 정보 */}
                    <h3 className="mt-8 mb-2 text-lg font-semibold">
                        추천인 코드 추가 정보 입력
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">추천인 코드를 입력하시면 500포인트가 지급됩니다.</p>
                    
                    <TextField 
                        id="referrer" 
                        label="추천인 코드" 
                        type="text" 
                        single value={referrer || ""} 
                        onChange={(e) => setReferrer(e.target.value)} />

                    <h3 className="mt-8 mb-2 text-lg font-semibold">
                        AI 리뷰 생성을 위한 추가 정보 입력
                    </h3>

                    <p className="text-sm text-gray-500 mb-2">
                        더욱 자연스럽고 개인 맞춤형 리뷰 생성을 원하시면, 
                        아래 정보를 입력해주세요.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                    {/* 성별 라디오 — TextField(type=radio) 구현체에 맞춰 조정 */}
                    <TextField 
                        id="gender" 
                        label="성별" 
                        type="radio" 
                        single value={gender} 
                        onChange={(e) => setGender(e.target.value)} />
                    
                    <TextField
                        id="birthYear"
                        label="출생 연도"
                        type="select"
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        options={years}               // ['1950','1951', ...] 또는 [{value,label}]
                        placeholderOption="선택"
                    />

                    <TextField
                        id="birthMonth"
                        label="월"
                        type="select"
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        options={months.map((m) => String(m).padStart(2, '0'))}
                        placeholderOption="선택"
                    />

                    <TextField
                        id="birthDay"
                        label="일"
                        type="select"
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        options={days.map((d) => String(d).padStart(2, '0'))}
                        placeholderOption={(!birthYear || !birthMonth) ? '먼저 선택' : '선택'}
                        disabled={!birthYear || !birthMonth}
                    />

                    <TextField 
                        id="naverReviewUrl"
                        label="리뷰 URL" 
                        type="text" 
                        single value={naverReviewUrl} 
                        onChange={(e) => setNaverReviewUrl(e.target.value)} />
                    </div>                    

                    {/* TODO: 약관/수신 동의 영역 */}
                    <div className="mt-6 mb-2 p-4 border border-dashed border-gray-200 rounded-xl text-gray-600">
                        약관/수신 동의
                    </div>

                    {/* 제출 버튼 — 폰 인증 필수 */}
                    <button
                        className="w-full h-12 rounded-xl bg-neutral-900 text-white font-semibold mt-3 disabled:opacity-50"
                        type="submit"
                        disabled={!isValid || !phoneVerified}>
                        회원가입
                    </button>
            </form>
        </div>
    )
}

export default EmailSignUpForm