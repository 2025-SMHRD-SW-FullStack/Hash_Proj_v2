import React from 'react';

const TextField = ({
  label,
  type = 'text',
  id,
  value = '',
  onChange = () => {},
  ...rest
}) => {
  return (
    <div className="relative h-14 w-full">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        // placeholder를 공백으로 주어야 CSS의 :placeholder-shown 선택자가 동작합니다.
        placeholder=" "
        className="peer h-full w-full rounded-lg border border-gray-300 bg-transparent px-4 text-base text-gray-800 placeholder-transparent transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        {...rest}
      />
      <label
        htmlFor={id}
        className="
          absolute left-4 top-1/2 -translate-y-1/2 cursor-text 
          text-base text-gray-400 transition-all duration-200
          
          peer-placeholder-shown:text-base
          peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-primary
          
          peer-[:not(:placeholder-shown)]:-translate-y-6
          peer-[:not(:placeholder-shown)]:scale-75
        "
      >
        {label}
      </label>
    </div>
  );
};

export default TextField;