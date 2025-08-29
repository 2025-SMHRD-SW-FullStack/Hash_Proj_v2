// src/pages/seller/product/ProductDetailPage.jsx
import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// 상품 수정
const box = 'rounded-xl border bg-white p-4 shadow-sm'
const Field = ({ label, children }) => (
  <label className="mb-3 block">
    <div className="mb-1 text-sm text-gray-600">{label}</div>
    {children}
  </label>
)

// 임시 데이터(목록과 동일 키)
const mock = [
  { id: 1, name: '무선 미니 선풍기', sku: 'WF-01', status: '판매중', price: 39000, stock: 28, updatedAt: '2025-08-20' },
  { id: 2, name: '휴대용 제습기',   sku: 'DH-11', status: '판매중', price: 59000, stock: 12, updatedAt: '2025-08-19' },
  { id: 3, name: '자외선 살균 케이스', sku: 'UV-05', status: '품절',   price: 42000, stock: 0,  updatedAt: '2025-08-18' },
]

export default function ProductDetailPage() {
  const navigate = useNavigate()
  const { productId } = useParams()

  const initial = useMemo(() => mock.find((m) => String(m.id) === String(productId)) || null, [productId])
  const [form, setForm] = useState(
    initial || { name: '', sku: '', price: '', stock: '', status: '판매중' }
  )
  const on = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }))

  if (!initial) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className={`${box} text-center`}>해당 상품({productId})을 찾을 수 없습니다.</div>
        <div className="mt-3 text-right">
          <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => navigate('/seller/products')}>
            목록으로
          </button>
        </div>
      </div>
    )
  }

  const save = (e) => {
    e.preventDefault()
    console.log('update product', form)
    alert('임시: 저장 완료 가정')
  }
  const remove = () => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    console.log('delete product', productId)
    alert('임시: 삭제 완료 가정')
    navigate('/seller/products')
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">상품 상세/수정</h1>
      <form onSubmit={save} className={box}>
        <Field label="상품명">
          <input value={form.name} onChange={on('name')} className="w-full rounded-lg border px-3 py-2 text-sm" />
        </Field>
        <Field label="SKU">
          <input value={form.sku} onChange={on('sku')} className="w-full rounded-lg border px-3 py-2 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="가격(원)">
            <input type="number" value={form.price} onChange={on('price')} className="w-full rounded-lg border px-3 py-2 text-sm" />
          </Field>
          <Field label="재고">
            <input type="number" value={form.stock} onChange={on('stock')} className="w-full rounded-lg border px-3 py-2 text-sm" />
          </Field>
        </div>
        <Field label="상태">
          <select value={form.status} onChange={on('status')} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="판매중">판매중</option>
            <option value="품절">품절</option>
          </select>
        </Field>

        <div className="mt-4 flex justify-between">
          <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => navigate('/seller/products')}>
            목록
          </button>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={remove}>
              삭제
            </button>
            <button type="submit" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
              저장
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
