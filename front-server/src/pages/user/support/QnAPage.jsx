// src/pages/user/support/QnAPage.jsx
import React, { useState } from 'react';
import useAuthStore from '../../../stores/authStore';
import Button from '../../../components/common/Button';
import QnaForm from '../../../components/common/qna/QnAForm';
import QnaList from '../../../components/common/qna/QnAList';

const QnAPage = () => {
  const { isLoggedIn } = useAuthStore();
  const [showForm, setShowForm] = useState(!isLoggedIn); // 비회원이면 바로 폼 표시
  const [refreshList, setRefreshList] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleToggleForm = () => {
    setShowForm(prev => !prev);
    setSuccessMessage(''); // 폼 토글 시 성공 메시지 초기화
  };

  const handleFormSubmit = () => {
    setSuccessMessage('QnA가 성공적으로 등록되었습니다!');
    setShowForm(false);
    setRefreshList(prev => !prev);
    
    // 3초 후 성공 메시지 제거
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  return (
    <div className="h-full max-w-5xl mx-auto ">
      {isLoggedIn && (
        <div className="flex justify-end sm:justify-between items-center mb-4">
          <h1 className="hidden md:block text-lg md:text-xl font-bold  text-gray-800">내 문의 목록</h1>
          <Button onClick={handleToggleForm}>
            {showForm ? '목록 보기' : '질문 등록'}
          </Button>
        </div>
      )}

      {/* 성공 메시지 */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {showForm ? (
        <QnaForm onSubmit={handleFormSubmit} onCancel={isLoggedIn ? handleToggleForm : null} />
      ) : (
        <QnaList refreshTrigger={refreshList} />
      )}
    </div>
  );
};

export default QnAPage;
