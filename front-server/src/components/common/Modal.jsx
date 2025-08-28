import React, { useEffect } from 'react'
import Button from './Button' 

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  
    // ESC로 닫기 + 바디 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} rounded-xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <Button variant="signUp" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden p-5">
          {children}
        </div>
      </div>
    </div>
  )
}
