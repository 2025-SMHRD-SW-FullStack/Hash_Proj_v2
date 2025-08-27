// src/components/address/AddressBookModal.jsx
import { useEffect, useState } from "react";
import { deleteAddress, getAddresses } from "../../service/addressService";
import AddressForm from "./AddressForm";

export default function AddressBookModal({ open, onClose, onSelected, defaultAddressId }) {
  const [tab, setTab] = useState("list"); // list | create | edit
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

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
  }, [open]);

  if (!open) return null;

  const selected = list.find(a => a.id === selectedId) || null;

  const onRemove = async (id) => {
    if (!confirm("이 배송지를 삭제할까요?")) return;
    await deleteAddress(id);
    await reload();
  };

  const onEdit = (addr) => {
    setEditTarget(addr);
    setTab("edit");
  };

  // 🔽 유일 기본배송지 여부
  const onlyOnePrimary = list.filter(a => a.primaryAddress).length === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-[720px] max-w-[95vw] rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold">
            배송지 {tab === "list" ? "변경" : (tab === "create" ? "추가" : "수정")}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 px-2" aria-label="close">✕</button>
        </div>

        {tab === "list" && (
          <>
            <div className="max-h-[50vh] overflow-auto">
              {loading ? (
                <div className="text-sm text-gray-500">불러오는 중…</div>
              ) : list.length === 0 ? (
                <div className="text-sm text-gray-600">등록된 배송지가 없습니다. 아래에서 추가하세요.</div>
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
                        <button onClick={() => onEdit(addr)} className="text-sm px-3 h-8 rounded-lg border hover:bg-gray-50">수정</button>
                        <button onClick={() => onRemove(addr.id)} className="text-sm px-3 h-8 rounded-lg border hover:bg-gray-50">삭제</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => setTab("create")} className="h-10 px-4 rounded-lg bg-gray-900 text-white text-sm hover:opacity-90">
                + 새 배송지 추가
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="h-10 px-4 rounded-lg border">취소</button>
                <button
                  onClick={() => { if (selected) { onSelected?.(selected); onClose?.(); }}}
                  disabled={!selected}
                  className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  선택 완료
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "create" && (
          <div className="space-y-4">
            <AddressForm onSaved={async () => { await reload(); setTab("list"); }} />
            <div className="text-right">
              <button onClick={() => setTab("list")} className="h-10 px-4 rounded-lg border">목록으로</button>
            </div>
          </div>
        )}

        {tab === "edit" && editTarget && (
          <div className="space-y-4">
            <AddressForm
              addressId={editTarget.id}
              initial={editTarget}
              // 🔽 유일 기본주소를 해제하려 하면 프론트에서 즉시 차단
              lockUncheckPrimary={onlyOnePrimary && !!editTarget.primaryAddress}
              onSaved={async () => { await reload(); setTab("list"); }}
            />
            <div className="text-right">
              <button onClick={() => setTab("list")} className="h-10 px-4 rounded-lg border">목록으로</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
