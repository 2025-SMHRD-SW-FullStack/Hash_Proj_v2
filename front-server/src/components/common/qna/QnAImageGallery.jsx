// src/components/common/qna/QnAImageGallery.jsx
import React, { useState } from 'react';

const QnAImageGallery = ({ imagesJson, title = "첨부된 이미지" }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!imagesJson) {
    return null;
  }

  let images = [];
  try {
    images = JSON.parse(imagesJson);
  } catch (error) {
    console.error('이미지 JSON 파싱 실패:', error);
    return null;
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium mb-2 text-gray-700">{title}</h4>
      <div className="flex gap-2 flex-wrap">
        {images.map((imageUrl, idx) => (
          <div key={idx} className="relative group">
            <img
              src={imageUrl}
              alt={`첨부 이미지 ${idx + 1}`}
              className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedImage(imageUrl)}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
              <span className="text-white text-xs opacity-0 group-hover:opacity-100">클릭하여 확대</span>
            </div>
          </div>
        ))}
      </div>

      {/* 이미지 확대 모달 */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-full p-4">
            <img
              src={selectedImage}
              alt="확대된 이미지"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QnAImageGallery;
