// src/components/product/Feedltem.jsx

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import FeedbackSuccessModal from '../feedback/FeedbackSuccessModal';
import FeedbackEditModal from '../feedback/FeedbackEditModal';
import Button from '../common/Button';
import { deleteFeedbackByAdmin } from '../../service/feedbackService';

// [추가] 날짜 포맷팅을 위한 유틸리티 함수
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // '2023. 9. 5.' 형식으로 변환
  return date.toLocaleDateString('ko-KR');
};

// imagesJson 안전 파싱
const safeParseImages = (json) => {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const FeedbackItem = ({ feedback, onFeedbackDeleted }) => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const myPoint = user?.point ?? user?.pointBalance ?? 0;
  const myId = user?.id ?? user?.userId;
  const isAuthor = feedback?.mine === true;

  const [self, setSelf] = useState(feedback);
  const images = useMemo(() => safeParseImages(self?.imagesJson), [self?.imagesJson]);

  const optionsText = self?.optionName;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      if (!isAdmin) {
        alert('관리자만 삭제할 수 있습니다.');
        return;
      }
      const id = self?.id ?? feedback?.id;
      if (!id) return;
      const ok = window.confirm('정말 삭제할까요? 삭제 후에는 복구할 수 없습니다.');
      if (!ok) return;
      setDeleting(true);
      await deleteFeedbackByAdmin(id);
      onFeedbackDeleted?.(id); // 부모 목록에서 제거
    } catch (e) {
      console.error(e);
      alert(e?.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  // ====== 수정 모달/완료 모달 상태 ======
  const [openEdit, setOpenEdit] = useState(false);
  const [openDone, setOpenDone] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0); // 보통 0P

  const handleUpdated = (updated) => {
    // 서버가 돌려준 필드로 병합
    setSelf(prev => ({ ...prev, ...updated }));
    setEarnedPoints(Number(updated?.awardedPoint ?? 0));
    setOpenDone(true);
  };

  return (
    <div className="border-t border-gray-200 py-6">
      <div className="flex items-start space-x-4">
        {/* 작성자 프로필 이미지 */}
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          <img
            src={feedback.authorProfileImageUrl || `https://ui-avatars.com/api/?name=${feedback.authorNickname}&background=random`}
            alt={feedback.authorNickname}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{feedback.authorNickname}</p>
              <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                {optionsText && (
                  <>
                    <span className="whitespace-pre-wrap">{optionsText}</span>
                    <span>·</span>
                  </>
                )}
                <span>{formatDate(feedback.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAuthor && (
                <Button
                  onClick={() => setOpenEdit(true)}
                  className="text-xs text-gray-600 hover:text-gray-900"
                  variant="singUp"
                >
                  수정
                </Button>
              )}
              {isAdmin && (
                <Button
                  onClick={handleDelete}
                  className="text-xs text-gray-400 hover:text-red-500"
                  disabled={deleting}
                  variant="singUp"
                >
                  {deleting ? '삭제 중…' : '삭제'}
                </Button>
              )}
            </div>
          </div>

          {/* 피드백 내용 */}
          <p className="mt-3 text-gray-700 whitespace-pre-wrap">{feedback.content}</p>

          {/* 피드백 이미지 (있을 경우) */}
          {feedback.imagesJson && JSON.parse(feedback.imagesJson).length > 0 && (
            <div className="mt-3 flex space-x-2">
              {JSON.parse(feedback.imagesJson).map((imgUrl, index) => (
                <div key={index} className="w-24 h-24 rounded-md overflow-hidden">
                  <img src={imgUrl} alt={`feedback image ${index + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ✏️ 수정 모달 */}
      <FeedbackEditModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        feedback={self}
        onUpdated={handleUpdated}
      />

      {/* ✅ 수정 완료 모달 */}
      <FeedbackSuccessModal
        isOpen={openDone}
        onClose={() => setOpenDone(false)}
        earnedPoints={earnedPoints}                // 보통 0P
        totalPoints={myPoint}
        onGoToProduct={() => navigate(`/products/${self?.productId}`)}
        onGoToMyPage={() => navigate('/mypage/feedbacks')}
      />

    </div>
  );
};

export default FeedbackItem;