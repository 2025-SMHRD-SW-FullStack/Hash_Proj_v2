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
              if(mounted) setRooms(sortRooms(updatedRooms));
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
    if (now.isSame(messageTime, 'day')) {
      return messageTime.format('HH:mm');
    }
    if (now.subtract(1, 'day').isSame(messageTime, 'day')) {
      return '어제';
    }
    return messageTime.format('YYYY.MM.DD');
  };

  return (
    <div className="space-y-2">
      {rooms.map(r => {
        const isActive = selectedRoomId === r.roomId;
        return (
          <button
            key={r.roomId}
            type="button"
            onClick={() => open(r.roomId)}
            className={`w-full flex items-center p-3 rounded-xl transition-colors duration-200
              ${isActive ? 'bg-blue-100' : 'bg-white hover:bg-gray-50'}`
            }
          >
            <img
              src={r.product?.imageUrl || TestImg}
              alt={r.product?.name || '상품 이미지'}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
            <div className="ml-3 flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <div className="truncate text-sm">
                  <span className="font-semibold text-gray-800">{r.other?.nickname || '상대방'}</span>
                  <span className="text-gray-400 mx-1.5">·</span>
                  <span className="text-gray-600 truncate">{r.product?.name || '상품명 없음'}</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {r.lastMessageTime ? formatTimestamp(r.lastMessageTime) : ''}
                </span>
              </div>
              <div className="flex items-start justify-between mt-1">
                <p className="text-sm text-gray-500 truncate pr-2">{r.lastMessagePreview || '대화를 시작해보세요'}</p>
                {r.unreadCount > 0 && (
                  <span className="ml-2 text-xs bg-red-500 text-white font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {r.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  );
};

export default ChatList;