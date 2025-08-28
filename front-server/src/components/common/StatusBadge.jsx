import React from 'react'


const variants = {
    success: 'bg-green-100 text-green-700',
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
    purple: 'bg-purple-100 text-purple-700',
}


// map: 'product' | 'order' | ((text)=>key)
function pickVariant(text, map = 'product') {
    if (typeof map === 'function') return map(text)
    const t = String(text || '').trim()
    if (map === 'order') {
        if (t.includes('배송준비중')) return 'warning'
        if (t.includes('배송중')) return 'info'
        if (t.includes('완료')) return 'success'
        if (t.includes('교환')) return 'purple'
        return 'gray'
    }
    // product
    if (t.includes('판매중')) return 'success'
    if (t.includes('품절')) return 'gray'
    if (t.includes('판매중지')) return 'danger'
    return 'gray'
}


export default function StatusBadge({ text, map = 'product', className = '' }) {
    const vKey = pickVariant(text, map)
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${variants[vKey]} ${className}`}>
            {text}
        </span>
    )
}