// src/pages/seller/product/ProductDetailPage.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMyProductDetail, deleteMyProduct } from '../../../service/productService'

// UI
const box = 'rounded-xl border bg-white p-4 shadow-sm'
const Field = ({ label, children }) => (
  <label className="mb-3 block">
    <div className="mb-1 text-sm text-gray-600">{label}</div>
    {children}
  </label>
)

export default function ProductDetailPage() {
  const navigate = useNavigate()
  const { productId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [product, setProduct] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const { product: p } = await getMyProductDetail(productId)
        if (!alive) return
        setProduct(p)
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || e.message || '불러오기에 실패했습니다.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [productId])

  const remove = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    try {
      await deleteMyProduct(productId)
      alert('삭제되었습니다.')
      navigate('/seller/products')
    } catch (e) {
      alert(e?.response?.data?.message || e.message || '삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className={`${box} text-center`}>불러오는 중…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className={`${box} text-center text-rose-600`}>{String(error)}</div>
      </div>
    )
  }

  if (!product) {
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

  const price = Number(product?.salePrice || product?.basePrice || 0).toLocaleString('ko-KR')
  const stock = Number(product?.stockTotal ?? 0).toLocaleString('ko-KR')

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">상품 상세</h1>
      <div className={box}>
        <Field label="상품명">
          <div className="rounded-lg border px-3 py-2 text-sm bg-gray-50">{product?.name || '-'}</div>
        </Field>
        <Field label="브랜드">
          <div className="rounded-lg border px-3 py-2 text-sm bg-gray-50">{product?.brand || '-'}</div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="가격(원)">
            <div className="rounded-lg border px-3 py-2 text-sm bg-gray-50">{price}</div>
          </Field>
          <Field label="재고">
            <div className="rounded-lg border px-3 py-2 text-sm bg-gray-50">{stock}</div>
          </Field>
        </div>
        <Field label="카테고리">
          <div className="rounded-lg border px-3 py-2 text-sm bg-gray-50">{product?.category || '-'}</div>
        </Field>

        <div className="mt-4 flex justify-between">
          <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => navigate('/seller/products')}>
            목록
          </button>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => navigate(`/seller/products/${productId}/edit`)}>
              수정
            </button>
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={remove}>
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
