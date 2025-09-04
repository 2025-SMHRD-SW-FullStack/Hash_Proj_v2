// src/components/modals/ExchangeRequestModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { requestExchange } from '../../service/exchangeService';
import { uploadImages } from '../../service/uploadService'; // 이미지 업로드 서비스 import
import Button from '../common/Button';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import CloseIcon from '../../assets/icons/ic_close.svg';
import TestImg from '../../assets/images/ReSsol_TestImg.png';

const formatOptions = (jsonString) => {
  if (!jsonString) return '옵션 정보 없음';
  try {
    const options = JSON.parse(jsonString);
    if (Object.keys(options).length === 0) return '기본 옵션';
    return Object.entries(options).map(([key, value]) => `${key}: ${value}`).join(' / ');
  } catch (e) { return '옵션 정보 오류'; }
};

const ExchangeRequestModal = ({ open, onClose, orderItems, onComplete, existingExchangeIds }) => {
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [reason, setReason] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const availableItems = orderItems.filter(item => !existingExchangeIds?.has(item.id));
  const isAllSelected = availableItems.length > 0 && selectedIds.size === availableItems.length;

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedIds(new Set());
      setReason('');
      setImages([]);
      previews.forEach(url => URL.revokeObjectURL(url)); // 컴포넌트 언마운트 시 URL 해제
      setPreviews([]);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleToggleAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(availableItems.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleItem = (itemId) => {
    // ✅ 이미 교환 신청된 상품인지 확인
    if (existingExchangeIds?.has(itemId)) {
      alert('이미 교환이 진행 중인 상품입니다.');
      return;
    }
    const newIds = new Set(selectedIds);
    if (newIds.has(itemId)) {
      newIds.delete(itemId);
    } else {
      newIds.add(itemId);
    }
    setSelectedIds(newIds);
  };

  const handleNextStep = () => {
    if (selectedIds.size === 0) {
      alert("교환할 상품을 1개 이상 선택해주세요.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('교환 사유를 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. 이미지 업로드
      let imageUrls = [];
      if (images.length > 0) {
        const uploadResults = await uploadImages('EXCHANGE', images);
        imageUrls = uploadResults.map(res => res.url);
      }
      
      const selectedItems = orderItems.filter(item => selectedIds.has(item.id));

      const promises = selectedItems.map(item => 
        requestExchange(item.id, {
          reasonText: reason,
          imageUrls, // 2. 업로드된 실제 이미지 URL 사용
          qty: item.qty,
        })
      );
      
      await Promise.all(promises);

      alert(`${selectedItems.length}개 상품에 대한 교환 신청이 완료되었습니다.`);
      onComplete?.();
      onClose();
    } catch (error) {
      alert(error.message || '교환 신청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - images.length);
    if (files.length === 0) return;
    setImages(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const handleRemoveImage = (indexToRemove) => {
    URL.revokeObjectURL(previews[indexToRemove]); // 메모리 누수 방지
    setImages(prev => prev.filter((_, i) => i !== indexToRemove));
    setPreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center p-2 border-b">
        <input type="checkbox" id="select-all" className="w-5 h-5 mr-3" checked={isAllSelected} onChange={handleToggleAll} />
        <label htmlFor="select-all" className="font-semibold">전체 선택</label>
      </div>
      {orderItems.map(item => {
        const isRequested = existingExchangeIds?.has(item.id);
        return (
          <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${isRequested ? 'bg-gray-200 opacity-60' : 'bg-gray-50'}`}>
            <label className={`flex items-center gap-4 flex-grow ${isRequested ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input type="checkbox" className="w-5 h-5" checked={selectedIds.has(item.id)} onChange={() => handleToggleItem(item.id)} disabled={isRequested} />
              <img src={TestImg} alt={item.productName} className="w-16 h-16 rounded-md object-cover" />
              <div>
                <p className="font-semibold">{item.productName}</p>
                <p className="text-sm text-gray-600">{formatOptions(item.optionSnapshotJson)}</p>
                <p className="text-sm text-gray-500 mt-1">수량: {item.qty}개</p>
              </div>
            </label>
            {isRequested && <span className="text-sm font-semibold text-gray-500 mr-4">교환 진행 중</span>}
          </div>
        )
      })}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">선택된 상품 ({selectedIds.size}개)</h3>
        <div className="max-h-32 overflow-y-auto space-y-2 bg-gray-50 p-2 rounded-lg">
        {orderItems.filter(it => selectedIds.has(it.id)).map(item => (
            <p key={item.id} className="text-sm text-gray-700 truncate">
              - {item.productName} ({formatOptions(item.optionSnapshotJson)}) / {item.qty}개
            </p>
        ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">상세 사유 (모든 상품에 공통 적용)</label>
        <textarea rows="5" className="w-full p-2 border rounded-md" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="상품의 어떤 점에 문제가 있었나요?" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">사진 첨부 (선택, 최대 5장)</label>
        <Button variant="blackWhite" onClick={() => fileInputRef.current?.click()} disabled={images.length >= 5}>사진 선택</Button>
        <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <div className="flex flex-wrap gap-3 mt-3">
          {previews.map((preview, i) => (
            <div key={i} className="relative w-24 h-24">
              <img src={preview} alt={`preview ${i}`} className="w-full h-full object-cover rounded-lg" />
              <button onClick={() => handleRemoveImage(i)} className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-0.5 shadow">
                <Icon src={CloseIcon} alt="삭제" className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="교환 신청"
      footer={
        <div className="flex justify-between w-full">
          {step === 2 && <Button variant="unselected" onClick={() => setStep(1)}>뒤로</Button>}
          <div className="flex-grow" />
          {step === 1 ? (
             <Button onClick={handleNextStep} disabled={selectedIds.size === 0}>다음</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : '신청 완료'}
            </Button>
          )}
        </div>
      }
    >
      {step === 1 ? renderStep1() : renderStep2()}
    </Modal>
  );
};

export default ExchangeRequestModal;