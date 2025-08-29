import React from 'react';

const ChatMe = ({ message }) => {
  // Check if the message is an object with text/images, or just a string
  const isObject = typeof message === 'object' && message !== null;
  const text = isObject ? message.text : message;
  const images = isObject ? message.images : null;

  return (
    <div className="flex flex-col items-end self-end ml-auto">
      <span className="text-sm font-semibold mb-1">나</span>
      {/* The design from your second example is applied here */}
      <div className="mt-1 rounded-lg bg-[#D9D9D9] px-4 py-2 text-black">
        {/* The functionality from your first example is applied here */}
        {text && <p className="m-0">{text}</p>}
        {images && images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((imgUrl, index) => (
              <img 
                key={index} 
                src={imgUrl} 
                alt={`uploaded content ${index}`} 
                className="max-w-[100px] max-h-[100px] rounded-lg object-cover" 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMe;