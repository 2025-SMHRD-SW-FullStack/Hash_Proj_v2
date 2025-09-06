import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { updateFeedback } from '../../service/feedbackService';
import { uploadImages } from '../../service/uploadService';
import { canEditFeedback } from '/src/util/feedbacksStatus';

export default function FeedbackEditModal({ 
    open, 
    onClose, 
    feedback, 
    orderItem, 
    onUpdated 
  }) {
    
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
  const [images, setImages] = useState(initialImages);
  const [submitting, setSubmitting] = useState(false);

// 🔒 7일 제한: 모달 열릴 때 편집 가능 여부 재검사(2차 방어)
  useEffect(() => {
    if (open && !canEditFeedback(orderItem, feedback)) {
      // 필요하면 안내를 띄워도 됨
      // alert('수정 가능 기간(배송완료 후 7일)이 지났습니다.');
      onClose?.();
    }
  }, [open, orderItem, feedback, onClose]);


  useEffect(() => {
    setContent(feedback?.content ?? '');
    setImages(initialImages);
  }, [feedback, initialImages]);

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const urls = await uploadImages(files); // 배열(URL) 반환 가정
    setImages(prev => [...prev, ...urls]);
    e.target.value = '';
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!feedback?.id) return;
    setSubmitting(true);
    try {
      const updated = await updateFeedback(feedback.id, { content, images });
      onUpdated?.(feedback.id, updated);   // ← 여기!
      onClose?.();
    } catch (err) {
      alert(err.message || '수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="피드백 수정">
      <div className="flex flex-col gap-4 p-4">
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
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
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
