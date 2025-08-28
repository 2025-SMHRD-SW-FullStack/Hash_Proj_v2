// src/pages/user/myPage/MyInfoPage.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import useAuthStore from '../../../stores/authStore';
import { updateUserInfo, phoneSend, phoneVerify } from '../../../service/authService';
import Button from '../../../components/common/Button';
import AddressBookModal from '../../../components/address/AddressBookModal';
import { getAddresses } from '../../../service/addressService';

// 재사용 가능한 스타일
const sectionStyle = "border rounded-lg p-6 shadow-sm";
const titleStyle = "text-xl font-bold mb-4";
const labelStyle = "text-sm font-semibold text-gray-600 mb-1 block";
const inputStyle = "w-full h-11 rounded-lg border border-gray-300 px-3";

const MyInfoPage = () => {
  const { user, login } = useAuthStore(); // login 액션을 가져와 사용자 정보 업데이트
  
  // 폼 상태
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || '');
  const [nickname, setNickname] = useState(user?.nickname || '');

  // 전화번호 관련 상태
  const [phone, setPhone] = useState(user?.phoneNumber || '');
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

  // 타이머 로직
  useEffect(() => {
    if (leftSec <= 0) return () => clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setLeftSec(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [leftSec]);

  // 주소록 로딩
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

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      setPhoneError('휴대폰 번호를 정확히 입력해주세요.');
      return;
    }
    setIsSending(true);
    setPhoneError('');
    setInfoMsg('');
    try {
      await phoneSend(phone);
      setInfoMsg('인증번호를 발송했습니다.');
      setLeftSec(180);
    } catch (e) {
      setPhoneError('인증번호 발송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!otp) {
      setPhoneError('인증번호를 입력해주세요.');
      return;
    }
    setIsVerifying(true);
    setPhoneError('');
    try {
      const res = await phoneVerify({ phoneNumber: phone, code: otp });
      if (res.phoneVerifyToken) {
        setPhoneVerifyToken(res.phoneVerifyToken);
        setInfoMsg('인증되었습니다. 저장을 눌러 변경을 완료하세요.');
        setIsPhoneEditable(false);
        setLeftSec(0);
      } else {
        throw new Error('인증 토큰이 없습니다.');
      }
    } catch (e) {
      setPhoneError('인증번호가 올바르지 않습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      nickname,
      profileImageUrl,
    };

    if (phoneVerifyToken) {
      payload.phoneNumber = phone;
      payload.phoneVerifyToken = phoneVerifyToken;
    }

    try {
      const updatedLoginData = await updateUserInfo(payload);
      // 스토어의 user 정보와 토큰을 함께 업데이트합니다.
      const currentAccessToken = useAuthStore.getState().accessToken;
      login({ accessToken: currentAccessToken, user: updatedLoginData });
      alert('회원 정보가 성공적으로 수정되었습니다.');
      setPhoneVerifyToken(null);
    } catch (error) {
      alert('정보 수정에 실패했습니다: ' + (error.message || ''));
    }
  };
  
  return (
    <div className="space-y-8">
      <h2 className={titleStyle}>내 정보 수정</h2>
      
      {/* 프로필 정보 */}
      <div className={sectionStyle}>
        <div className="flex items-center space-x-6">
          <img src={profileImageUrl || 'https://via.placeholder.com/100'} alt="프로필" className="w-24 h-24 rounded-full object-cover" />
          <div>
            <label htmlFor="nickname" className={labelStyle}>닉네임</label>
            <input id="nickname" type="text" value={nickname} onChange={e => setNickname(e.target.value)} className={inputStyle} />
          </div>
        </div>
      </div>

      {/* 계정 정보 */}
      <div className={sectionStyle}>
        <h3 className="font-semibold mb-4">계정 정보</h3>
        <div className="space-y-4">
          <div>
            <label className={labelStyle}>아이디(이메일)</label>
            <input type="text" value={user?.email || ''} readOnly disabled className={`${inputStyle} bg-gray-100 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelStyle}>비밀번호</label>
            <Button variant="whiteBlack" onClick={() => alert('비밀번호 변경 페이지로 이동합니다.')}>
              비밀번호 변경
            </Button>
          </div>
          <div>
            <label className={labelStyle}>연락처</label>
            <div className="flex items-center gap-2">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} readOnly={!isPhoneEditable} className={`${inputStyle} ${!isPhoneEditable ? 'bg-gray-100' : ''}`} />
              <Button variant="whiteBlack" onClick={() => setIsPhoneEditable(true)} disabled={isPhoneEditable}>
                변경
              </Button>
            </div>
          </div>
          {isPhoneEditable && (
            <div className="pl-4 mt-2 border-l-2 space-y-2">
              <div className="flex items-center gap-2">
                <input type="text" placeholder="인증번호 입력" value={otp} onChange={e => setOtp(e.target.value)} className={inputStyle} />
                <Button onClick={handleSendCode} disabled={isSending || leftSec > 0}>
                  {leftSec > 0 ? `재전송 (${leftSec}s)` : '인증번호 발송'}
                </Button>
              </div>
              {leftSec > 0 && <Button onClick={handleVerifyCode} disabled={isVerifying}>인증 확인</Button>}
              {(infoMsg || phoneError) && (
                <p className={`text-sm ${phoneError ? 'text-red-500' : 'text-green-600'}`}>
                  {phoneError || infoMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 주소록 */}
      <div className={sectionStyle}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">주소록</h3>
          <Button variant="whiteBlack" onClick={() => setIsAddrModalOpen(true)}>+ 배송지 추가</Button>
        </div>
        {primaryAddress ? (
          <div>
            <p className="font-medium">{primaryAddress.receiver} ({primaryAddress.phone})</p>
            <p className="text-sm text-gray-500">({primaryAddress.zipcode}) {primaryAddress.addr1} {primaryAddress.addr2}</p>
          </div>
        ) : (
          <p className="text-gray-500">등록된 배송지가 없습니다.</p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="unselected" onClick={() => navigate('/user/mypage')}>취소</Button>
        <Button onClick={handleSave}>저장하기</Button>
      </div>

      <AddressBookModal
        open={isAddrModalOpen}
        onClose={() => {
          setIsAddrModalOpen(false);
          reloadAddresses();
        }}
        onSelected={(addr) => { /* 선택 시 동작은 이 페이지에선 불필요 */ }}
      />
    </div>
  );
};

export default MyInfoPage;