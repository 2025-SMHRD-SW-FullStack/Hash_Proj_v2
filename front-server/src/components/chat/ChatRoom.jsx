// front-server/src/components/chat/ChatRoom.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { listMessages, markRead, listRooms } from '../../service/chatService';
import chatSocket from '../../service/chatSocket';
import { uploadImages } from '../../service/uploadService';
import useAuthStore from '../../stores/authStore';
import TestImg from '../../assets/images/ReSsol_TestImg.png';
import ClipIcon from '../../assets/icons/ic_clip.svg';
import ArrowLeftIcon from '../../assets/icons/ic_arrow_left.svg';
import Button from '../common/Button';

/** 채팅방 헤더 */
const PanelHeader = ({ roomInfo, onClose }) => (
  <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-3 shrink-0">
    <div className="flex items-center gap-3 min-w-0">
      {onClose && (
        <button className="bg-transparent border-none p-2 hover:bg-gray-100 rounded-full" onClick={onClose}>
          <img src={ArrowLeftIcon} alt="뒤로가기" className="w-6 h-6" />
        </button>
      )}
      <img src={roomInfo?.product?.imageUrl || TestImg} alt="상품" className="w-10 h-10 rounded-md object-cover"/>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate text-gray-800">
          {roomInfo?.product?.name || ''}
        </div>
        <div className="text-xs text-gray-500">
          To. {roomInfo?.other?.nickname || '상대방'}
        </div>
      </div>
    </div>
  </div>
);

/** 메시지 버블 */
const MessageBubble = ({ msg, isGroupStart, otherLastReadId }) => {
  const bubbleBase = 'max-w-[70%] rounded-2xl';
  // 이미지면 말풍선 틴트/패딩 제거 (투명)
  const bubblePadding = msg.type === 'IMAGE' ? '' : 'px-3 py-2';
  const bubbleTint =
    msg.type === 'IMAGE'
      ? ''
      : (msg.isMine ? 'bg-primary text-white' : 'bg-white border');

  return (
    <div className={`flex items-end gap-2 ${msg.isMine ? 'flex-row-reverse' : 'justify-start'}`}>
      {!msg.isMine && (
        <div className="w-8 h-8 rounded-full overflow-hidden self-start flex-shrink-0">
          {isGroupStart && <img src={msg.senderProfileUrl || TestImg} alt="상대 프로필" className="w-full h-full object-cover"/>}
        </div>
      )}
      <div className={`flex items-end gap-2 ${msg.isMine ? 'flex-row-reverse' : 'justify-start'}`}>
        <div className="text-[10px] text-gray-400 pb-1 flex-shrink-0">
          {(otherLastReadId !== undefined) &&
            msg.isMine &&
            msg.id &&
            (otherLastReadId === null || msg.id > otherLastReadId) && (
              <div className="text-right text-yellow-400 mb-0.5">1</div>
            )
          }
          <span>{dayjs(msg.createdAt).format('HH:mm')}</span>
        </div>

        <div className={`${bubbleBase} ${bubblePadding} ${bubbleTint}`}>
          {msg.type === 'IMAGE' ? (
            <img
              src={msg.content}
              alt="첨부 이미지"
              className="w-full h-auto rounded-lg my-1"
            />
          ) : (
            msg.content && <div className="whitespace-pre-wrap break-words text-sm">{msg.content}</div>
          )}
        </div>
      </div>
    </div>
  );
};

/** 입력창 */
const ChatInput = ({ onSendMessage, className }) => {
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
        <div className="mb-2 flex gap-2 rounded-lg border p-2">
          {previews.map((src, i) => (
            <div key={i} className="relative h-16 w-16">
              <img src={src} alt="미리보기" className="h-full w-full rounded object-cover"/>
              <button onClick={() => removeImage(i)} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs text-white">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="bg-transparent border-[#CCC] border-[1px] rounded-full p-2 hover:bg-gray-100">
          <img src={ClipIcon} alt="첨부" className="h-6 w-6 text-gray-500"/>
        </button>
        <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileChange} className="hidden"/>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
          placeholder="메시지를 입력하세요"
          rows="1"
          className="flex-1 resize-none rounded-lg border bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          className="h-10 rounded-lg px-4 text-sm font-semibold text-white hover:bg-primary disabled:bg-gray-300"
          onClick={handleSend}
          disabled={!input.trim() && imageFiles.length === 0}
        >
          전송
        </Button>
      </div>
    </div>
  );
};

/** 메인 채팅방 */
export default function ChatRoom({ roomId, onClose, role }) {
  const { roomId: roomIdFromParams } = useParams();
  const location = useLocation();
  const me = useAuthStore(s => s.user);
  const asRole = role ?? (me?.isSeller ? 'seller' : 'user');

  const [roomInfo, setRoomInfo] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otherLastReadId, setOtherLastReadId] = useState(undefined);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  const pendingReadIdRef = useRef(null);
  const readTimerRef = useRef(null);

  const rid = Number(roomId ?? roomIdFromParams);
  const validRoom = Number.isFinite(rid) && rid > 0;

  const atBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 8;
  };

  const commitRead = (lastId) => {
    if (!validRoom || !lastId) return;
    if (!atBottom()) return;

    pendingReadIdRef.current = Math.max(pendingReadIdRef.current || 0, lastId);
    if (readTimerRef.current) clearTimeout(readTimerRef.current);
    readTimerRef.current = setTimeout(() => {
      const toSend = pendingReadIdRef.current;
      pendingReadIdRef.current = null;
      try { chatSocket.sendRead(rid, toSend) } catch {}
      markRead(rid, toSend).catch(() => {});
    }, 200);
  };

  useEffect(() => {
    if (!validRoom) { setLoading(false); return; }
    let unsub = () => {};

    const setupRoom = async () => {
      try {
        setLoading(true);
        const roomsData = await listRooms(asRole);
        const currentRoom = Array.isArray(roomsData) && roomsData.find(r => r.roomId === rid);

        const overrideProduct = location.state?.product;
        const merged = overrideProduct ? { ...currentRoom, product: overrideProduct } : currentRoom;

        setRoomInfo(merged);
        const hasField = merged && Object.prototype.hasOwnProperty.call(merged, 'otherLastReadMessageId');
        setOtherLastReadId(hasField ? (merged.otherLastReadMessageId ?? null) : undefined);

        const data = await listMessages(rid, null, 50);
        const decorated = (data || []).map(m => ({ ...m, isMine: me?.id && m.senderId === me.id }));
        setMsgs(decorated);

        const lastId = decorated?.[decorated.length - 1]?.id;
        setTimeout(() => {
          bottomRef.current?.scrollIntoView();
          commitRead(lastId);
        }, 0);
      } catch (e) {
        console.error('채팅방 초기화 실패:', e);
      } finally {
        setLoading(false);
      }
    };

    chatSocket.connect(() => {
      setupRoom();
      unsub = chatSocket.subscribeRoom(rid, async (evt) => {
        if (evt?.type === 'READ') {
          if (evt.userId !== me?.id) {
            setOtherLastReadId(prev =>
              prev == null ? evt.lastReadMessageId : Math.max(prev, evt.lastReadMessageId)
            );
          }
          return;
        }

        const isMine = me?.id && evt.senderId === me.id;
        setMsgs(prev => {
          const next = [...prev, { ...evt, isMine }];
          setTimeout(() => {
            const last = next[next.length - 1]?.id;
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            if (!isMine) commitRead(last);
          }, 50);
          return next;
        });
      });
    });

    return () => { unsub(); if (readTimerRef.current) clearTimeout(readTimerRef.current); };
  }, [rid, me?.id, validRoom, location.state, asRole]);

  useEffect(() => {
    const onWake = () => {
      const lastId = msgs[msgs.length - 1]?.id;
      commitRead(lastId);
    };
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [msgs]);

  const groupedMessages = useMemo(() => {
    return msgs.reduce((acc, msg, i) => {
      const prevMsg = i > 0 ? msgs[i - 1] : null;
      const isGroupStart = !prevMsg || prevMsg.senderId !== msg.senderId;
      acc.push({ ...msg, isGroupStart });
      return acc;
    }, []);
  }, [msgs]);

  if (loading) return <div className="flex h-full items-center justify-center text-gray-500">채팅방을 불러오는 중...</div>;
  if (!validRoom) return <div className="p-4 text-red-500">유효하지 않은 채팅방입니다.</div>;

  return (
    <div className="flex flex-col h-screen bg-white" onClick={e => e.stopPropagation()}>
      <PanelHeader roomInfo={roomInfo} onClose={onClose} />
      
      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 h-[400px] overflow-y-auto px-4 py-3 space-y-2 bg-blue-50/20"
        style={{ scrollBehavior: 'smooth' }}
      >

        {groupedMessages.map(m => (
          <MessageBubble
            key={m.id || m.clientMsgId}
            msg={m}
            isGroupStart={m.isGroupStart}
            otherLastReadId={otherLastReadId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 고정 */}
      <ChatInput
        shrink-0
        onSendMessage={async (text, files) => {
          let imageUrls = [];
          if (files.length > 0) {
            try {
              const results = await uploadImages('CHAT', files);
              imageUrls = results.map(res => res.url);
            } catch {
              alert('이미지 업로드에 실패했습니다.');
              return;
            }
          }

          if (text) {
            const clientMsgId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString();
            chatSocket.sendMessage(rid, { type: 'TEXT', content: text, clientMsgId });
          }

          for (const url of imageUrls) {
            const clientMsgId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString();
            chatSocket.sendMessage(rid, { type: 'IMAGE', content: url, clientMsgId });
          }
        }}
      />
    </div>

  );
}
