import React, { useState } from 'react';

import Button from '../../../components/common/Button';
import QnaForm from '../../../components/common/qna/QnAForm';
import QnaList from '../../../components/common/qna/QnAList';

const QnAPage = () => {
  const [showForm, setShowForm] = useState(false); // 질문 등록 폼 표시 여부
  const [refreshList, setRefreshList] = useState(false); // 목록 새로고침 트리거

  const handleToggleForm = () => {
    setShowForm(prev => !prev);
  };

  const handleFormSubmit = () => {
    setShowForm(false); // 폼 제출 후 폼 닫기
    setRefreshList(prev => !prev); // 목록 새로고침 트리거
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Q&A (1:1 문의)</h2>
        <Button onClick={handleToggleForm}>
          {showForm ? '목록 보기' : '질문 등록하기'}
        </Button>
      </div>

      {showForm ? (
        <QnaForm onSubmit={handleFormSubmit} onCancel={handleToggleForm} />
      ) : (
        <QnaList refreshTrigger={refreshList} />
      )}
    </div>
  );
};

export default QnAPage;
