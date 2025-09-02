import React from 'react'
import { cva } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'

const buttonVariants = cva(
  // [수정] 아이콘과 글자를 정렬하기 위해 flex 속성 추가
  'inline-flex items-center justify-center rounded-lg border-none font-medium transition-colors duration-200 disabled:opacity-60 hover:drop-shadow cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-[#5882F6] text-white',
        signUp:
          'border-solid border-[1px] border-[#C3C3C3] bg-white text-[#5882F6]',
        admin: 'bg-[#D6BAE9] text-white',
        unselected: 'bg-white border-[#C3C3C3] border-solid border-[1px] text-[#C3C3C3]',
        blackWhite: 'bg-white text-[#222] border-[#CCCCCC] border-solid border-[1px] ',
        // [추가] 시안과 유사한 회색 테두리 버튼 스타일
        outline: 'bg-white text-gray-800 border border-solid border-gray-300 hover:bg-gray-50',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
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
  leftIcon, // [추가] 왼쪽 아이콘을 받을 prop
  rightIcon, // [추가] 오른쪽 아이콘을 받을 prop
  ...props
}) => {
  const finalClassName = twMerge(
    clsx(buttonVariants({ variant, size, className }))
  )

  return (
    <button className={finalClassName} {...props}>
      {/* [추가] leftIcon이 있으면 렌더링 */}
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {/* [추가] rightIcon이 있으면 렌더링 */}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  )
}

export default Button