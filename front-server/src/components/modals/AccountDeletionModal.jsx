import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { deleteAccount } from '../../service/authService';
import Modal from '../common/Modal';
import Button from '../common/Button';

const inputStyle = 'w-full h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500';

const AccountDeletionModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSocial = user?.provider !== 'LOCAL';
  const CONFIRM_STRING = '탈퇴합니다';

  const resetState = () => {
    setStep(1);
    setReason('');
    setPassword('');
    setConfirmText('');
    setLoading(false);
    setError('');
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && !reason) {
      setError('탈퇴 사유를 선택해주세요.');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleDelete = async () => {
    if (isSocial && confirmText !== CONFIRM_STRING) {
      setError(`"${CONFIRM_STRING}"를 정확히 입력해주세요.`);
      return;
    }
    if (!isSocial && !password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const payload = isSocial ? { confirmText } : { password };
      await deleteAccount(payload);
      setStep(3); // 성공 화면으로 이동
    } catch (err) {
      setError(err?.response?.data?.message || '탈퇴 처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleFinish = () => {
    logout();
    navigate('/', { replace: true });
  };
  
  const renderStep1 = () => (
    <>
      <p className="text-gray-600 mb-4">
        떠나시는 이유를 알려주시면 서비스 개선에 큰 도움이 됩니다.
      </p>
      <select value={reason} onChange={e => setReason(e.target.value)} className={inputStyle}>
        <option value="">탈퇴 사유를 선택해주세요</option>
        <option value="NO_USE">더 이상 사용하지 않음</option>
        <option value="CONTENT_LACK">콘텐츠 부족</option>
        <option value="SERVICE_ISSUE">서비스 불편/오류</option>
        <option value="OTHER">기타</option>
      </select>
    </>
  );

  const renderStep2 = () => (
    <>
      <p className="text-gray-600 mb-4">
        정말 탈퇴하시겠습니까? 모든 정보는 영구적으로 삭제되며 복구할 수 없습니다.
      </p>
      {isSocial ? (
        <div>
          <label className="text-sm font-medium">아래에 "{CONFIRM_STRING}"를 입력해주세요.</label>
          <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} className={`${inputStyle} mt-1`} />
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium">비밀번호를 입력하여 본인인증을 완료해주세요.</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`${inputStyle} mt-1`} />
        </div>
      )}
    </>
  );
  
  const renderStep3 = () => (
    <div className="text-center">
      <p className="text-lg font-semibold text-gray-800">회원 탈퇴가 완료되었습니다.</p>
      <p className="mt-2 text-gray-600">그동안 '먼저써봄'을 이용해주셔서 감사합니다.</p>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={resetState} title="회원 탈퇴">
      <div className="p-4 space-y-4 min-h-[150px]">
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        {step < 3 && <Button variant="unselected" onClick={resetState}>취소</Button>}
        {step === 1 && <Button onClick={handleNext} disabled={!reason}>다음</Button>}
        {step === 2 && <Button onClick={handleDelete} disabled={loading} className="!bg-red-600 hover:!bg-red-700">
          {loading ? '처리 중...' : '탈퇴하기'}
        </Button>}
        {step === 3 && <Button onClick={handleFinish}>메인으로</Button>}
      </div>
    </Modal>
  );
};

export default AccountDeletionModal;
