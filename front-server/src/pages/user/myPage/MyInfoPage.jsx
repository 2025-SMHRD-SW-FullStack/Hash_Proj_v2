// src/pages/user/myPage/MyInfoPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../stores/authStore';
import { updateUserInfo, phoneSend, phoneVerify } from '../../../service/authService';
import { uploadProfileImage } from '../../../service/uploadService';
import Button from '../../../components/common/Button';
import AddressBookModal from '../../../components/address/AddressBookModal';
import { getAddresses } from '../../../service/addressService';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';


// 소셜 아이콘
import GoogleIcon from '../../../assets/images/google.png';
import NaverIcon from '../../../assets/images/naver.png';
import KakaoIcon from '../../../assets/images/kakao.png';
import AccountDeletionModal from '../../../components/modals/AccountDeletionModal';

/** 각 정보 섹션을 감싸는 컨테이너 스타일 */
export const SectionContainer = ({ title, children }) => (
  <div className="border rounded-lg p-6 shadow-sm bg-white">
    <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <div className="space-y-6">{children}</div>
  </div>
);

/** '레이블 + 입력필드' 한 줄에 대한 스타일 */
export const FormRow = ({ label, children }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 items-center">
    <label className="text-sm font-semibold text-gray-700 mb-2 md:mb-0">{label}</label>
    <div className="md:col-span-3">{children}</div>
  </div>
);

/** 기본 입력 필드 스타일 */
export const inputStyle =
  'w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';

/** 읽기 전용 입력 필드 스타일 */
export const readOnlyInputStyle = `${inputStyle} bg-gray-100 cursor-not-allowed`;

// 날짜를 'YYYY-MM-DD' 형식으로 변환하는 유틸리티 함수
const ymd = (d) => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

const MyInfoPage = () => {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();

  // 수정 모드 상태
  const [isEditing, setIsEditing] = useState(false);

  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || '');
  const [uploading, setUploading] = useState(false);

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [birthDate, setBirthDate] = useState(user?.birthDate || '');

  const [phoneParts, setPhoneParts] = useState({
    part1: user?.phoneNumber?.substring(0, 3) || '010',
    part2: user?.phoneNumber?.substring(3, 7) || '',
    part3: user?.phoneNumber?.substring(7, 11) || '',
  });
  const fullPhoneNumber = useMemo(() => `${phoneParts.part1}${phoneParts.part2}${phoneParts.part3}`, [phoneParts]);
  const [isPhoneEditable, setIsPhoneEditable] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneVerifyToken, setPhoneVerifyToken] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [leftSec, setLeftSec] = useState(0);
  const timerRef = useRef(null);
  const [addresses, setAddresses] = useState([]);
  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const primaryAddress = useMemo(() => addresses.find((a) => a.primaryAddress) || addresses[0], [addresses]);
  const phoneInput2 = useRef(null);
  const phoneInput3 = useRef(null);
  const fileInputRef = useRef(null);
  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef(null);

  const isSocialUser = user?.provider !== 'LOCAL';
  const hasInitialInfo = useMemo(() => !!(user?.gender && user?.birthDate), [user]);
  const [isProfileEditable, setIsProfileEditable] = useState(!isSocialUser || !hasInitialInfo);


  useEffect(() => {
    if (leftSec > 0) {
      timerRef.current = setInterval(() => setLeftSec(s => s > 0 ? s - 1 : 0), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [leftSec]);
  
  // 달력 외부 클릭 시 닫기
  useEffect(() => {
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


  const reloadAddresses = async () => {
    try {
      const addrData = await getAddresses();
      setAddresses(addrData || []);
    } catch (error) {
      console.error('주소록 로딩 실패', error);
    }
  };
  useEffect(() => { reloadAddresses(); }, []);

  const handlePhonePartChange = (part, maxLength, nextRef) => (e) => {
    const { value } = e.target;
    if (/^\d*$/.test(value) && value.length <= maxLength) {
      setPhoneParts(prev => ({ ...prev, [part]: value }));
      if (value.length === maxLength && nextRef?.current) nextRef.current.focus();
    }
  };

  const handleSendCode = async () => {
    if (fullPhoneNumber.length < 10) {
      setPhoneError('휴대폰 번호를 정확히 입력해주세요.');
      return;
    }
    setIsSending(true); setPhoneError(''); setInfoMsg('');
    try {
      await phoneSend(fullPhoneNumber);
      setInfoMsg('인증번호를 발송했습니다. 3분 안에 입력해주세요.');
      setLeftSec(180);
    } catch (e) {
      setPhoneError('인증번호 발송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!otp) { setPhoneError('인증번호를 입력해주세요.'); return; }
    setIsVerifying(true); setPhoneError('');
    try {
      const res = await phoneVerify({ phoneNumber: fullPhoneNumber, code: otp });
      if (res.phoneVerifyToken) {
        setPhoneVerifyToken(res.phoneVerifyToken);
        setInfoMsg('✅ 인증되었습니다. 저장을 눌러 변경을 완료하세요.');
        setIsPhoneEditable(false);
        setLeftSec(0);
        setPhoneError('');
      } else {
        throw new Error('인증 토큰이 없습니다.');
      }
    } catch (e) {
      setPhoneError('인증번호가 올바르지 않습니다.');
      setInfoMsg('');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
        const res = await uploadImages('PROFILE', [file]);
        const newImageUrl = res[0]?.url;
        if (newImageUrl) {
          setProfileImageUrl(newImageUrl);
        } else {
          throw new Error('이미지 URL을 받지 못했습니다.');
        }
    } catch (error) {
      console.error(error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    const payload = { nickname, profileImageUrl };
    if (isProfileEditable) {
        payload.gender = gender;
        payload.birthDate = birthDate; 
    }
    if (phoneVerifyToken) {
      payload.phoneNumber = fullPhoneNumber;
      payload.phoneVerifyToken = phoneVerifyToken;
    }
    try {
      const updatedUser = await updateUserInfo(payload);
      const currentAccessToken = useAuthStore.getState().accessToken;
      login({ accessToken: currentAccessToken, user: updatedUser });
      alert('저장되었습니다.');
      if (isSocialUser) {
        setIsProfileEditable(false);
      }
      setPhoneVerifyToken(null);
      setIsEditing(false); // 저장 후 조회 모드로 전환
    } catch (error) {
      alert('정보 수정에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

  const handlePasswordReset = () => {
    navigate('/find-auth', { 
      state: { 
        defaultTab: 'findPw',
        email: user?.email,
        phone: user?.phoneNumber
      }
    });
  };

  const handleCancel = () => {
    // 상태를 초기값으로 되돌림
    setProfileImageUrl(user?.profileImageUrl || '');
    setNickname(user?.nickname || '');
    setGender(user?.gender || '');
    setBirthDate(user?.birthDate || '');
    setPhoneParts({
        part1: user?.phoneNumber?.substring(0, 3) || '010',
        part2: user?.phoneNumber?.substring(3, 7) || '',
        part3: user?.phoneNumber?.substring(7, 11) || '',
    });
    setIsPhoneEditable(false);
    setPhoneVerifyToken(null);
    setPhoneError('');
    setInfoMsg('');
    setOtp('');
    // 수정 모드 종료
    setIsEditing(false);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800">내 정보 수정</h2>
        <SectionContainer title="기본 정보">
        <FormRow label="프로필 사진">
        <div className="flex items-center space-x-4">
            <img
                src={profileImageUrl || 'https://via.placeholder.com/120'}
                alt="프로필"
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
            />
             {isEditing && (
            <div className="relative">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                />
                <Button variant="blackWhite" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? '업로드중...' : '이미지 변경'}
                </Button>
            </div>
             )}
        </div>
      </FormRow>
        <FormRow label="아이디(이메일)">
          <input type="text" value={user?.email || ''} readOnly disabled className={readOnlyInputStyle} />
        </FormRow>
        <FormRow label="닉네임">
            {isEditing ? (
                 <input id="nickname" type="text" value={nickname}
                 onChange={(e) => setNickname(e.target.value)} className={inputStyle} />
            ) : (
                <p className="py-2">{nickname}</p>
            )}
        </FormRow>
        <FormRow label="전화번호">
          <div className="flex items-center gap-2">
            <input type="tel" maxLength="3" value={phoneParts.part1}
                   onChange={handlePhonePartChange('part1', 3, phoneInput2)}
                   readOnly={!isPhoneEditable || !isEditing}
                   className={`${inputStyle} text-center ${!isPhoneEditable || !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            <span>-</span>
            <input type="tel" maxLength="4" ref={phoneInput2} value={phoneParts.part2}
                   onChange={handlePhonePartChange('part2', 4, phoneInput3)}
                   readOnly={!isPhoneEditable || !isEditing}
                   className={`${inputStyle} text-center ${!isPhoneEditable || !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            <span>-</span>
            <input type="tel" maxLength="4" ref={phoneInput3} value={phoneParts.part3}
                   onChange={handlePhonePartChange('part3', 4, null)}
                   readOnly={!isPhoneEditable || !isEditing}
                   className={`${inputStyle} text-center ${!isPhoneEditable || !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            {isEditing && !phoneVerifyToken && (
              <Button variant="blackWhite" onClick={() => setIsPhoneEditable(true)} disabled={isPhoneEditable} className="flex-shrink-0">
                변경
              </Button>
            )}
          </div>
        </FormRow>
        {isEditing && isPhoneEditable && (
          <FormRow label="인증번호">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative w-full">
                  <input type="text" placeholder="인증번호 6자리" value={otp}
                         onChange={(e) => setOtp(e.target.value)} className={inputStyle} maxLength="6" />
                  {leftSec > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-500 font-semibold">
                      {`${Math.floor(leftSec / 60)}:${(leftSec % 60).toString().padStart(2, '0')}`}
                    </span>
                  )}
                </div>
                <Button onClick={handleSendCode} disabled={isSending || leftSec > 0} className="flex-shrink-0">
                  {isSending ? '전송 중...' : '인증번호 받기'}
                </Button>
              </div>
              <Button onClick={handleVerifyCode} disabled={isVerifying || !otp} className="w-full">
                {isVerifying ? '확인 중...' : '인증번호 확인'}
              </Button>
              {(infoMsg || phoneError) && (
                <p className={`text-xs mt-1 ${phoneError ? 'text-red-500' : 'text-green-600'}`}>
                  {phoneError || infoMsg}
                </p>
              )}
            </div>
          </FormRow>
        )}
        <FormRow label="성별">
        {isEditing && isProfileEditable ? (
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="gender"
                        value="M"
                        checked={gender === 'M'}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-5 h-5"
                    />
                    남성
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="gender"
                        value="F"
                        checked={gender === 'F'}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-5 h-5"
                    />
                    여성
                </label>
            </div>
        ) : (
            <p className="py-2">{user?.gender === 'M' ? '남성' : user?.gender === 'F' ? '여성' : '선택 안함'}</p>
        )}
        </FormRow>
        <FormRow label="생년월일">
        {isEditing && isProfileEditable ? (
             <div className="relative" ref={datePickerRef}>
             <input 
                 type="text" 
                 value={birthDate} 
                 readOnly 
                 onClick={() => setIsDatePickerOpen(prev => !prev)}
                 className={`${inputStyle} cursor-pointer`}
                 placeholder="YYYY-MM-DD"
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
        ) : (
            <p className="py-2">{user?.birthDate || '입력 안함'}</p>
        )}
        </FormRow>
        <div className="flex justify-end gap-2 pt-4">
            {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>수정하기</Button>
            ) : (
                <>
                    <Button variant="blackWhite" onClick={handleCancel}>취소</Button>
                    <Button onClick={handleSave}>저장하기</Button>
                </>
            )}
        </div>
      </SectionContainer>
      <SectionContainer title="보안">
        <FormRow label="비밀번호">
            <Button variant="whiteBlack" onClick={handlePasswordReset}>비밀번호 재설정</Button>
        </FormRow>
        <FormRow label="연결된 계정">
            {user?.provider && user.provider !== 'LOCAL' ? (
                <div className="flex items-center gap-2">
                    <img src={user.provider === 'GOOGLE' ? GoogleIcon : user.provider === 'NAVER' ? NaverIcon : KakaoIcon} alt={user.provider} className="w-8 h-8"/>
                    <span className="font-semibold">{user.provider.charAt(0) + user.provider.slice(1).toLowerCase()}</span>
                </div>
            ) : (<span>연결된 소셜 계정이 없습니다.</span>)}
        </FormRow>
      </SectionContainer>
      <SectionContainer title="주소록">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">기본 배송지</p>
          <Button variant="whiteBlack" onClick={() => setIsAddrModalOpen(true)}>+ 배송지 관리</Button>
        </div>
        {primaryAddress ? (
          <div>
            <p className="font-semibold">
              {primaryAddress.receiver} <span className="text-gray-500 font-normal">({primaryAddress.phone})</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              ({primaryAddress.zipcode}) {primaryAddress.addr1} {primaryAddress.addr2}
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">등록된 배송지가 없습니다.</p>
        )}
      </SectionContainer>
      <div className="flex justify-between items-center pt-4">
        <button onClick={() => setIsDeletionModalOpen(true)} className="text-sm text-gray-500 hover:text-red-500 underline border-none">
          회원 탈퇴
        </button>
      </div>
      <AddressBookModal open={isAddrModalOpen} onClose={() => { setIsAddrModalOpen(false); reloadAddresses(); }} onSelected={() => {}} />
      <AccountDeletionModal isOpen={isDeletionModalOpen} onClose={() => setIsDeletionModalOpen(false)} />
    </div>
  );
};

export default MyInfoPage;