import React from 'react';

const ChatMe = ({ message }) => { // props로 message를 받음
  return (
    <div className="flex flex-col items-end">
      <span className="text-sm font-semibold">나</span>
      <div className="mt-1 rounded-lg bg-[#D9D9D9] px-4 py-2 text-black">
        {message} {/* props로 받은 message를 출력 */}
      </div>
    </div>
  );
};

export default ChatMe;