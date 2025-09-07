// /src/components/feedback/FeedbackEditModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { updateFeedback } from '../../service/feedbackService';
import { uploadImages } from '../../service/uploadService';
// util 경로/케이스: feedbacksStatus (소문자)
import { canEditFeedback } from '../../util/feedbacksStatus';

export default function FeedbackEditModal({
  open,
  onClose,
  feedback,
  orderItem,           // 주문 상세에서만 전달
  onUpdated,
  enforceGuard = false // 상품 상세 등에서는 false 유지
}) {
  console.log('[EditModal] open =', open, 'enforceGuard =', enforceGuard);

  // 초기 이미지(URL 배열) 파싱
  const initialImages = useMemo(() => {
    try {
      if (!feedback?.imagesJson) return [];
      const parsed = JSON.parse(feedback.imagesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [feedback]);

  const [content, setContent] = useState(feedback?.content ?? '');
  const [images, setImages] = useState(initialImages); // 항상 URL 배열 유지
  const [submitting, setSubmitting] = useState(false);

  // 🔒 가드: 주문 문맥 + enforceGuard=true 인 화면에서만 적용
  useEffect(() => {
    if (!open) return;

    if (!enforceGuard) {
      console.log('[EditModal] guard skipped (enforceGuard=false)');
      return;
    }

    if (orderItem && typeof canEditFeedback === 'function') {
      let allowed = true;
      try {
        allowed = !!canEditFeedback(orderItem, feedback);
      } catch (e) {
        console.error('[EditModal] canEditFeedback error:', e);
      }
      console.log('[EditModal] guard result =', allowed);
      if (!allowed) onClose?.();
    } else {
      console.log('[EditModal] no orderItem → guard not applied');
    }
  }, [open, enforceGuard, orderItem, feedback, onClose]);

  // 피드백 변경 시 폼 초기화
  useEffect(() => {
    setContent(feedback?.content ?? '');
    setImages(initialImages);
  }, [feedback, initialImages]);

  // 이미지 선택 → 업로드 → URL 배열 추가
  const onPickFiles = async (e) => {
    try {
      const list = Array.from(e?.target?.files || []);
      if (!list.length) return;

      // ✅ 업로드 서비스 시그니처: uploadImages('FEEDBACK', files)
      const metas = await uploadImages('FEEDBACK', list); // [{url,...}]
      const urls = Array.isArray(metas) ? metas.map(m => m?.url).filter(Boolean) : [];
      if (urls.length) setImages(prev => [...prev, ...urls]);
    } catch (err) {
      console.error('upload failed:', err);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      if (e?.target) e.target.value = '';
    }
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!feedback?.id) return;
    setSubmitting(true);
    try {
      // ✅ 서버 구현 차이에 안전하게: images(URL배열) + imagesJson 동시 전송
      const payload = { content };
      if (Array.isArray(images)) payload.images = images;
      try { payload.imagesJson = JSON.stringify(images ?? []); } catch {}

      const updated = await updateFeedback(feedback.id, payload);

      // 응답이 비어도 즉시 로컬 반영
      const next = updated ?? {
        ...feedback,
        content,
        imagesJson: Array.isArray(images) ? JSON.stringify(images) : feedback.imagesJson,
        updatedAt: new Date().toISOString(),
      };

      onUpdated?.(next);
      onClose?.();
    } catch (err) {
      console.error(err);
      alert(err?.message || '수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="피드백 수정">
      <div className="flex flex-col gap-4 p-4" onClick={(e) => e.stopPropagation()}>
        <label className="form-label">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[140px] rounded-lg border p-3 outline-none focus:ring"
          placeholder="피드백 내용을 수정하세요"
        />

        <div className="flex flex-col gap-2">
          <div className="form-label">이미지</div>
          <div className="flex flex-wrap gap-3">
            {images.map((url, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  className="absolute top-1 right-1 rounded-full bg-black/60 text-white text-xs px-2 py-0.5"
                  onClick={() => removeImage(idx)}
                  variant="ghost"
                >
                  삭제
                </Button>
              </div>
            ))}
            <label className="w-24 h-24 flex items-center justify-center rounded-lg border cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onPickFiles}
              />
              <span className="text-sm">추가</span>
            </label>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '저장 중…' : '저장'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
