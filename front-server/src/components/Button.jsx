import React from 'react'
import { cva } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'

const buttonVariants = cva(
  'rounded-md font-medium transition-colors duration-200 disabled:opacity-50', // 기본 스타일
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-opacity-90 shadow-brand',
        secondary:
          'border border-gray-300 hover:bg-gray-50 hover:border-primary',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      // 기본값 설정
      variant: 'secondary',
      size: 'md',
    },
  }
)

const Button = ({ variant, size, children, className, onClick }) => {
  // 3. twMerge와 clsx를 함께 사용하여 클래스를 안전하게 조합합니다.
  const finalClassName = twMerge(
    clsx(buttonVariants({ variant, size, className }))
  )

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-none bg-[#9DD5E9] px-4 py-2 text-sm text-white hover:bg-gray-400 ${className}`}
    >
      {children}
    </button>
  )
}

export default Button
