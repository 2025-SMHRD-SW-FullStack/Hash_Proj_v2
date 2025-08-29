import React, { useEffect, useState, useRef } from 'react';
import deleteIcon from '../../assets/icons/ic_delete.svg';
import Icon from '../common/Icon';
import Button from '../common/Button';
import ChatYou from './ChatYou';
import ChatMe from './ChatMe';

const ChatRoom = ({
  chatId,
  onClose,
  // --- 제어 Props ---
  isControlled = false,
  messages: externalMessages,
  input: externalInput,
  onInputChange,
  onSendMessage,
  onAttachClick, // ✅ 파일 첨부 클릭 핸들러 추가
  isCompleted = false,
  // --- UI 커스텀 Props ---
  uiConfig = {},
  mainChildren = null,
  footerChildren = null,
}) => {
  const [internalMessages, setInternalMessages] = useState([
    { id: 1, text: '안녕하세요! 재고 있나요?', sender: 'you' },
    { id: 2, text: '네, 재고 있습니다.', sender: 'me' },
  ]);
  const [internalInput, setInternalInput] = useState('');
  const messagesEndRef = useRef(null);

  const messages = isControlled ? externalMessages : internalMessages;
  const input = isControlled ? externalInput : internalInput;
  const setInput = isControlled ? onInputChange : setInternalInput;
  const setMessages = isControlled ? () => {} : setInternalMessages;

  const {
    headerTitle = `${chatId}번 채팅방`,
    showProductInfo = true,
    inputPlaceholder = "메시지를 입력하세요...",
    buttonText = "전송"
  } = uiConfig;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault(); // form submit 기본 동작 방지
    if (isControlled) {
      onSendMessage();
    } else {
      if (input.trim() === '') return;
      const messageToSend = { id: Date.now(), text: input, sender: 'me' };
      setMessages(prev => [...prev, messageToSend]);
      setInput('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-shrink-0 items-center justify-between border-b p-4">
        <h2 className="text-xl font-bold">{headerTitle}</h2>
        <button onClick={onClose} className="md:hidden"><Icon src={deleteIcon} alt="닫기" /></button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {showProductInfo && (
          <div className='flex flex-col items-center'>
            <div className='w-32 h-32 bg-gray-200 rounded-lg mb-1'></div>
            <span>[브랜드명] 상품명</span>
            <span>15,000원</span>
            <hr className="w-full my-4" />
          </div>
        )}
        {messages.map((msg) =>
          msg.sender === 'me' ? (
            <ChatMe key={msg.id || msg.text} message={msg} />
          ) : (
            <ChatYou key={msg.id || msg.text} message={msg} />
          )
        )}
        <div ref={messagesEndRef} />
        {mainChildren}
      </main>

      {!isCompleted && (
        <footer className="flex-shrink-0 border-t bg-white p-4">
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            {/* ✅ 파일 첨부 버튼 추가 */}
            {onAttachClick && (
              <button type="button" onClick={onAttachClick} className="p-2 rounded-full hover:bg-gray-100 text-2xl text-gray-600">
                📎
              </button>
            )}
            <input
              type="text"
              placeholder={inputPlaceholder}
              className="flex-1 rounded-full border border-gray-300 p-2 px-4"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <Button type="submit" className="w-24 rounded-full">
              {buttonText}
            </Button>
            {footerChildren}
          </form>
        </footer>
      )}
    </div>
  );
};

export default ChatRoom;