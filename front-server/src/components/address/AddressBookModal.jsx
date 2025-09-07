import { useEffect, useState } from "react";
import { deleteAddress, getAddresses } from "../../service/addressService.js";
import AddressForm from "./AddressForm.jsx";
import Modal from "../common/Modal.jsx"; // 공용 Modal 컴포넌트 import
import Button from "../common/Button.jsx"; // 공용 Button 컴포넌트 import

export default function AddressBookModal({ open, onClose, onSelected, defaultAddressId }) {
  const [tab, setTab] = useState("list"); // list | create | edit
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  
  // 삭제 확인을 위한 상태 추가
  const [deletingId, setDeletingId] = useState(null);

  const reload = async () => {
    try {
      setLoading(true);
      const res = await getAddresses();
      setList(res || []);
      const def =
        res?.find(a => a.id === defaultAddressId) ||
        res?.find(a => a.primaryAddress) ||
        res?.[0] ||
        null;
      setSelectedId(def?.id ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setTab("list");
      setEditTarget(null);
      reload();
    }
  }, [open, defaultAddressId]);

  const selected = list.find(a => a.id === selectedId) || null;

  // 삭제 확인 모달을 띄우는 함수
  const handleRemoveClick = (id) => {
    setDeletingId(id);
  };
  
  // 실제 삭제를 실행하는 함수
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    await deleteAddress(deletingId);
    setDeletingId(null); // 모달 닫기
    await reload(); // 목록 새로고침
  };

  const onEdit = (addr) => {
    setEditTarget(addr);
    setTab("edit");
  };

  const onlyOnePrimary = list.filter(a => a.primaryAddress).length === 1;
  
  const modalTitle = `배송지 ${tab === "list" ? "변경" : tab === "create" ? "추가" : "수정"}`;

  const renderList = () => (
    <>
      <div className="max-h-[50vh] overflow-auto">
        {loading ? (
          <div className="text-sm text-gray-500 p-4">불러오는 중…</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-gray-600 p-4">등록된 배송지가 없습니다. 아래에서 추가하세요.</div>
        ) : (
          <ul className="space-y-2">
            {list.map(addr => (
              <li key={addr.id} className="rounded-xl border p-3 flex items-start justify-between">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="addr"
                    checked={selectedId === addr.id}
                    onChange={() => setSelectedId(addr.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{addr.receiver} ({addr.phone})</div>
                    <div className="text-sm text-gray-600">({addr.zipcode}) {addr.addr1} {addr.addr2}</div>
                    {addr.primaryAddress && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        기본 배송지
                      </span>
                    )}
                  </div>
                </label>
                <div className="shrink-0 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(addr)}>수정</Button>
                  <Button variant="outline" size="sm" onClick={() => handleRemoveClick(addr.id)}>삭제</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  const renderForm = (isEdit = false) => (
    <div className="space-y-4">
      <AddressForm
        addressId={isEdit ? editTarget.id : undefined}
        initial={isEdit ? editTarget : undefined}
        lockUncheckPrimary={isEdit && onlyOnePrimary && !!editTarget.primaryAddress}
        onSaved={async () => { await reload(); setTab("list"); }}
      />
    </div>
  );

  return (
    <>
      <Modal
        isOpen={open}
        onClose={onClose}
        title={modalTitle}
        maxWidth="max-w-3xl"
        footer={
          tab === "list" ? (
            <div className="w-full flex justify-between items-center">
              <Button variant="primary" onClick={() => setTab("create")}>+ 새 배송지 추가</Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>취소</Button>
                <Button onClick={() => { if (selected) { onSelected?.(selected); onClose?.(); }}} disabled={!selected}>
                  선택 완료
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-end">
              <Button variant="outline" onClick={() => setTab("list")}>목록으로</Button>
            </div>
          )
        }
      >
        <div className="p-4">
          {tab === 'list' && renderList()}
          {tab === 'create' && renderForm(false)}
          {tab === 'edit' && editTarget && renderForm(true)}
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="배송지 삭제 확인"
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletingId(null)}>취소</Button>
            <Button variant="danger" onClick={handleConfirmDelete}>삭제</Button>
          </>
        }
      >
        <p className="p-4 text-gray-700">이 배송지를 정말 삭제하시겠습니까?<br/>삭제된 주소는 복구할 수 없습니다.</p>
      </Modal>
    </>
  );
}

