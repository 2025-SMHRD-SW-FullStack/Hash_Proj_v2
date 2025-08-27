import React from 'react';

const ChatYou = ({ message }) => { // props로 message를 받음
  return (
    <div className="flex flex-col items-start">
      <span className="text-sm font-semibold">상대방</span>
      <div className="mt-1 rounded-lg bg-[#9DD5E9] px-4 py-2 text-gray-800">
        {message} {/* props로 받은 message를 출력 */}
      </div>
    </div>
  );
};

export default ChatYou;