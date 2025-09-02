import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import TextField from '../common/TextField';
import lockIcon from '../../assets/images/lockIcon.png';
import checkIcon from '../../assets/images/checkIcon.png';
import errorIcon from '../../assets/images/error.png';
import successIcon from '../../assets/images/success.png';
import PersonIcon from '../../assets/icons/ic_person.svg';
import {
  loginRequest,
  signupRequest,
  phoneSend,
  phoneVerify,
} from '../../service/authService';
import { uploadProfileImage } from '../../service/uploadService';
import { useSignUpForm } from '../../hooks/useSignupForm';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import useAuthStore from '../../stores/authStore';

// ✅ 이미지 리사이징 헬퍼 함수 추가
const resizeImage = (file, maxWidth, maxHeight, quality) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'));
              return;
            }
            resolve(new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            }));
          },
          file.type,
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};


const EmailSignUpForm = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const {
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    nickname, setNickname,
    phoneNumber, setPhoneNumber,
    phoneVerifyToken, setPhoneVerifyToken,
    birthDate, setBirthDate,
    gender, setGender,
    agreements, setAgreements,
    emailError, setEmailError,
    passwordError, setPasswordError,
    passwordConfirmError, setPasswordConfirmError,
    isValid,
  } = useSignUpForm();

  // --- 상태 관리 ---
  const [emailId, setEmailId] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const domainInputRef = useRef(null);

  const [phone1, setPhone1] = useState('010');
  const [phone2, setPhone2] = useState('');
  const [phone3, setPhone3] = useState('');
  
  // ⭐️ 1. phone3 input에 대한 ref 생성
  const phone3Ref = useRef(null);

  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [leftSec, setLeftSec] = useState(0);
  const timerRef = useRef(null);
  
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(PersonIcon);
  const fileInputRef = useRef(null);

  const DOMAIN_OPTIONS = [
    { value: '', label: '직접 입력' },
    { value: 'naver.com', label: 'naver.com' },
    { value: 'gmail.com', label: 'gmail.com' },
    { value: 'daum.net', label: 'daum.net' },
    { value: 'nate.com', label: 'nate.com' },
    { value: 'kakao.com', label: 'kakao.com' },
  ];

  // --- 유틸 및 핸들러 ---
  const onlyDigits = (v) => v.replace(/\D/g, '');

  const domainSelected = (e) => {
    const v = e.target.value;
    setSelectedDomain(v);
    setEmailDomain(v);
    if (v === '') {
      requestAnimationFrame(() => domainInputRef.current?.focus());
    }
  };

  useEffect(() => {
    if (emailId && emailDomain) {
      const fullEmail = `${emailId}@${emailDomain}`;
      setEmail(fullEmail);
      setEmailError('');
    } else {
      setEmail('');
    }
  }, [emailId, emailDomain, setEmail, setEmailError]);

  // ⭐️ 2. onPhone2 핸들러 수정
  const onPhone2 = (e) => {
    const value = onlyDigits(e.target.value).slice(0, 4);
    setPhone2(value);
    // 4자리가 입력되면 phone3Ref(마지막 번호 칸)로 포커스를 이동시킵니다.
    if (value.length === 4) {
      phone3Ref.current?.focus();
    }
  };

  const onPhone3 = (e) => setPhone3(onlyDigits(e.target.value).slice(0, 4));

  useEffect(() => {
    const joined = `${phone1}${phone2}${phone3}`;
    setPhoneNumber(joined);
  }, [phone1, phone2, phone3, setPhoneNumber]);
  
  const canSend = useMemo(() => leftSec === 0 && !isSending, [leftSec, isSending]);

  useEffect(() => {
    if (leftSec === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
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
    const m = Math.floor(leftSec / 60).toString().padStart(2, '0');
    const s = (leftSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [leftSec]);

  const onSendCode = async () => {
    // ... (onSendCode 로직은 기존과 동일)
    const digits = `${phone1}${phone2}${phone3}`;
    if (digits.length < 10) {
      setPhoneError('휴대폰 번호를 정확히 입력해 주세요.');
      return;
    }
    try {
      setIsSending(true);
      setOtp('');
      setOtpError('');
      setInfoMsg('');
      await phoneSend(digits);
      setLeftSec(180);
      setInfoMsg('인증번호를 발송했습니다. 3분 안에 입력해 주세요.');
    } catch (e) {
      console.error(e);
      setPhoneError('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSending(false);
    }
  };

  const onVerifyCode = async () => {
    // ... (onVerifyCode 로직은 기존과 동일)
    if (!otp || otp.length < 4) {
      setOtpError('인증번호 4~6자리를 입력해 주세요.');
      return;
    }
    if (leftSec === 0) {
      setOtpError('인증 시간이 만료되었습니다. 다시 발송해 주세요.');
      return;
    }
    try {
      setIsVerifying(true);
      const res = await phoneVerify({
        phoneNumber: `${phone1}${phone2}${phone3}`,
        code: otp,
      });
      if (res?.phoneVerifyToken) {
        setPhoneVerifyToken(res.phoneVerifyToken);
        setPhoneVerified(true);
        setInfoMsg('휴대폰 인증이 완료되었습니다.');
        setOtpError('');
        setLeftSec(0);
      } else {
        setOtpError('인증번호가 올바르지 않습니다.');
      }
    } catch (e) {
      console.error(e);
      setOtpError('인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const validatePassword = (value) => {
    // ... (validatePassword 로직은 기존과 동일)
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
    // ... (validatePasswordConfirm 로직은 기존과 동일)
    if (!value) {
      setPasswordConfirmError('');
      return;
    }
    if (value !== password) {
      setPasswordConfirmError('비밀번호가 같지 않습니다. 다시 입력해주세요.');
    } else {
      setPasswordConfirmError('');
    }
  };
  
  const handleAgreementChange = (e) => {
    // ... (handleAgreementChange 로직은 기존과 동일)
    const { name, checked } = e.target;
    if (name === "all") {
      setAgreements({
        termsOfService: checked,
        privacyPolicy: checked,
      });
    } else {
      setAgreements((prev) => ({ ...prev, [name]: checked }));
    }
  };

  // ✅ 이미지 선택 및 리사이징 핸들러
  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 이미지 리사이징 (최대 1024x1024, 품질 0.8)
      const resizedFile = await resizeImage(file, 1024, 1024, 0.8);
      
      setProfileImageFile(resizedFile);
      setProfilePreview(URL.createObjectURL(resizedFile));

    } catch (error) {
      console.error("이미지 리사이징 실패:", error);
      alert("이미지를 처리하는 중 오류가 발생했습니다.");
      setProfileImageFile(null);
      setProfilePreview(PersonIcon);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneVerified) {
      setPhoneError('휴대폰 인증을 완료해주세요.');
      return;
    }

    try {
      let uploadedImageUrl = null;
      
      if (profileImageFile) {
        uploadedImageUrl = await uploadProfileImage(profileImageFile);
        if (!uploadedImageUrl) {
          throw new Error('이미지 업로드에 실패했습니다.');
        }
      }
      
      const signupData = {
        email, password, confirmPassword, nickname, phoneNumber, 
        phoneVerifyToken, birthDate, gender,
        profileImageUrl: uploadedImageUrl,
      };
      
      const response = await signupRequest(signupData);
      const loginData = await loginRequest({ email, password });
      login(loginData);
      
      navigate('/');
      alert('회원가입이 완료되었습니다!');
      
    } catch (error) {
      console.error('회원가입 실패: ', error);
      const errorMsg = error?.response?.data?.message || error.message || '회원가입에 실패했습니다. 다시 시도해주세요.';
      alert(errorMsg);
    }
  };

  // --- 달력 관련 ---
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef(null);
  
  const ymd = (d) => {
    // ... (ymd 함수는 기존과 동일)
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    // ... (달력 외부 클릭 로직은 기존과 동일)
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [datePickerRef]);

  // ... (return JSX 부분은 이전 답변과 동일하게 유지)
  return (
    <div className="flex flex-col items-center px-4 pb-28 pt-8">
      <form className="mx-auto w-full max-w-[960px]" onSubmit={handleSubmit}>
        <div>
          <div className='flex'>
            <h1 className="text-2xl font-bold text-[#5882F6]">먼저 써봄&ensp;</h1>
            <h1 className="text-2xl font-bold">회원가입</h1>
          </div>
          <div>
            <strong className='text-xl'>필수 기본 정보 입력</strong>
            <hr />
          </div>
        </div>

        <div className="my-6 flex flex-col items-center">
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleProfileImageChange}
                className="hidden"
            />
            <img
                src={profilePreview}
                alt="프로필 미리보기"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 cursor-pointer mb-3"
                onClick={() => fileInputRef.current?.click()}
            />
            <Button type="button" variant="blackWhite" onClick={() => fileInputRef.current?.click()}>
                프로필 사진 선택
            </Button>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="mt-1 flex flex-wrap items-center gap-2 md:flex-nowrap">
              <div className="w-[220px] shrink-0 sm:w-[260px] md:w-[280px]">
                <TextField id="emailId" label="이메일" required value={emailId} onChange={(e) => setEmailId(e.target.value.trim())}/>
              </div>
              <span className="shrink-0 select-none px-1 text-gray-600">@</span>
              <div className="min-w-0 flex-1">
                {selectedDomain === '' ? (
                  <TextField id="email_domain" label="직접입력" value={emailDomain} onChange={(e) => setEmailDomain(e.target.value.trim())} inputRef={domainInputRef}/>
                ) : (
                  <TextField id="email_domain_ro" label="도메인" value={selectedDomain} readOnly />
                )}
              </div>
              <select className="select-basic w-36 shrink-0 sm:w-40 md:w-44 h-11 rounded-lg border border-gray-200 px-3" value={selectedDomain} onChange={domainSelected} aria-label="도메인 선택">
                {DOMAIN_OPTIONS.map(({ value, label }) => (
                  <option key={label} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {emailError && <span className="form-error"><img src={errorIcon} alt="에러 아이콘" className="mr-1.5 h-5" />{emailError}</span>}
          </div>

          <TextField id="password" label="비밀번호" type="password" required value={password} onChange={(e) => { setPassword(e.target.value); validatePassword(e.target.value); }} icon={<img src={lockIcon} alt="비밀번호 아이콘" />} />
          <TextField id="password_confirm" label="비밀번호 확인" type="password" required value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); validatePasswordConfirm(e.target.value); }} icon={<img src={checkIcon} alt="비밀번호 아이콘" />} />
          {passwordConfirmError && <span className="mt-1 inline-flex items-center text-sm text-red-600"><img src={errorIcon} alt="에러 아이콘" className="mr-1.5 h-5 w-5"/>{passwordConfirmError}</span>}
          <TextField id="user_name" label="닉네임" type="text" required value={nickname} onChange={(e) => setNickname(e.target.value)} />
          
          <div>
            <label className="form-label">전화번호</label>
            <div className="mt-1 grid grid-cols-1 items-center gap-2 md:[grid-template-columns:110px_auto_1fr_auto_1fr_auto]">
              <select className="h-11 rounded-xl border border-gray-200 px-2" value={phone1} onChange={(e) => setPhone1(e.target.value)}>
                {['010', '011', '016', '017', '018', '019'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <span className="hidden text-center text-gray-500 md:block">-</span>
              <input className="h-11 rounded-xl border border-gray-200 px-3" inputMode="numeric" maxLength={4} placeholder="1234" value={phone2} onChange={onPhone2} />
              <span className="hidden text-center text-gray-500 md:block">-</span>
                  {/* ⭐️ 3. ref를 input 요소에 연결 */}
              <input ref={phone3Ref} className="h-11 rounded-xl border border-gray-200 px-3" inputMode="numeric" maxLength={4} placeholder="5678" value={phone3} onChange={onPhone3} />
              <Button type="button" onClick={onSendCode} disabled={!canSend || phoneVerified || !phone2 || !phone3} aria-disabled={!canSend || phoneVerified || !phone2 || !phone3} className="h-11">
                {phoneVerified ? '인증완료' : leftSec > 0 ? `재전송(${mmss})` : isSending ? '발송중...' : '인증번호 발송'}
              </Button>
            </div>
          </div>

          {phoneError && <span className="mt-1 inline-flex items-center text-sm text-red-600"><img src={errorIcon} alt="에러" className="mr-1.5 h-5" />{phoneError}</span>}
          {!phoneVerified && leftSec > 0 && (
            <div className="mt-2 flex flex-col gap-2 md:flex-row">
              <TextField id="otp" label="인증번호" type="text" value={otp} onChange={(e) => { const v = onlyDigits(e.target.value).slice(0, 6); setOtp(v); setOtpError(''); }} />
              <button type="button" className="h-11 rounded-xl border border-gray-200 bg-indigo-50 px-4 disabled:opacity-60" onClick={onVerifyCode} disabled={isVerifying}>
                {isVerifying ? '확인중...' : '인증확인'}
              </button>
            </div>
          )}
          {otpError && <span className="mt-1 inline-flex items-center text-sm text-red-600"><img src={errorIcon} alt="에러" className="mr-1.5 h-5" />{otpError}</span>}
          {phoneVerified && <span className="mt-1 inline-flex items-center text-sm text-green-600"><img src={successIcon} alt="성공" className="mr-1.5 h-5" />휴대폰 인증이 완료되었습니다.</span>}
          {infoMsg && !phoneVerified && <span className="mt-1 text-sm text-gray-500">{infoMsg}</span>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="form-label">성별</label>
              <div className="flex items-center gap-4 pt-2">
                <label><input type="radio" name="gender" value="남자" checked={gender === '남자'} onChange={(e) => setGender(e.target.value)} /><span className="ml-2">남자</span></label>
                <label><input type="radio" name="gender" value="여자" checked={gender === '여자'} onChange={(e) => setGender(e.target.value)} /><span className="ml-2">여자</span></label>
              </div>
            </div>
            <div className="sm:col-span-3">
              <label className="form-label">생년월일</label>
              <div className="relative" ref={datePickerRef}>
                <TextField
                  id="birthDate"
                  label="생년월일"
                  value={birthDate}
                  readOnly
                  onClick={() => setIsDatePickerOpen(prev => !prev)}
                  placeholder="YYYY-MM-DD"
                  required
                />
                {isDatePickerOpen && (
                  <div className="absolute top-full mt-2 z-10 bg-white border rounded-lg shadow-lg">
                    <DayPicker
                      mode="single"
                      selected={birthDate ? new Date(birthDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setBirthDate(ymd(date));
                        }
                        setIsDatePickerOpen(false);
                      }}
                      captionLayout="dropdown" 
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-2 mt-6 rounded-xl border border-dashed border-gray-200 p-4 text-gray-600">
          <div className="flex items-center mb-2">
            <input type="checkbox" id="agreement-all" name="all" className="w-5 h-5" onChange={handleAgreementChange} checked={agreements.termsOfService && agreements.privacyPolicy} />
            <label htmlFor="agreement-all" className="ml-2 font-semibold">전체 동의</label>
          </div>
          <hr />
          <div className="flex items-center mt-2">
            <input type="checkbox" id="agreement-terms" name="termsOfService" className="w-5 h-5" onChange={handleAgreementChange} checked={agreements.termsOfService} />
            <label htmlFor="agreement-terms" className="ml-2">[필수] 이용약관 동의</label>
          </div>
          <div className="flex items-center mt-2">
            <input type="checkbox" id="agreement-privacy" name="privacyPolicy" className="w-5 h-5" onChange={handleAgreementChange} checked={agreements.privacyPolicy} />
            <label htmlFor="agreement-privacy" className="ml-2">[필수] 개인정보 수집 및 이용 동의</label>
          </div>
        </div>
        
        <Button variant="signUp" size="lg" className="w-full" type="submit" disabled={!isValid || !phoneVerified}>
          회원가입
        </Button>
      </form>
    </div>
  );
};

export default EmailSignUpForm;