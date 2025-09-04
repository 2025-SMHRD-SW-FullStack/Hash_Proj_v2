import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../stores/authStore';
import { updateUserInfo, phoneSend, phoneVerify } from '../../../service/authService';
import { uploadImages } from '../../../service/uploadService';
import { getAddresses } from '../../../service/addressService';
import AddressBookModal from '../../../components/address/AddressBookModal';
import AccountDeletionModal from '../../../components/modals/AccountDeletionModal';

// 새로 만든 컴포넌트들을 import 합니다.
import BasicInfoSection from '../../../components/myPage/myInfo/BasicInfoSection';
import SecuritySection from '../../../components/myPage/myInfo/SecuritySection';
import AddressSection from '../../../components/myPage/myInfo/AddressSection';

// ✅ 스타일 정의는 MyInfoPage에 남겨두고 export해서 하위 컴포넌트에서 import하여 사용합니다.
export const SectionContainer = ({ title, children }) => (
  <div className="border rounded-lg p-6 shadow-sm bg-white">
    <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <div className="space-y-6">{children}</div>
  </div>
);

export const FormRow = ({ label, children }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 items-center">
    <label className="text-sm font-semibold text-gray-700 mb-2 md:mb-0">{label}</label>
    <div className="md:col-span-3">{children}</div>
  </div>
);

export const inputStyle =
  'w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';

export const readOnlyInputStyle = `${inputStyle} bg-gray-100 cursor-not-allowed`;


const MyInfoPage = () => {
  // ✅ 모든 state와 로직은 그대로 여기에 둡니다.
  const { user, login } = useAuthStore();
  const navigate = useNavigate();

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
  
  // ... (모든 핸들러 함수와 useEffect는 그대로 유지)
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

    useEffect(() => {
      if (user) {
        setProfileImageUrl(user.profileImageUrl || '');
        setNickname(user.nickname || '');
        setGender(user.gender || '');
        setBirthDate(user.birthDate || '');
        setPhoneParts({
          part1: user.phoneNumber?.substring(0, 3) || '010',
          part2: user.phoneNumber?.substring(3, 7) || '',
          part3: user.phoneNumber?.substring(7, 11) || '',
        });
      }
    }, [user]); 
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
      setIsEditing(false); 
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
    setIsEditing(false);
  };

  return (
    <div className="w-full mx-auto">
      <div className="space-y-8">
        <h1 className="hidden md:block text-lg font-bold text-gray-800">내 정보 수정</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <BasicInfoSection
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              isProfileEditable={isProfileEditable}
              user={user}
              profileImageUrl={profileImageUrl}
              uploading={uploading}
              fileInputRef={fileInputRef}
              handleImageChange={handleImageChange}
              nickname={nickname}
              setNickname={setNickname}
              phoneParts={phoneParts}
              handlePhonePartChange={handlePhonePartChange}
              phoneInput2={phoneInput2}
              phoneInput3={phoneInput3}
              isPhoneEditable={isPhoneEditable}
              phoneVerifyToken={phoneVerifyToken}
              setIsPhoneEditable={setIsPhoneEditable}
              otp={otp}
              setOtp={setOtp}
              leftSec={leftSec}
              handleSendCode={handleSendCode}
              isSending={isSending}
              handleVerifyCode={handleVerifyCode}
              isVerifying={isVerifying}
              infoMsg={infoMsg}
              phoneError={phoneError}
              gender={gender}
              setGender={setGender}
              birthDate={birthDate}
              setBirthDate={setBirthDate}
              isDatePickerOpen={isDatePickerOpen}
              setIsDatePickerOpen={setIsDatePickerOpen}
              datePickerRef={datePickerRef}
              handleSave={handleSave}
              handleCancel={handleCancel}
            />
            <AddressSection 
              primaryAddress={primaryAddress}
              onManageAddress={() => setIsAddrModalOpen(true)}
            />
          </div>

          <div className="lg:col-span-1">
            <SecuritySection 
              user={user}
              handlePasswordReset={handlePasswordReset}
            />
          </div>
        </div>
        
        <div className="flex justify-start pt-4">
          <button onClick={() => setIsDeletionModalOpen(true)} className="text-sm text-gray-500 hover:text-red-500 underline border-none">회원 탈퇴</button>
        </div>
      </div>
      
      <AddressBookModal open={isAddrModalOpen} onClose={() => { setIsAddrModalOpen(false); reloadAddresses(); }} onSelected={() => {}} />
      <AccountDeletionModal isOpen={isDeletionModalOpen} onClose={() => setIsDeletionModalOpen(false)} />
    </div>
  );
};

export default MyInfoPage;