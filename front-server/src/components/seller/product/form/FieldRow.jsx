// src/components/seller/product/form/FieldRow.jsx
import React from 'react'

export default function FieldRow({ label, required, help, children }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr] sm:gap-4 sm:px-3">
      <div className="text-sm font-medium text-gray-700 sm:pt-2">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </div>
      <div>
        {children}
        {help && <p className="mt-1 text-xs text-gray-500">{help}</p>}
      </div>
    </div>
  )
}
