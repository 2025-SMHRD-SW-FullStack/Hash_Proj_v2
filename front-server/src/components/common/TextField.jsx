import React from 'react';

const TextField = ({
  label,
  type = 'text',
  id,
  value = '',
  onChange = () => {},
  required,
  isRequiredMark = false,
  inputRef,
  icon,
  children,
  options,
  placeholderOption = '선택',
  disabled,
  ...rest
}) => {
  const isValuePresent = value !== '' && value !== null && value !== undefined;

  const baseInputClasses = `
    block w-full px-4 pt-5 pb-2
    text-base text-gray-900 
    bg-white border border-gray-300 rounded-lg 
    appearance-none
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    peer
    transition-all duration-200 ease-in-out
    box-border /* ✨ 이 부분을 추가하여 box-sizing 문제를 해결합니다. */
    ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
  `;

  const labelClasses = `
    absolute left-4 top-3 text-gray-500 
    transition-all duration-200 ease-in-out
    transform
    ${isValuePresent || type === 'select' ? 'text-xs -translate-y-2 text-primary' : 'text-base translate-y-0'}
    peer-focus:text-xs peer-focus:-translate-y-2 peer-focus:text-primary
    pointer-events-none
  `;

  const normalizedOptions =
    Array.isArray(options)
      ? options.map((o) =>
          typeof o === 'string' || typeof o === 'number'
            ? { value: String(o), label: String(o) }
            : o
        )
      : [];

  return (
    <div className="relative w-full">
      {type === 'select' ? (
        <>
          <select
            id={id}
            value={value ?? ''}
            onChange={onChange}
            ref={inputRef}
            required={required}
            disabled={disabled}
            className={baseInputClasses}
            {...rest}
          >
            <option value="">{placeholderOption}</option>
            {normalizedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label htmlFor={id} className={labelClasses}>
            {isRequiredMark && <span className="text-red-500 mr-1">*</span>}
            {label}
          </label>
        </>
      ) : (
        <>
          <input
            type={type}
            id={id}
            value={value}
            onChange={onChange}
            ref={inputRef}
            required={required}
            placeholder=" " // 중요: floating label 동작을 위해 공백 placeholder 필요
            className={baseInputClasses}
            disabled={disabled}
            {...rest}
          />
          <label htmlFor={id} className={labelClasses}>
            {isRequiredMark && <span className="text-red-500 mr-1">*</span>}
            {label}
          </label>
          {icon && (
            <div className="absolute top-1/2 right-4 -translate-y-1/2 h-5 w-5 text-gray-400 peer-focus:text-primary">
              {icon}
            </div>
          )}
        </>
      )}
      {children}
    </div>
  );
};

export default TextField;
  