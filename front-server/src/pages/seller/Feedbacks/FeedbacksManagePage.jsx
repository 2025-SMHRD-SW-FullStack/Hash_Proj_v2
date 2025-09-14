import React, { useEffect, useMemo, useState, memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button'
import Modal from '../../../components/common/Modal'
import FeedbackDetailContent from '../../../components/seller/feedbacks/FeedbackDetailContent';
import ReportModal from '../../../components/seller/feedbacks/ReportModal'
import FeedbackRow from '../../../components/seller/feedbacks/FeedbackRow';
import { fetchSellerFeedbackGrid } from '../../../service/feedbackService';
import useFeedbackFilters from '../../../components/seller/feedbacks/useFeedbackFilters';
import TableToolbar from '../../../components/common/table/TableToolbar';
import { FEEDBACK_FILTERS } from '/src/constants/sellerfeedbacks';

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
  const [statusKey, setStatusKey] = useState(searchParams.get('status') || 'ALL');
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
  const resolveFeedbackId = (r) =>
    r?.feedbackId ?? r?.id ?? r?.feedback?.id ??
    (Array.isArray(r?.feedbacks) && r.feedbacks[0]?.id) ??
    r?.feedback_id ?? null;
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

  // ✅ q 폴백 텍스트 필터: 주문번호/상품명/구매자/본문에서 부분 일치
  const filteredByQ = useMemo(() => {
    const kw = (q || '').trim().toLowerCase();
    if (!kw) return filtered;
    return filtered.filter((r) => {
      const fields = [
        r?.orderNo ?? r?.order?.orderNo ?? r?.order_no,             // 주문번호 후보
        r?.productName ?? r?.product?.name ?? r?.product_name,       // 상품명 후보
        r?.buyerName ?? r?.user?.nickname ?? r?.user?.name ?? r?.buyer, // 구매자/닉네임 후보
        r?.content ?? r?.feedback?.content,                          // 피드백 본문
      ];
      return fields.some(f => String(f ?? '').toLowerCase().includes(kw));
    });
  }, [filtered, q]);

  const onOpenOrder = (row) => {
    setSelectedRow(row);
    setDetailOpen(true);
  };

  const onRequestReport = (row) => {
    const rs = String(row?.reportStatus ?? row?.report?.status ?? row?.report_status ?? '').toUpperCase();
    if (['PENDING', 'APPROVED', 'REJECTED'].includes(rs)) return; // 이미 신고 이력 있음 → 모달
    const feedbackId = row?.feedbackId ?? row?.feedback?.id ?? row?.id;
    setReportTarget({ ...row, feedbackId });
    setReportOpen(true);
  };

  const handleReported = () => {
    setReportOpen(false);
    setReportTarget(null);
    load();
  };

  // FEEDBACK_FILTERS + counts → TableToolbar용 items
  const statusItems = useMemo(() => {
    return FEEDBACK_FILTERS.map(filter => {
      const count = counts[filter.key] || 0;
      const showCount = count > 0 && filter.key !== 'ALL';
      return {
        key: filter.key,
        label: showCount ? `${filter.baseLabel}` : filter.baseLabel,
        count,
      };
    });
  }, [counts]);

  return (
    <div className="mx-auto w-full max-w-7xl md:px-6 lg:px-8 ">
      <div className='flex items-center space-x-2 justify-between'>
        <h1 className="text-xl font-bold mb-4">피드백 관리</h1>
        <Button variant='signUp' className='text-sub' onClick={() => navigate('/seller/feedbacks/stats')}>피드백 통계 보기</Button>
      </div>

      {/* TableToolbar로 교체 */}
      <section className={`${box} mb-4`}>
        <TableToolbar
          statusChips={FEEDBACK_FILTERS.map(filter => ({
            value: filter.key,
            label: filter.baseLabel,
            count: counts[filter.key],
          }))}
          selectedStatus={statusKey}
          onSelectStatus={(value) => {
            setParam({ status: value }); // URL param도 업데이트
            setStatusKey(value);         // 상태 업데이트
          }}
          searchValue={qInput}
          onChangeSearch={setQInput}
          onSubmitSearch={() => setParam({ q: qInput })}
          onCompChange={setIsComp}                   // ✅ 추가: 조합 입력 시작/끝 전달
          onReset={() => {                           // ✅ 선택: 초기화 버튼 동작
            setQInput('');
            setParam({ q: '', page: 0 });
          }}
        />
      </section>

      <section className={box}>
        <div className="overflow-x-auto" style={{ maxHeight: tableMaxH }}>
          <table className="w-full table-fixed text-sm text-center">
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
              ) : filteredByQ.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-500">데이터가 없습니다.</td></tr>
              ) : (
                filteredByQ.map((row) => {
                  const rs = String(row?.reportStatus ?? row?.report?.status ?? row?.report_status ?? '').toUpperCase();
                  const reportDisabled = ['PENDING', 'APPROVED', 'REJECTED'].includes(rs);
                  return (
                    <FeedbackRow
                      key={row.id ?? row.feedbackId ?? row.orderItemId}
                      row={row}
                      onOpenOrder={onOpenOrder}
                      onRequestReport={onRequestReport}
                      reportDisabled={reportDisabled}
                      reportState={rs}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="피드백 상세">
        <div className="p-4">
          <FeedbackDetailContent feedbackId={resolveFeedbackId(selectedRow)} />
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
