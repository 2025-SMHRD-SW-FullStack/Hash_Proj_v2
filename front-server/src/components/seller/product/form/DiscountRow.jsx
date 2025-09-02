// src/components/seller/product/form/DiscountRow.jsx
import React, { useMemo } from 'react'
import FieldRow from './FieldRow'
import Button from '../../../common/Button'

export default function DiscountRow({ form, setField }) {
    const price = Number(form.price || 0)
    const amount = Number(form.discount || 0) // 금액(원)만 사용

    const { off, final } = useMemo(() => {
        if (!form.discountEnabled || !price) return { off: 0, final: price }
        const amt = Math.min(Math.max(amount, 0), price) // 0~판매가로 클램프
        return { off: amt, final: price - amt }
    }, [form.discountEnabled, price, amount])

    const onNum = (k) => (e) =>
        setField(k, e.target.value.replace(/[^\d]/g, ''))

    return (
        <div className="space-y-4">
            {/* 헤더: 설정 토글 */}
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] sm:gap-4 sm:px-3">
                <div className="text-sm font-semibold text-gray-700 sm:pt-1">즉시할인</div>
                <div className="flex justify-start gap-2">
                    {/* 기본값: 설정안함 (primary 파랑으로 강조) */}
                    <Button
                        type="button"
                        size="sm"
                        variant={form.discountEnabled ? 'signUp' : 'primary'}
                        onClick={() => setField('discountEnabled', false)}
                    >
                        설정안함
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={form.discountEnabled ? 'primary' : 'signUp'}
                        onClick={() => setField('discountEnabled', true)}
                    >
                        설정함
                    </Button>
                </div>
            </div>

            {/* 설정함일 때만 노출 */}
            {form.discountEnabled && (
                <div className="space-y-3">
                    <FieldRow label="기본할인">
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="number"
                                inputMode="numeric"
                                className="w-[224px] rounded-lg border px-3 py-2 text-sm"
                                value={form.discount || ''}
                                onChange={onNum('discount')}
                                placeholder="0"
                            />
                            <span className="text-sm">원</span>
                            <span className="text-sm text-gray-500">
                                (판매가에서 즉시 차감)
                            </span>
                        </div>
                    </FieldRow>

                    <FieldRow label="할인가">
                        <div className="flex items-baseline gap-3">
                            <div className="rounded-md border border-[#C3C3C3] bg-white px-3 py-2">
                                <span className="text-lg font-bold text-[#4CBDE6]">
                                    {final.toLocaleString('ko-KR')}원
                                </span>
                            </div>
                            <span className="text-sm text-gray-500">
                                (할인 {off.toLocaleString('ko-KR')}원)
                            </span>
                        </div>
                    </FieldRow>
                </div>
            )}
        </div>
    )
}
