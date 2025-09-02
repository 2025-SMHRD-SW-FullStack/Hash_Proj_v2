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

  const handleToggleForm = () => {
    setShowForm(prev => !prev);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setRefreshList(prev => !prev);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md">
      {isLoggedIn && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Q&A (1:1 문의)</h2>
          <Button onClick={handleToggleForm}>
            {showForm ? '목록 보기' : '질문 등록'}
          </Button>
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
