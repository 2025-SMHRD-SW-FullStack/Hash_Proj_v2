import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import TextField from '../common/TextField';
import lockIcon from '../../assets/images/lockIcon.png';
import checkIcon from '../../assets/images/checkIcon.png';
import errorIcon from '../../assets/images/error.png';
import successIcon from '../../assets/images/success.png';
import PersonIcon from '../../assets/icons/ic_person.png';
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
import CategorySelect from '../common/CategorySelect';

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

  const placeholderOption = { value: '', label: '선택' };

  const DOMAIN_OPTIONS = [
    { value: 'naver.com', label: 'naver.com' },
    { value: 'gmail.com', label: 'gmail.com' },
    { value: 'daum.net', label: 'daum.net' },
    { value: 'nate.com', label: 'nate.com' },
    { value: 'kakao.com', label: 'kakao.com' },
    { value: '', label: '직접 입력' },
  ];

  const PHONE_PREFIX_OPTIONS = [
    { value: '010', label: '010' },
    { value: '011', label: '011' },
    { value: '016', label: '016' },
    { value: '017', label: '017' },
    { value: '018', label: '018' },
    { value: '019', label: '019' },
  ];

  // --- 유틸 및 핸들러 ---
  const onlyDigits = (v) => v.replace(/\D/g, '');

  const domainSelected = (selectedOption) => {
    const v = selectedOption.value;
    setSelectedDomain(v);
    setEmailDomain(v);
    if (v === '') {
      requestAnimationFrame(() => domainInputRef.current?.focus());
    }
  };

  const phonePrefixSelected = (selectedOption) => {
    setPhone1(selectedOption.value);
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

  const onPhone2 = (e) => {
    const value = onlyDigits(e.target.value).slice(0, 4);
    setPhone2(value);
    if (value.length === 4 && phone3Ref.current) {
      phone3Ref.current.focus();
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

  return (
    <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold text-center text-gray-900">회원가입</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          먼저써봄과 함께 새로운 경험을 시작해보세요!
        </p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* 프로필 사진 */}
          <div className="flex flex-col items-center">
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
              className="h-24 w-24 rounded-full object-cover cursor-pointer border-2 border-gray-200"
              onClick={() => fileInputRef.current?.click()}
            />
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
              사진 선택
            </Button>
          </div>

          {/* 이메일 */}
          <div>
            <div className="mt-1 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
              <TextField 
                id="emailId" 
                label="이메일" 
                value={emailId} 
                onChange={(e) => setEmailId(e.target.value.trim())} 
              />
              <span className="text-gray-500">@</span>
              <TextField 
                id="email_domain" 
                label="도메인" 
                value={emailDomain} 
                onChange={(e) => {
                  setEmailDomain(e.target.value.trim());
                  if (selectedDomain !== '') setSelectedDomain('');
                }} 
                inputRef={domainInputRef}
              />
              <CategorySelect
                categories={DOMAIN_OPTIONS}
                sselected={DOMAIN_OPTIONS.find(opt => opt.value === selectedDomain)}
                onChange={domainSelected}
                placeholder="도메인 선택"
                itemClassName="text-sm"
              />
            </div>
            {emailError && <p className="mt-2 text-sm text-red-600">{emailError}</p>}
          </div>

          {/* 비밀번호 */}
          <TextField id="password" label="비밀번호" type="password" required value={password} onChange={(e) => { setPassword(e.target.value); validatePassword(e.target.value); }} />
          {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}

          {/* 비밀번호 확인 */}
          <TextField id="password_confirm" label="비밀번호 확인" type="password" required value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); validatePasswordConfirm(e.target.value); }} />
          {passwordConfirmError && <p className="mt-2 text-sm text-red-600">{passwordConfirmError}</p>}

          {/* 닉네임 */}
          <TextField id="user_name" label="닉네임" type="text" required value={nickname} onChange={(e) => setNickname(e.target.value)} />

          {/* 전화번호 */}
          <div>
            <label className="text-sm font-medium text-gray-700">전화번호 *</label>
            <div className="mt-1 grid grid-cols-[auto_auto_1fr_auto_1fr] items-center gap-2">
              <CategorySelect
                categories={PHONE_PREFIX_OPTIONS}
                selected={PHONE_PREFIX_OPTIONS.find(opt => opt.value === phone1)}
                onChange={phonePrefixSelected}
                className="w-24"
              />
              <span className="text-gray-500 text-center">-</span>
              <TextField 
                id="phone2" 
                label="" 
                value={phone2} 
                onChange={onPhone2} 
                maxLength={4}
              />
              <span className="text-gray-500 text-center">-</span>
              <TextField 
                id="phone3" 
                label="" 
                value={phone3} 
                onChange={onPhone3} 
                inputRef={phone3Ref}
                maxLength={4}
              />
            </div>
            <Button type="button" onClick={onSendCode} disabled={!canSend || phoneVerified || !phone2 || !phone3} className="mt-2 w-full">
              {phoneVerified ? '인증완료' : leftSec > 0 ? `재전송(${mmss})` : isSending ? '발송중...' : '인증번호 발송'}
            </Button>
            {phoneError && <p className="mt-2 text-sm text-red-600">{phoneError}</p>}
          </div>

          {/* 인증번호 */}
          {!phoneVerified && leftSec > 0 && (
            <div className="flex gap-2">
              <TextField id="otp" label="인증번호" type="text" value={otp} onChange={(e) => { const v = onlyDigits(e.target.value).slice(0, 6); setOtp(v); setOtpError(''); }} />
              <Button type="button" onClick={onVerifyCode} disabled={isVerifying}>
                {isVerifying ? '확인중...' : '인증확인'}
              </Button>
            </div>
          )}
          {otpError && <p className="mt-2 text-sm text-red-600">{otpError}</p>}
          {infoMsg && <p className="mt-2 text-sm text-green-600">{infoMsg}</p>}

          {/* 성별 및 생년월일 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">성별</label>
              <div className="flex items-center gap-4 pt-2">
                <label><input type="radio" name="gender" value="남자" checked={gender === '남자'} onChange={(e) => setGender(e.target.value)} /><span className="ml-2">남자</span></label>
                <label><input type="radio" name="gender" value="여자" checked={gender === '여자'} onChange={(e) => setGender(e.target.value)} /><span className="ml-2">여자</span></label>
              </div>
            </div>
            <div className="relative" ref={datePickerRef}>
              <TextField
                id="birthDate"
                label="생년월일"
                value={birthDate}
                readOnly
                onClick={() => setIsDatePickerOpen(prev => !prev)}
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


          {/* 약관 동의 */}
          <div className="space-y-2">
            <div>
              <label className="flex items-center">
                <input type="checkbox" name="all" className="h-4 w-4 rounded" onChange={handleAgreementChange} checked={agreements.termsOfService && agreements.privacyPolicy} />
                <span className="ml-2 text-sm text-gray-900">전체 동의</span>
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" name="termsOfService" className="h-4 w-4 rounded" onChange={handleAgreementChange} checked={agreements.termsOfService} />
                <span className="ml-2 text-sm text-gray-600">[필수] 이용약관 동의</span>
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" name="privacyPolicy" className="h-4 w-4 rounded" onChange={handleAgreementChange} checked={agreements.privacyPolicy} />
                <span className="ml-2 text-sm text-gray-600">[필수] 개인정보 수집 및 이용 동의</span>
              </label>
            </div>
          </div>

          <Button variant="primary" size="lg" className="w-full" type="submit" disabled={!isValid || !phoneVerified}>
            가입하기
          </Button>
        </form>
      </div>
    </div>
  );
};

export default EmailSignUpForm;