import React from 'react';

const ChatYou = ({ message }) => {
  // message가 문자열일 경우를 대비해 객체로 만듭니다 (하위 호환성).
  const msg = typeof message === 'string' ? { text: message } : message;
  const { text, images } = msg;

  return (
    <div className="flex flex-col items-start self-start">
      <span className="text-sm font-semibold mb-1">상대방</span>
      <div className="mt-1 rounded-lg bg-[#9DD5E9] px-4 py-2 text-gray-800">
        {/* 텍스트가 있으면 표시 */}
        {text && <p className="m-0">{text}</p>}
        {/* 이미지가 있으면 표시 */}
        {images && images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((imgUrl, index) => (
              <img 
                key={index} 
                src={imgUrl} 
                alt={`uploaded content ${index}`} 
                className="max-w-[100px] max-h-[100px] rounded-lg object-cover" 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatYou;