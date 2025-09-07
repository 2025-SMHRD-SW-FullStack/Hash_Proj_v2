import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { phoneSend, phoneVerify, findId, resetPassword } from "../../service/authService";
import useAuthStore from "../../stores/authStore";
import Button from "../../components/common/Button";

// 타이머 포맷 유틸
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const FindAuthPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore(); // 로그인 상태 확인
  const { defaultTab, email: emailFromState, phone: phoneFromState } = location.state || {};
  
  const [activeTab, setActiveTab] = useState(defaultTab || searchParams.get("tab") || "findId");
  
  // --- 상태 관리 ---
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneVerifyToken, setPhoneVerifyToken] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const [foundEmails, setFoundEmails] = useState([]); // 찾은 이메일을 저장할 상태
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 비정상 접근 차단 로직
  useEffect(() => {
    if (isLoggedIn && !location.state) {
      alert('비정상적인 접근입니다.');
      navigate('/', { replace: true });
    } else {
        setPhone(phoneFromState || "");
        setEmail(emailFromState || "");
    }
  }, [isLoggedIn, location.state, navigate, phoneFromState, emailFromState]);

  // 타이머
  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft]);
  
  // 탭 변경 시 상태 초기화
  useEffect(() => {
    setStep(1);
    setOtp("");
    setPhoneVerifyToken(null);
    setTimeLeft(0);
    setLoading(false);
    setError("");
    setFoundEmails([]);
    setNewPassword("");
    setConfirmPassword("");
    setPhone(phoneFromState || "");
    setEmail(emailFromState || "");
  }, [activeTab, phoneFromState, emailFromState]);

  const handleSendCode = async () => {
    if (activeTab === 'findPw' && !email.trim()) {
      return setError("아이디(이메일)를 입력해주세요.");
    }
    if (phone.length < 10) {
      return setError("휴대폰 번호를 정확히 입력해주세요.");
    }
    setLoading(true);
    setError("");
    try {
      await phoneSend(phone);
      setStep(2);
      setTimeLeft(180);
    } catch (e) {
      setError(e?.response?.data?.message || "인증번호 발송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 4) return setError("인증번호를 정확히 입력해주세요.");
    setLoading(true);
    setError("");
    try {
      const res = await phoneVerify({ phoneNumber: phone, code: otp });
      if (res.phoneVerifyToken) {
        setPhoneVerifyToken(res.phoneVerifyToken);
        if (activeTab === 'findId') {
          // 아이디 찾기 API 호출
          const findResult = await findId({ phoneNumber: phone, phoneVerifyToken: res.phoneVerifyToken });
          setFoundEmails(findResult.emails || []); // 결과 저장
          setStep(3); // 결과 표시 단계로 이동
        } else {
          setStep(3); // 비밀번호 재설정 단계로 이동
        }
      } else {
        throw new Error("인증 토큰이 없습니다.");
      }
    } catch (e) {
      setError(e?.response?.data?.message || "인증번호가 올바르지 않거나 만료되었습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) return setError("비밀번호는 8자 이상이어야 합니다.");
    if (newPassword !== confirmPassword) return setError("새 비밀번호가 일치하지 않습니다.");
    setLoading(true);
    setError("");
    try {
      await resetPassword({
        loginId: email,
        phoneNumber: phone,
        phoneVerifyToken,
        newPassword,
        newPasswordConfirm: confirmPassword,
      });
      alert("비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.");
      navigate("/login");
    } catch (e) {
      setError(e?.response?.data?.message || "비밀번호 재설정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // --- 아이디 찾기 탭 렌더링 ---
  const renderFindId = () => (
    <div className="space-y-6">
      {step === 1 && (
        <>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화번호 ('-' 제외)" className="w-full h-12 border rounded-lg px-4" />
          <Button onClick={handleSendCode} className="w-full" disabled={loading}>{loading ? "전송 중..." : "인증번호 받기"}</Button>
        </>
      )}
      {step === 2 && (
        <>
          <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="인증번호 6자리" className="w-full h-12 border rounded-lg px-4 text-center tracking-[.5em]" maxLength="6"/>
          <p className="text-sm text-gray-500 text-center">남은 시간 {formatTime(timeLeft)}</p>
          <Button onClick={handleVerify} className="w-full" disabled={loading}>{loading ? "확인 중..." : "인증 확인"}</Button>
        </>
      )}
      {/* --- 아이디 찾기 결과 표시 (step 3) --- */}
      {step === 3 && (
        <div className="p-6 rounded-lg bg-gray-50 text-center">
          <h3 className="text-lg font-semibold mb-2">아이디 찾기 결과</h3>
          {foundEmails.length > 0 ? (
              <>
              <p className="text-gray-700">회원님의 아이디입니다.</p>
              {foundEmails.map(e => <p key={e} className="text-lg font-bold text-[#5075D9] mt-2">{e}</p>)}
              </>
          ) : <p>가입된 아이디가 없습니다.</p>}
          <Button onClick={() => navigate('/login')} className="w-full mt-4">로그인하기</Button>
        </div>
      )}
    </div>
  );
  
  // --- 비밀번호 재설정 탭 렌더링 ---
  const renderFindPw = () => (
    <div className="space-y-6">
        {step === 1 && (
        <>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="아이디(이메일)" className="w-full h-12 border rounded-lg px-4"/>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화번호 ('-' 제외)" className="w-full h-12 border rounded-lg px-4"/>
            <Button onClick={handleSendCode} className="w-full" disabled={loading}>{loading ? "전송 중..." : "인증번호 받기"}</Button>
        </>
        )}
        {step === 2 && (
        <>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="인증번호 6자리"
              className="w-full h-12 border rounded-lg px-4 text-center text-lg tracking-[.3em] focus:focus:ring focus:ring-blue-100"
              maxLength={6}
              inputMode="numeric"
            />
            <p className="text-sm text-gray-500 text-center">남은 시간 {formatTime(timeLeft)}</p>
            <Button onClick={handleVerify} className="w-full" disabled={loading}>{loading ? "확인 중..." : "인증 확인"}</Button>
        </>
        )}
        {step === 3 && (
        <>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="새 비밀번호" className="w-full h-12 border rounded-lg px-4"/>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="새 비밀번호 확인" className="w-full h-12 border rounded-lg px-4"/>
            <Button onClick={handleResetPassword} className="w-full" disabled={loading}>{loading ? "변경 중..." : "비밀번호 재설정"}</Button>
        </>
        )}
    </div>
  );

  return (
    <div className="max-w-md mx-auto my-10 p-8 border rounded-lg ">
      <p className="text-center text-2xl font-semibold">회원 정보 찾기</p>
      {/* 탭 */}
      <div className="flex border-b mb-6">
        {["findId", "findPw"].map(tab => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center font-semibold transition-all duration-200
              ${activeTab === tab 
                ? "border-b-2 "
                : "text-primary bg-blue-50 hover:text-gray-600 hover:bg-gray-50"}
            `}
          >
            {tab === "findId" ? "아이디 찾기" : "비밀번호 재설정"}
          </Button>
        ))}
      </div>

      {/* 오류 메시지 */}
      {error && <p className="text-red-500 text-sm text-left mb-2">{error}</p>}

      {/* 단계 안내 */}
      <p className="text-sm text-gray-500 mb-4 text-right">
        단계 {step}/3
      </p>

      {/* 탭 내용 */}
      <div className="space-y-4">
        {activeTab === "findId" ? renderFindId() : renderFindPw()}
      </div>
    </div>

  );
};

export default FindAuthPage;