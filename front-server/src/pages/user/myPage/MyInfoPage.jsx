// src/pages/user/myPage/MyInfoPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../stores/authStore';
import { updateUserInfo, phoneSend, phoneVerify } from '../../../service/authService';
import { uploadProfileImage } from '../../../service/uploadService';
import Button from '../../../components/common/Button';
import AddressBookModal from '../../../components/address/AddressBookModal';
import { getAddresses } from '../../../service/addressService';

// 소셜 아이콘
import GoogleIcon from '../../../assets/images/google.png';
import NaverIcon from '../../../assets/images/naver.png';
import KakaoIcon from '../../../assets/images/kakao.png';
import AccountDeletionModal from '../../../components/modals/AccountDeletionModal';

/** 각 정보 섹션을 감싸는 컨테이너 스타일 */
export const SectionContainer = ({ title, children }) => (
  <div className="border rounded-lg p-6 shadow-sm bg-white">
    <h3 className="text-lg font-semibold mb-6 pb-4 border-b">{title}</h3>
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


const MyInfoPage = () => {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();

  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || '');
  const [uploading, setUploading] = useState(false);

  const [nickname, setNickname] = useState(user?.nickname || '');
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

  useEffect(() => {
    if (leftSec > 0) {
      timerRef.current = setInterval(() => setLeftSec(s => s > 0 ? s - 1 : 0), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [leftSec]);

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

  // ✅ 프로필 이미지 업로드 (S3)
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const newImageUrl = await uploadProfileImage(file);
        setProfileImageUrl(newImageUrl);
    } catch (error) {
      console.error(error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      // 같은 파일을 다시 선택할 수 있게 input 초기화
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    const payload = { nickname, profileImageUrl };
    if (phoneVerifyToken) {
      payload.phoneNumber = fullPhoneNumber;
      payload.phoneVerifyToken = phoneVerifyToken;
    }
    try {
      const updatedUser = await updateUserInfo(payload);
      const currentAccessToken = useAuthStore.getState().accessToken;
      login({ accessToken: currentAccessToken, user: updatedUser });
      alert('회원 정보가 성공적으로 수정되었습니다.');
      setPhoneVerifyToken(null);
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

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800">내 정보 수정</h2>
      <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg shadow-sm bg-white">
        <div className="relative">
          <img
            src={profileImageUrl || 'https://via.placeholder.com/120'}
            alt="프로필"
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition disabled:opacity-60"
            disabled={uploading}
          >
            {uploading ? (
              <span className="text-xs px-2">업로드중…</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                   viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd"
                      d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <SectionContainer title="기본 정보">
        <FormRow label="아이디(이메일)">
          <input type="text" value={user?.email || ''} readOnly disabled className={readOnlyInputStyle} />
        </FormRow>
        <FormRow label="닉네임">
          <input id="nickname" type="text" value={nickname}
                 onChange={(e) => setNickname(e.target.value)} className={inputStyle} />
        </FormRow>
        <FormRow label="전화번호">
          <div className="flex items-center gap-2">
            <input type="tel" maxLength="3" value={phoneParts.part1}
                   onChange={handlePhonePartChange('part1', 3, phoneInput2)}
                   readOnly={!isPhoneEditable}
                   className={`${inputStyle} text-center ${!isPhoneEditable ? 'bg-gray-100' : ''}`} />
            <span>-</span>
            <input type="tel" maxLength="4" ref={phoneInput2} value={phoneParts.part2}
                   onChange={handlePhonePartChange('part2', 4, phoneInput3)}
                   readOnly={!isPhoneEditable}
                   className={`${inputStyle} text-center ${!isPhoneEditable ? 'bg-gray-100' : ''}`} />
            <span>-</span>
            <input type="tel" maxLength="4" ref={phoneInput3} value={phoneParts.part3}
                   onChange={handlePhonePartChange('part3', 4, null)}
                   readOnly={!isPhoneEditable}
                   className={`${inputStyle} text-center ${!isPhoneEditable ? 'bg-gray-100' : ''}`} />
            {!phoneVerifyToken && (
              <Button variant="whiteBlack" onClick={() => setIsPhoneEditable(true)} disabled={isPhoneEditable} className="flex-shrink-0">
                수정
              </Button>
            )}
          </div>
        </FormRow>
        {isPhoneEditable && (
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
            <input type="text" value={user?.gender === 'M' ? '남성' : user?.gender === 'F' ? '여성' : '알 수 없음'} readOnly className={readOnlyInputStyle} />
        </FormRow>
        <FormRow label="생년월일"><input type="text" value={user?.birthDate} readOnly className={readOnlyInputStyle} /></FormRow>
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
        <button onClick={() => setIsDeletionModalOpen(true)} className="text-sm text-gray-500 hover:text-red-500 underline">
          회원 탈퇴
        </button>
        <div className="flex justify-end space-x-2">
          <Button variant="unselected" onClick={() => navigate(-1)}>취소</Button>
          <Button onClick={handleSave} disabled={uploading}>수정하기</Button>
        </div>
      </div>
      <AddressBookModal open={isAddrModalOpen} onClose={() => { setIsAddrModalOpen(false); reloadAddresses(); }} onSelected={() => {}} />
      <AccountDeletionModal isOpen={isDeletionModalOpen} onClose={() => setIsDeletionModalOpen(false)} />
    </div>
  );
};

export default MyInfoPage;
