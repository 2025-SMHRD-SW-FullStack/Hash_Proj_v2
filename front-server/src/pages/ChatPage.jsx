import React, { useState } from 'react';
import ChatList from '../components/chatPage/ChatList';
import ChatRoom from '../components/chatPage/ChatRoom';

const ChatPage = () => {
  const [selectedChatId, setSelectedChatId] = useState(null);

  // 채팅방 선택 시 ID를 상태에 저장하여 패널을 엽니다.
  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
  };

  // 패널을 닫을 때 ID를 null로 설정합니다.
  const handleCloseChat = () => {
    setSelectedChatId(null);
  };

  return (
    // 1. 전체 컨테이너: 채팅 목록을 중앙 정렬합니다.
    <div className="relative flex h-full w-full justify-center overflow-hidden pt-8">
      
      {/* 어두운 배경 오버레이 */}
      {/* selectedChatId가 있을 때만 나타나며, 클릭 시 패널이 닫힙니다. */}
      {selectedChatId && (
        <div
          className="fixed inset-0 z-10 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={handleCloseChat}
        />
      )}

      {/* 2. 채팅 목록 */}
      <div className="w-full max-w-xl px-4">
        <strong className="mb-4 block text-2xl font-bold">채팅 목록</strong>
        <div className="space-y-2 rounded-lg border p-4 shadow-sm">
          <ChatList onChatSelect={handleChatSelect} />
        </div>
      </div>

      {/* 3. 슬라이딩 패널 (채팅방) */}
      <div
        className={`fixed top-0 right-0 z-40 h-full w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          selectedChatId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* selectedChatId가 있을 때만 ChatRoom을 렌더링하여 성능을 최적화합니다. */}
        {selectedChatId && (
          <ChatRoom chatId={selectedChatId} onClose={handleCloseChat} />
        )}
      </div>
    </div>
  );
};

export default ChatPage;