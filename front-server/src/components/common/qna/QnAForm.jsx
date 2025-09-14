// src/components/common/qna/QnAForm.jsx
import React, { useState } from 'react';
import Button from '../Button';
import { qnaService } from '../../../service/qnaService';

const QnAForm = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]); // 첨부 이미지 상태
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // 제출 중 상태

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    // 기존 이미지 배열(prevImages)에 새 파일(files)을 이어붙입니다.
    setImages(prevImages => [...prevImages, ...files]);
  };

  // 이미지 삭제 핸들러
  const handleRemoveImage = (indexToRemove) => {
    setImages(prevImages => prevImages.filter((_, index) => index !== indexToRemove));
  };

  const handleImageUpload = async (files) => {
    const urls = [];
    for (const file of files) {
      try {
        const imageUrl = await qnaService.uploadImage(file);
        urls.push(imageUrl);
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
        setError('이미지 업로드에 실패했습니다.');
        return null;
      }
    }
    return urls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 이미지 업로드
      let imagesJson = null;
      if (images.length > 0) {
        const imageUrls = await handleImageUpload(images);
        if (imageUrls) {
          imagesJson = JSON.stringify(imageUrls);
        } else {
          return; // 이미지 업로드 실패 시 중단
        }
      }

      // QnA 등록
      const qnaData = {
        title: title.trim(),
        content: content.trim(),
        imagesJson: imagesJson
      };

      const result = await qnaService.createQna(qnaData);

      // 성공 시 초기화
      setTitle('');
      setContent('');
      setImages([]);
      setError('');

      onSubmit();
    } catch (error) {
      console.error('QnA 등록 실패:', error);
      setError('QnA 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
  onSubmit={handleSubmit}
  className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm w-full max-w-3xl mx-auto flex flex-col gap-6"
>
  <h3 className="text-xl sm:text-2xl font-semibold mb-2">새 질문 등록</h3>

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
      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#35A6CF] transition-colors font-sans text-sm sm:text-base"
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
      className="border border-gray-300 rounded-lg px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#35A6CF] transition-colors resize-none font-sans text-sm sm:text-base"
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
      <div className="mt-3 flex flex-wrap gap-2">
        {images.map((file, idx) => (
          <div key={idx} className="relative">
            <img
              src={URL.createObjectURL(file)}
              alt="첨부 미리보기"
              className="w-20 h-20 object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(idx)}
              className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 border-[1px] bg-white text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              X
            </button>
          </div>
        ))}
      </div>
    )}
    <p className="text-xs text-gray-400 mt-1">
      최대 5MB, 여러 장 첨부 가능
    </p>
  </div>

  {/* 버튼 */}
  <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
    <Button
      type="button"
      variant="blackWhite"
      onClick={onCancel}
      className="h-10 px-4 sm:px-6 text-sm"
    >
      취소
    </Button>
    <Button
      type="submit"
      variant="primary"
      className="h-10 px-4 sm:px-6 text-sm"
    >
      등록
    </Button>
  </div>
</form>

  );
};

export default QnAForm;
