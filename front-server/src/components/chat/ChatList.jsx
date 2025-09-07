import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';

import { listRooms } from '../../service/chatService';
import chatSocket from '../../service/chatSocket';
import useAuthStore from '../../stores/authStore';
import useAppModeStore from '../../stores/appModeStore';
import TestImg from '../../assets/images/ReSsol_TestImg.png';

dayjs.extend(relativeTime);
dayjs.locale('ko');

const ChatList = ({ onOpenRoom, selectedRoomId }) => {
  const me = useAuthStore(s => s.user);
  const { mode } = useAppModeStore();
  const [rooms, setRooms] = useState([]);
  const unsubEventRef = useRef(null);
  const navigate = useNavigate();

  const asParam = mode === 'seller' ? 'seller' : 'user';

  const sortRooms = (arr) =>
    [...(Array.isArray(arr) ? arr : [])].sort((a, b) => {
      const at = a?.lastMessageTime ? dayjs(a.lastMessageTime).valueOf() : 0;
      const bt = b?.lastMessageTime ? dayjs(b.lastMessageTime).valueOf() : 0;
      return bt - at;
    });

  useEffect(() => {
    let mounted = true;

    const fetchAndSubscribe = async () => {
      if (!me?.id) return;
      try {
        const initialRooms = await listRooms(asParam);
        if (mounted) setRooms(sortRooms(initialRooms));

        unsubEventRef.current?.();
        unsubEventRef.current = chatSocket.subscribeUserRoomEvents(me.id, (evt) => {
          if (evt?.type === 'ROOM_UPDATED') {
            listRooms(asParam).then(updatedRooms => {
              if (mounted) setRooms(sortRooms(updatedRooms));
            });
          }
        });
      } catch (error) {
        console.error("Failed to fetch chat rooms:", error);
      }
    };

    chatSocket.connect(fetchAndSubscribe);

    return () => {
      mounted = false;
      unsubEventRef.current?.();
    };
  }, [me?.id, asParam]);

  const open = (rid) => {
    onOpenRoom?.(rid);
  };

  const formatTimestamp = (date) => {
    const now = dayjs();
    const messageTime = dayjs(date);
    if (now.isSame(messageTime, 'day')) return messageTime.format('HH:mm');
    if (now.subtract(1, 'day').isSame(messageTime, 'day')) return '어제';
    return messageTime.format('YYYY.MM.DD');
  };

  return (
    <div className="space-y-2">
      {rooms.map(r => {
        const isActive = selectedRoomId === r.roomId;
        const productName = r?.product?.name?.trim() || '';
        const thumb =
          r?.product?.imageUrl ||
          r?.other?.profileImageUrl ||
          TestImg;

        return (
          <button
            key={r.roomId}
            type="button"
            onClick={() => open(r.roomId)}
            className={`w-full flex items-center p-3 rounded-2xl border border-gray-200 transition-all duration-200
              ${isActive ? 'bg-blue-50 shadow-md' : 'bg-white hover:shadow-md hover:border-gray-300'}
            `}
          >
            <img
              src={thumb}
              alt={productName || r?.other?.nickname || '이미지'}
              className="w-14 h-14 rounded-full object-cover flex-shrink-0 shadow-sm"
            />
            <div className="ml-3 flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <div className="truncate text-sm">
                  <span className="font-semibold text-gray-800">{r.other?.nickname || '상대방'}</span>
                  {productName && <span className="text-gray-400 mx-1.5">·</span>}
                  {productName && <span className="text-gray-600 truncate">{productName}</span>}
                </div>
                <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                  {r.lastMessageTime ? formatTimestamp(r.lastMessageTime) : ''}
                </span>
              </div>
              <div className="mt-1 flex items-start justify-between">
                <p className="pr-2 text-sm text-gray-500 truncate">
                  {r.lastMessagePreview || '대화를 시작해보세요'}
                </p>
                {r.unreadCount > 0 && (
                  <span className="ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {r.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>

        );
      })}
    </div>
  );
};

export default ChatList;
