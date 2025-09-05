// src/pages/seller/Feedbacks/FeedbacksManagePage.jsx

import React, { useEffect, useMemo, useState, memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button'
import Modal from '../../../components/common/Modal'
import OrderDetailContent from '../../../components/seller/OrderDetailContent'
import ReportModal from '../../../components/seller/feedbacks/ReportModal'
// import BaseTable from '../../../components/common/table/BaseTable'
// import TableToolbar from '../../../components/common/table/TableToolbar'
import FeedbackRow from '../../../components/seller/feedbacks/FeedbackRow';
import { fetchSellerFeedbackGrid } from '../../../service/feedbackService';
import useFeedbackFilters from '../../../components/seller/feedbacks/useFeedbackFilters';
import FeedbackFilterChips from '../../../components/seller/feedbacks/FeedbackFilterChips';

// --- UI 상수 ---
const box = 'rounded-xl border bg-white p-4 shadow-sm';
const ROW_H = 48;
const HEADER_H = 44;
const MAX_ROWS = 10;
const tableMaxH = `${ROW_H * MAX_ROWS + HEADER_H}px`;

const ColGroup = memo(function ColGroup({ widths = [] }) {
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );
});

// 주문번호/상품명/구매자/작성일/상태/내용/신고
const COL_WIDTHS = ['140px', '220px', '120px', '130px', '140px', 'auto', '120px'];

export default function FeedbacksManagePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusKey = searchParams.get('status') || 'ALL';
  const q = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [qInput, setQInput] = useState(q);
  const [isComp, setIsComp] = useState(false);
  useEffect(() => setQInput(q), [q]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  const setParam = useCallback((patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (isComp) return;
    const id = setTimeout(() => {
      if (qInput !== q) setParam({ q: qInput, page: 0 });
    }, 400);
    return () => clearTimeout(id);
  }, [qInput, isComp, q, setParam]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSellerFeedbackGrid({ q, page: 0, size: 200 });
      setRows(data?.content || data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const { counts, filtered } = useFeedbackFilters(rows, statusKey);

  const onOpenOrder = (row) => {
    setSelectedRow(row);
    setDetailOpen(true);
  };

  const onRequestReport = (row) => {
    // feedbackId 우선, 없으면 중첩 객체/대체 키도 시도
    const feedbackId = row?.feedbackId ?? row?.feedback?.id ?? row?.id;
    setReportTarget({ ...row, feedbackId });
    setReportOpen(true);
  };

  const handleReported = () => {
    setReportOpen(false);
    setReportTarget(null);
    load(); // 신고 후 목록 새로고침
  };

  return (
    <div className="mx-auto w-full max-w-7xl sm:px-6 lg:px-8 ">
      <div className='flex items-center space-x-2'>
        <h1 className="text-xl font-bold mb-4">피드백 관리</h1>
        <Button variant='signUp' className='text-sub' onClick={() => navigate('/seller/feedbacks/stats')}>피드백 통계 보기</Button>
      </div>

      <section className={`${box} mb-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-grow mb-2 sm:mb-0">
            <FeedbackFilterChips
              counts={counts}
              value={statusKey}
              onChange={(key) => setParam({ status: key })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onCompositionStart={() => setIsComp(true)}
              onCompositionEnd={() => setIsComp(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  setParam({ q: qInput });
                }
              }}
              placeholder="주문번호/수취인/연락처 검색"
              className="w-full sm:w-64 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
            />
            <Button size="md" variant="admin" onClick={() => setParam({ q: qInput })}>
              조회
            </Button>
          </div>
        </div>
      </section>

      <section className={box}>
        <div className="overflow-x-auto" style={{ maxHeight: tableMaxH }}>
          <table className="w-full min-w-[1200px] table-fixed text-sm text-center">
            <ColGroup widths={COL_WIDTHS} />
            <thead className="sticky top-0 z-10 border-b bg-gray-50 text-[13px] text-gray-600">
              <tr className="h-11">
                <th className="px-3 font-medium">주문번호</th>
                <th className="px-3 font-medium text-center">상품명</th>
                <th className="px-3 font-medium">구매자</th>
                <th className="px-3 font-medium">피드백 작성일</th>
                <th className="px-3 font-medium">상태</th>
                <th className="px-3 font-medium text-center">피드백 내용</th>
                <th className="px-3 font-medium text-center">신고</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-500">불러오는 중…</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="py-10 text-center text-rose-600">{String(error)}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-500">데이터가 없습니다.</td></tr>
              ) : (
                filtered.map((row) => (
                  <FeedbackRow
                    key={row.id ?? row.feedbackId ?? row.orderItemId}
                    row={row}
                    onOpenOrder={onOpenOrder}
                    onRequestReport={onRequestReport}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="주문 상세">
        <div className="p-4">
          <OrderDetailContent row={selectedRow} />
        </div>
      </Modal>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        feedbackId={reportTarget?.feedbackId}
        onReported={handleReported}
      />
    </div>
  );
}
