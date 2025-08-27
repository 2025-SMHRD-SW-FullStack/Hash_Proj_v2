import React from 'react'
import { cva } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'

const buttonVariants = cva(
  // TODO: cursor-pointer랑 비활성화시 x 뜨게
  'rounded-lg border-none font-medium transition-colors duration-200 disabled:opacity-60 hover:bg-gray-300', // 기본 스타일
  {
    variants: {
      variant: {
        primary: 'bg-[#9DD5E9] text-white',
        signUp:
          'border-solid border-[1px] border-[#C3C3C3] bg-white text-[#4CBDE6]',
        admin: 'bg-[#ADD973] text-white',
        unselected: 'bg-white border-[#C3C3C3] border-solid border-[1px] text-[#C3C3C3]'
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      // 기본값 설정
      variant: 'primary',
      size: 'md',
    },
  }
)

const Button = ({
  variant,
  size,
  children,
  className,
  onClick,
  type,
  disabled,
  ...props
}) => {
  // 3. twMerge와 clsx를 함께 사용하여 클래스를 안전하게 조합합니다.
  const finalClassName = twMerge(
    clsx(buttonVariants({ variant, size, className }))
  )

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={finalClassName}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
