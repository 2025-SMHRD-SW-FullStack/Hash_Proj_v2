// src/components/chat/ChatRoom.jsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { listMessages, markRead, listRooms } from '../../service/chatService';
import chatSocket from '../../service/chatSocket';
import { uploadImages } from '../../service/uploadService';
import useAuthStore from '../../stores/authStore';
import TestImg from '../../assets/images/ReSsol_TestImg.png';
import ClipIcon from '../../assets/icons/ic_clip.svg';
import ArrowLeftIcon from '../../assets/icons/ic_arrow_left.svg';

/**
 * 채팅방 헤더 컴포넌트
 */
const PanelHeader = ({ roomInfo, onClose }) => (
  <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-3 shrink-0">
    <div className="flex items-center gap-3 min-w-0">
      {onClose && (
        <button className="p-2 hover:bg-gray-100 rounded-full" onClick={onClose}>
          <img src={ArrowLeftIcon} alt="뒤로가기" className="w-6 h-6" />
        </button>
      )}
      <img src={roomInfo?.product?.imageUrl || TestImg} alt="상품" className="w-10 h-10 rounded-md object-cover"/>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate text-gray-800">{roomInfo?.product?.name || '상품 정보 없음'}</div>
        <div className="text-xs text-gray-500">To. {roomInfo?.other?.nickname || '상대방'}</div>
      </div>
    </div>
  </div>
);

/**
 * 메시지 버블 컴포넌트
 */
const MessageBubble = ({ msg, isGroupStart, otherLastReadId }) => (
    <div className={`flex items-end gap-2 ${msg.isMine ? 'flex-row-reverse' : 'justify-start'}`}>
        {!msg.isMine && (
            <div className="w-8 h-8 rounded-full overflow-hidden self-start flex-shrink-0">
                {isGroupStart && <img src={msg.senderProfileUrl || TestImg} alt="상대 프로필" className="w-full h-full object-cover"/>}
            </div>
        )}
        <div className={`flex items-end gap-2 ${msg.isMine ? 'flex-row-reverse' : 'justify-start'}`}>
            <div className="text-[10px] text-gray-400 pb-1 flex-shrink-0">
                {msg.isMine && msg.id && (otherLastReadId === null || msg.id > otherLastReadId) && <div className="text-right text-yellow-400 mb-0.5">1</div>}
                <span>{dayjs(msg.createdAt).format('HH:mm')}</span>
            </div>
            <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${msg.isMine ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                {msg.images?.map((url, i) => (
                    <img key={i} src={url} alt="첨부 이미지" className="max-w-xs h-auto rounded-lg my-1" />
                ))}
                {msg.content && <div className="whitespace-pre-wrap break-words text-sm">{msg.content}</div>}
            </div>
        </div>
    </div>
);


/**
 * 메시지 입력창 컴포넌트
 */
const ChatInput = ({ onSendMessage }) => {
  const [input, setInput] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - imageFiles.length);
    setImageFiles(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!input.trim() && imageFiles.length === 0) return;
    onSendMessage(input.trim(), imageFiles);
    setInput('');
    setImageFiles([]);
    previews.forEach(URL.revokeObjectURL);
    setPreviews([]);
  };

  return (
    <div className="border-t bg-white p-3 shrink-0">
      {previews.length > 0 && (
        <div className="flex gap-2 mb-2 p-2 border rounded-lg">
          {previews.map((src, i) => (
            <div key={i} className="relative w-16 h-16">
              <img src={src} alt="미리보기" className="w-full h-full object-cover rounded"/>
              <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 rounded-full">
          <img src={ClipIcon} alt="첨부" className="w-6 h-6 text-gray-500"/>
        </button>
        <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileChange} className="hidden"/>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
          placeholder="메시지를 입력하세요"
          rows="1"
          className="flex-1 rounded-lg border bg-gray-50 px-3 py-2.5 text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <button className="h-10 rounded-lg bg-blue-500 px-4 text-white font-semibold text-sm hover:bg-blue-600 disabled:bg-gray-300" onClick={handleSend} disabled={!input.trim() && imageFiles.length === 0}>
          전송
        </button>
      </div>
    </div>
  );
};

/**
 * 메인 채팅방 컴포넌트
 */
export default function ChatRoom({ roomId, onClose }) {
  const me = useAuthStore(s => s.user);
  const [roomInfo, setRoomInfo] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [oldestId, setOldestId] = useState(null);
  const [otherLastReadId, setOtherLastReadId] = useState(null);
  const bottomRef = useRef(null);

  const rid = Number(roomId);
  const validRoom = Number.isFinite(rid) && rid > 0;

  useEffect(() => {
    if (!validRoom) { setLoading(false); return; }

    let unsub = () => {};
    
    const setupRoom = async () => {
      try {
        setLoading(true);
        const roomsData = await listRooms(me?.isSeller ? 'seller' : 'user');
        const currentRoom = Array.isArray(roomsData) && roomsData.find(r => r.roomId === rid);
        setRoomInfo(currentRoom);

        const data = await listMessages(rid, null, 50);
        const decorated = (data || []).map(m => ({ ...m, isMine: me?.id && m.senderId === me.id, unreadCount: m.unreadCount ?? 1 }));
        setMsgs(decorated);
        setOldestId(decorated?.[0]?.id || null);
        
        const lastId = decorated?.[decorated.length - 1]?.id;
        if (lastId) await markRead(rid, lastId);
        
      } catch (e) {
        console.error("채팅방 초기화 실패:", e);
      } finally {
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 0);
      }
    };

    chatSocket.connect(() => {
      setupRoom();
      unsub = chatSocket.subscribeRoom(rid, async (evt) => {
        if (evt?.type === 'READ') {
          if (evt.userId !== me?.id) {
            setOtherLastReadId(prev => (prev == null ? evt.lastReadMessageId : Math.max(prev, evt.lastReadMessageId)));
            setMsgs(prev => prev.map(m => ({...m, unreadCount: 0})));
          }
          return;
        }

        const isMine = me?.id && evt.senderId === me.id;
        setMsgs(prev => [...prev, { ...evt, isMine, unreadCount: 1 }]);
        
        if (!isMine) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          if (evt?.id) await markRead(rid, evt.id);
        } else {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      });
    });

    return () => unsub();
  }, [rid, me?.id]);
  
  const handleSendMessage = async (text, files) => {
    let imageUrls = [];
    if (files.length > 0) {
      try {
        const results = await uploadImages('CHAT', files);
        imageUrls = results.map(res => res.url);
      } catch (error) {
        alert("이미지 업로드에 실패했습니다.");
        return;
      }
    }
    const clientMsgId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString();
    chatSocket.sendMessage(rid, { type: 'TEXT', content: text, images: imageUrls, clientMsgId });
  };

  const groupedMessages = useMemo(() => {
    return msgs.reduce((acc, msg, i) => {
      const prevMsg = i > 0 ? msgs[i-1] : null;
      const isGroupStart = !prevMsg || prevMsg.senderId !== msg.senderId;
      acc.push({ ...msg, isGroupStart });
      return acc;
    }, []);
  }, [msgs]);

  if (loading) return <div className="flex h-full items-center justify-center text-gray-500">채팅방을 불러오는 중...</div>;
  if (!validRoom) return <div className="p-4 text-red-500">유효하지 않은 채팅방입니다.</div>;
  
  return (
    <div className="flex h-full flex-col bg-white" onClick={e => e.stopPropagation()}>
      <PanelHeader roomInfo={roomInfo} onClose={onClose} />
      {/* ✅ [수정] 아래 div에 'min-h-0' 클래스를 추가하여 flex item의 크기 문제를 해결합니다. */}
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto bg-blue-50/20 p-4">
        {groupedMessages.map(m => (
          <MessageBubble key={m.id || m.clientMsgId} msg={m} isGroupStart={m.isGroupStart} otherLastReadId={otherLastReadId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  )
}