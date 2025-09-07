import { useEffect, useState } from "react";
import AddressSearchModal from "./AddressSearchModal";
import { createAddress, updateAddress } from "../../service/addressService";
import Button from "../common/Button";

const inputCls = "h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900";

export default function AddressForm({
  onSaved,
  initial,
  addressId,
  // 🔽 유일한 기본 배송지라면 true 로 전달받아 해제 차단
  lockUncheckPrimary = false,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    receiver: "",
    phone: "",
    zipcode: "",
    addr1: "",
    addr2: "",
    primaryAddress: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      setForm({
        receiver: initial.receiver ?? "",
        phone: initial.phone ?? "",
        zipcode: initial.zipcode ?? "",
        addr1: initial.addr1 ?? "",
        addr2: initial.addr2 ?? "",
        primaryAddress: initial.primaryAddress ?? false,
      });
    }
  }, [initial]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(s => ({ ...s, [name]: value }));
  };

  // ✅ 기본 배송지 체크박스 전용 핸들러: 유일 기본이면 해제 차단
  const onPrimaryToggle = (e) => {
    const checked = e.target.checked;

    // 유일 기본주소인데 해제하려는 경우
    if (lockUncheckPrimary && !checked && (initial?.primaryAddress || form.primaryAddress)) {
      setError("기본 배송지는 최소 1개여야 합니다. 다른 주소를 기본으로 지정한 뒤 해제해 주세요.");
      // 간단 모달(시스템 alert)로도 한번 더 안내
      alert("기본 배송지는 필수입니다. 다른 주소를 기본으로 지정한 뒤 해제할 수 있어요.");
      return; // 상태 변경 안 함
    }
    setForm(s => ({ ...s, primaryAddress: checked }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.receiver.trim()) return setError("수령인을 입력해주세요.");
    if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(form.phone)) return setError("휴대폰 번호 형식이 올바르지 않습니다.");
    if (!form.zipcode || !form.addr1) return setError("주소 검색으로 우편번호/주소를 선택해주세요.");

    try {
      setLoading(true);
      if (addressId) await updateAddress(addressId, form);
      else await createAddress(form);

      onSaved?.();

      if (!addressId) {
        setForm({ receiver:"", phone:"", zipcode:"", addr1:"", addr2:"", primaryAddress:true });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "ERROR";
      if (msg === "PRIMARY_REQUIRED") {
        setError("기본 배송지는 최소 1개여야 합니다. 다른 주소를 기본으로 지정한 뒤 해제해 주세요.");
        // 서버에서 거부됐으니 UI도 되돌려줌
        setForm(s => ({ ...s, primaryAddress: true }));
      } else {
        setError("주소 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-base font-semibold mb-3">{addressId ? "배송지 수정" : "배송지 추가"}</h3>

      {!!error && <div className="mb-3 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">수령인</span>
            <input name="receiver" value={form.receiver} onChange={onChange} className={inputCls} placeholder="홍길동" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">연락처</span>
            <input name="phone" value={form.phone} onChange={onChange} className={inputCls} placeholder="010-1234-5678" />
          </label>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">우편번호</span>
            <input name="zipcode" value={form.zipcode} onChange={onChange} className={inputCls} placeholder="우편번호" readOnly />
          </label>
          <Button variant='signUp' onClick={() => setOpen(true)} className="self-end h-10 px-4 rounded-lg text-sm hover:opacity-90">
            주소 검색
          </Button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">주소</span>
          <input name="addr1" value={form.addr1} onChange={onChange} className={inputCls} placeholder="도로명/지번 주소" readOnly />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">상세 주소</span>
          <input name="addr2" value={form.addr2} onChange={onChange} className={inputCls} placeholder="동/호수 등" />
        </label>

        <label className="inline-flex items-center gap-2 select-none">
          <input
            type="checkbox"
            name="primaryAddress"
            checked={form.primaryAddress}
            onChange={onPrimaryToggle}
          />
          <span className="text-sm text-gray-700">기본 배송지로 설정</span>
        </label>
        {lockUncheckPrimary && initial?.primaryAddress && (
          <p className="text-xs text-gray-500">
            현재 이 주소가 유일한 기본 배송지입니다. 다른 주소를 기본으로 지정한 뒤 해제할 수 있어요.
          </p>
        )}

        <div className="pt-1">
          <Button type="submit" disabled={loading} className="h-10 px-5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? "저장 중..." : (addressId ? "수정 완료" : "배송지 추가")}
          </Button>
        </div>
      </form>

      <AddressSearchModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={({ addr1, zipcode }) => setForm(s => ({ ...s, addr1, zipcode }))}
      />
    </div>
  );
}
