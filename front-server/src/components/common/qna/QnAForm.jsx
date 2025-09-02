// src/components/common/qna/QnAForm.jsx
import React, { useState } from 'react';
import Button from '../Button';

const QnAForm = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]); // 첨부 이미지 상태
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    // 실제 API 전송 시에는 FormData 사용
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    images.forEach((file, idx) => formData.append(`images[${idx}]`, file));

    console.log('제출 데이터:', { title, content, images });

    // 초기화
    setTitle('');
    setContent('');
    setImages([]);
    setError('');

    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-xl shadow-sm space-y-4 max-w-3xl mx-auto"
    >
      <h3 className="text-xl font-semibold mb-4">새 질문 등록</h3>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* 제목 */}
      <div className="flex flex-col">
        <label htmlFor="qna-title" className="text-sm font-medium mb-1">
          제목
        </label>
        <input
          id="qna-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="질문 제목을 입력해주세요."
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#35A6CF] transition-colors"
          maxLength={100}
        />
        <p className="text-xs text-gray-400 mt-1">최대 100자</p>
      </div>

      {/* 내용 */}
      <div className="flex flex-col">
        <label htmlFor="qna-content" className="text-sm font-medium mb-1">
          내용
        </label>
        <textarea
          id="qna-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="질문 내용을 자세히 입력해주세요."
          className="border border-gray-300 rounded-lg px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#35A6CF] transition-colors resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">상세 내용을 입력해주세요.</p>
      </div>

      {/* 사진 첨부 */}
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">사진 첨부</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="text-sm"
        />
        {images.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {images.map((file, idx) => (
              <img
                key={idx}
                src={URL.createObjectURL(file)}
                alt="첨부 미리보기"
                className="w-20 h-20 object-cover rounded-lg border"
              />
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">
          최대 5MB, 여러 장 첨부 가능
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 mt-4">
        <Button
          type="button"
          variant="blackWhite"
          onClick={onCancel}
          className="h-10 px-4 text-sm"
        >
          취소
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="h-10 px-6 text-sm"
        >
          등록
        </Button>
      </div>
    </form>
  );
};

export default QnAForm;
