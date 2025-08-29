import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../stores/authStore';
import { updateUserInfo, phoneSend, phoneVerify } from '../../../service/authService';
import Button from '../../../components/common/Button';
import AddressBookModal from '../../../components/address/AddressBookModal';
import { getAddresses } from '../../../service/addressService';

// =================================================================================
// ✨ UI/UX 개선을 위한 스타일 컴포넌트 및 상수 ✨
// =================================================================================

// 각 정보 섹션을 감싸는 컨테이너 스타일
const SectionContainer = ({ title, children }) => (
  <div className="border rounded-lg p-6 shadow-sm bg-white">
    <h3 className="text-lg font-semibold mb-6 pb-4 border-b">{title}</h3>
    <div className="space-y-6">{children}</div>
  </div>
);

// '레이블 + 입력필드' 한 줄에 대한 스타일
const FormRow = ({ label, children }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 items-center">
    <label className="text-sm font-semibold text-gray-700 mb-2 md:mb-0">{label}</label>
    <div className="md:col-span-3">{children}</div>
  </div>
);

// 기본 입력 필드 스타일
const inputStyle = "w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";
// 읽기 전용 입력 필드 스타일
const readOnlyInputStyle = `${inputStyle} bg-gray-100 cursor-not-allowed`;


// =================================================================================
// ✨ MyInfoPage 컴포넌트 ✨
// =================================================================================

const MyInfoPage = () => {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();

  // --- 상태 관리 (State) ---

  // 프로필 정보
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || '');
  const [nickname, setNickname] = useState(user?.nickname || '');

  // 전화번호 (세 부분으로 나누어 관리)
  const [phoneParts, setPhoneParts] = useState({
    part1: user?.phoneNumber?.substring(0, 3) || '',
    part2: user?.phoneNumber?.substring(3, 7) || '',
    part3: user?.phoneNumber?.substring(7, 11) || '',
  });
  const fullPhoneNumber = useMemo(() => `${phoneParts.part1}${phoneParts.part2}${phoneParts.part3}`, [phoneParts]);

  // 전화번호 인증 관련 상태
  const [isPhoneEditable, setIsPhoneEditable] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneVerifyToken, setPhoneVerifyToken] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [leftSec, setLeftSec] = useState(0);
  const timerRef = useRef(null);

  // 주소록 관련 상태
  const [addresses, setAddresses] = useState([]);
  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const primaryAddress = useMemo(() => addresses.find(a => a.primaryAddress) || addresses[0], [addresses]);

  // 전화번호 자동 포커스 이동을 위한 Ref
  const phoneInput2 = useRef(null);
  const phoneInput3 = useRef(null);

  // --- 생명주기 및 데이터 로딩 (useEffect) ---

  // 타이머 로직
  useEffect(() => {
    if (leftSec <= 0) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setLeftSec(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [leftSec]);

  // 주소록 데이터 로드
  const reloadAddresses = async () => {
    try {
      const addrData = await getAddresses();
      setAddresses(addrData || []);
    } catch (error) {
      console.error("주소록 로딩 실패", error);
    }
  };

  useEffect(() => {
    reloadAddresses();
  }, []);


  // --- 이벤트 핸들러 ---

  // 전화번호 입력 변경 핸들러 (자동 포커스 이동 포함)
  const handlePhonePartChange = (part, maxLength, nextRef) => (e) => {
    const { value } = e.target;
    if (value.length <= maxLength) {
      setPhoneParts(prev => ({ ...prev, [part]: value }));
      if (value.length === maxLength && nextRef?.current) {
        nextRef.current.focus();
      }
    }
  };

  // 인증번호 발송
  const handleSendCode = async () => {
    if (fullPhoneNumber.length < 10) {
      setPhoneError('휴대폰 번호를 정확히 입력해주세요.');
      return;
    }
    setIsSending(true);
    setPhoneError('');
    setInfoMsg('');
    try {
      await phoneSend(fullPhoneNumber);
      setInfoMsg('인증번호를 발송했습니다. 3분 안에 입력해주세요.');
      setLeftSec(180);
    } catch (e) {
      setPhoneError('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSending(false);
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    if (!otp) {
      setPhoneError('인증번호를 입력해주세요.');
      return;
    }
    setIsVerifying(true);
    setPhoneError('');
    try {
      const res = await phoneVerify({ phoneNumber: fullPhoneNumber, code: otp });
      if (res.phoneVerifyToken) {
        setPhoneVerifyToken(res.phoneVerifyToken);
        setInfoMsg('✅ 인증되었습니다. 저장을 눌러 변경을 완료하세요.');
        setIsPhoneEditable(false);
        setLeftSec(0);
        setPhoneError(''); // 성공 시 에러 메시지 초기화
      } else {
        throw new Error('인증 토큰이 없습니다.');
      }
    } catch (e) {
      setPhoneError('인증번호가 올바르지 않습니다.');
      setInfoMsg(''); // 실패 시 안내 메시지 초기화
    } finally {
      setIsVerifying(false);
    }
  };

  // 전체 정보 저장
  const handleSave = async () => {
    const payload = {
      nickname,
      profileImageUrl,
      // ✨ 참고: 성별, 생년월일 저장은 백엔드 구현 필요
    };

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

  // --- 렌더링 ---
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800">내 정보 수정</h2>

      {/* 프로필 정보 */}
      <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg shadow-sm bg-white">
        <div className="relative">
          <img
            src={profileImageUrl || 'https://via.placeholder.com/120'}
            alt="프로필"
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
          />
          <button className="absolute bottom-1 right-1 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>

      {/* 기본 정보 */}
      <SectionContainer title="기본 정보">
        <FormRow label="아이디(이메일)">
          <input type="text" value={user?.email || ''} readOnly disabled className={readOnlyInputStyle} />
        </FormRow>
        {/* <FormRow label="비밀번호">
          <Button variant="whiteBlack" onClick={() => navigate('/find-auth?tab=findPw')}>
            비밀번호 재설정
          </Button>
        </FormRow> */}
        <FormRow label="닉네임">
          <input id="nickname" type="text" value={nickname} onChange={e => setNickname(e.target.value)} className={inputStyle} />
        </FormRow>
        <FormRow label="전화번호">
          <div className="flex items-center gap-2">
            <input type="tel" maxLength="3" value={phoneParts.part1} onChange={handlePhonePartChange('part1', 3, phoneInput2)} readOnly={!isPhoneEditable} className={`${inputStyle} text-center ${!isPhoneEditable ? 'bg-gray-100' : ''}`} />
            <span>-</span>
            <input type="tel" maxLength="4" ref={phoneInput2} value={phoneParts.part2} onChange={handlePhonePartChange('part2', 4, phoneInput3)} readOnly={!isPhoneEditable} className={`${inputStyle} text-center ${!isPhoneEditable ? 'bg-gray-100' : ''}`} />
            <span>-</span>
            <input type="tel" maxLength="4" ref={phoneInput3} value={phoneParts.part3} onChange={handlePhonePartChange('part3', 4, null)} readOnly={!isPhoneEditable} className={`${inputStyle} text-center ${!isPhoneEditable ? 'bg-gray-100' : ''}`} />
            
            {!phoneVerifyToken && (
                <Button variant="whiteBlack" onClick={() => setIsPhoneEditable(true)} disabled={isPhoneEditable} className="flex-shrink-0">
                    수정
                </Button>
            )}
          </div>
        </FormRow>
        {/* 전화번호 인증 영역 */}
        {isPhoneEditable && (
          <FormRow label="인증번호">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className='relative w-full'>
                    <input type="text" placeholder="인증번호 6자리" value={otp} onChange={e => setOtp(e.target.value)} className={inputStyle} maxLength="6"/>
                    {leftSec > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-500 font-semibold">{`${Math.floor(leftSec/60)}:${(leftSec%60).toString().padStart(2, '0')}`}</span>}
                </div>
                <Button onClick={handleSendCode} disabled={isSending || leftSec > 0} className="flex-shrink-0">
                  {isSending ? '전송 중...' : (leftSec > 0 ? '재전송' : '인증번호 받기')}
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
        {/* ✨ 요청 이미지 기반 추가 항목 (백엔드 연동 필요) */}
        <FormRow label="성별">
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="male" className="form-radio h-4 w-4"/>
                    <span>남성</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="female" className="form-radio h-4 w-4"/>
                    <span>여성</span>
                </label>
            </div>
        </FormRow>
        <FormRow label="생년월일">
            <input type="text" placeholder="예) 19990101" className={inputStyle} maxLength="8" />
        </FormRow>
      </SectionContainer>
      
      {/* 주소록 */}
      <SectionContainer title="주소록">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">기본 배송지</p>
          <Button variant="whiteBlack" onClick={() => setIsAddrModalOpen(true)}>+ 배송지 관리</Button>
        </div>
        {primaryAddress ? (
          <div>
            <p className="font-semibold">{primaryAddress.receiver} <span className='text-gray-500 font-normal'>({primaryAddress.phone})</span></p>
            <p className="text-sm text-gray-600 mt-1">({primaryAddress.zipcode}) {primaryAddress.addr1} {primaryAddress.addr2}</p>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">등록된 배송지가 없습니다.</p>
        )}
      </SectionContainer>

      {/* 최종 동작 버튼 */}
      <div className="flex justify-between items-center pt-4">
        <Button variant="text" className="text-gray-500 hover:text-red-500">회원 탈퇴</Button>
        <div className="flex justify-end space-x-2">
            <Button variant="unselected" onClick={() => navigate(-1)}>취소</Button>
            <Button onClick={handleSave}>수정하기</Button>
        </div>
      </div>

      <AddressBookModal
        open={isAddrModalOpen}
        onClose={() => {
          setIsAddrModalOpen(false);
          reloadAddresses();
        }}
        onSelected={() => { /* 선택 시 동작은 이 페이지에선 불필요 */ }}
      />
    </div>
  );
};

export default MyInfoPage;