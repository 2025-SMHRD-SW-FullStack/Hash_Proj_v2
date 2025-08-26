// src/components/chatPage/ChatRoom.jsx

import React, { useEffect, useState, useRef } from 'react';
import deleteIcon from '../../assets/icons/ic_delete.svg';
import Icon from '../common/Icon';
import Button from '../common/Button';
import ChatYou from './ChatYou';
import ChatMe from './ChatMe';

const ChatRoom = ({ chatId, onClose }) => {
  // 1. 메시지 상태: 실제 앱에서는 API로 받아옵니다.
  const [messages, setMessages] = useState([
    { id: 1, text: '안녕하세요! 재고 있나요?', sender: 'you' },
    { id: 2, text: '네, 재고 있습니다. 어떤 상품 찾으시나요?', sender: 'me' },
    { id: 3, text: '혹시 A상품 재고 남아있을까요?', sender: 'you' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null); // 스크롤을 위한 ref

  // 2. 스크롤을 맨 아래로 이동시키는 함수
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 3. 메시지가 업데이트될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 4. chatId가 변경될 때마다 해당 채팅방의 메시지를 불러옵니다 (API 연동 필요)
  useEffect(() => {
    console.log(`${chatId}번 채팅방의 메시지를 불러옵니다.`);
    // 예: fetchMessages(chatId).then(setMessages);
  }, [chatId]);

  // 5. 메시지 전송 핸들러
  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;

    const messageToSend = {
      id: Date.now(),
      text: newMessage,
      sender: 'me',
    };

    setMessages([...messages, messageToSend]);
    setNewMessage('');
  };

  // 6. Enter 키 입력 핸들러
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    // flex와 h-full을 이용해 전체 레이아웃을 구성
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <header className="flex flex-shrink-0 items-center border-b p-4">
        {/* 모바일에서만 보이는 뒤로가기 버튼 */}
        <button onClick={onClose} className="mr-4 md:hidden">
          <Icon src={deleteIcon} alt="닫기" />
        </button>
        <h2 className="text-xl font-bold">{chatId}번 채팅방</h2>
      </header>

      {/* 메인: 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className='flex flex-col items-center'>
          {/* <img src="" alt="" /> */}
          <div className='w-32 h-32 bg-gray-200 rounded-lg mb-1'></div>
          <span>[브랜드명] 상품명</span>
          <span>15,000원</span>
          <hr className="w-full my-4 border-t border-gray-200" />
        </div>
        <div className="space-y-4">
          {messages.map((msg) =>
            msg.sender === 'me' ? (
              <ChatMe key={msg.id} message={msg.text} />
            ) : (
              <ChatYou key={msg.id} message={msg.text} />
            )
          )}
          {/* 스크롤의 기준점이 될 빈 div */}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 푸터: 입력창 */}
      <footer className="flex-shrink-0 border-t bg-white p-4">
        <div className="flex w-full space-x-2">
          <input
            type="text"
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-lg border p-2"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <Button onClick={handleSendMessage} className="w-20">
            전송
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default ChatRoom;