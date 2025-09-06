// src/components/common/Button.jsx
import React from 'react'
import { cva } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg border-none font-medium transition-colors duration-200 disabled:opacity-60 hover:drop-shadow cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white',
        signUp:
          'border-solid border-[1px] border-[#C3C3C3] bg-white text-primary',
        admin: 'bg-sub text-white',
        unselected: 'bg-white border-[#C3C3C3] border-solid border-[1px] text-[#C3C3C3]',
        blackWhite: 'bg-white text-[#222] border-[#CCCCCC] border-solid border-[1px] ',
        outline: 'bg-white text-gray-800 border border-solid border-gray-300 hover:bg-gray-50',
        danger: 'bg-red-500 text-white'
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
      {leftIcon && (
        <span className="sm:mr-2 flex shrink-0">
          {leftIcon}
        </span>
      )}
      {children}
      {rightIcon && (
        <span className="sm:ml-2 flex shrink-0">
          {rightIcon}
        </span>
      )}
    </button>
  )
}

export default Button