// /src/components/seller/feedbacks/FeedbackTable.jsx

import React from 'react'
import { UI } from '/src/constants/sellerfeedbacks'
import FeedbackRow from './FeedbackRow'

export default function FeedbackTable({ rows, loading, error, onOpenOrder, onRequestReport }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className={UI.COLS.ORDER} />
          <col className={UI.COLS.PRODUCT} />
          <col className={UI.COLS.BUYER} />
          <col className={UI.COLS.DATE} />
          <col className={UI.COLS.STATUS} />
          <col className={UI.COLS.CONTENT} />
          <col className={UI.COLS.ACTION} />
        </colgroup>
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">주문번호</th>
            <th className="px-3 py-2 text-left">상품명</th>
            <th className="px-3 py-2 text-left">구매자</th>
            <th className="px-3 py-2 text-left">피드백 작성일</th>
            <th className="px-3 py-2 text-left">상태</th>
            <th className="px-3 py-2 text-left">피드백 내용</th>
            <th className="px-3 py-2 text-left">관리</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td className="px-3 py-4 text-center text-gray-500" colSpan={7}>불러오는 중…</td></tr>
          )}
          {!loading && error && (
            <tr><td className="px-3 py-4 text-center text-red-600" colSpan={7}>{error}</td></tr>
          )}
          {!loading && !error && rows.length === 0 && (
            <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={7}>표시할 항목이 없습니다.</td></tr>
          )}
          {!loading && !error && rows.map((r) => (
            <FeedbackRow key={r.id} row={r} onOpenOrder={onOpenOrder} onRequestReport={onRequestReport} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
