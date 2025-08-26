import React from 'react';
import TestImg from '../../assets/images/ReSsol_TestImg.png';

// ✅ props로 onChatSelect 함수를 받음
const ChatList = ({ onChatSelect }) => {
  // 임시 데이터 (나중에 API로 받아올 데이터)
  const chatListData = [
    { id: 1, userName: '김리쏠', lastMessage: '안녕하세요, 상품 문의드립니다.' },
    { id: 2, userName: '박사장', lastMessage: '네, 재고 있습니다.' },
    { id: 3, userName: '최고객', lastMessage: '배송은 언제쯤 될까요?' },
  ];

  return (
    <>
      {chatListData.map((chat) => (
        // ✅ 클릭 시 onChatSelect 함수에 채팅 ID를 넘겨줌
        <div
          key={chat.id}
          className="flex cursor-pointer rounded-lg p-2 hover:bg-gray-100"
          onClick={() => onChatSelect(chat.id)}
        >
          <img
            src={TestImg}
            alt="상품 이미지"
            className="h-16 w-16 rounded-full bg-gray-200"
          />
          <div className="ml-4 flex flex-col justify-center">
            <p className="mb-1 font-bold">{chat.userName}</p>
            <p className="text-sm text-gray-600">{chat.lastMessage}</p>
          </div>
        </div>
      ))}
    </>
  );
};

export default ChatList;