import { useEffect } from "react";
import DaumPostcode from "react-daum-postcode";

export default function AddressSearchModal({ open, onClose, onSelect }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-[520px] max-w-[94vw] rounded-2xl shadow-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">주소 검색</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 px-2" aria-label="close">✕</button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <DaumPostcode
            onComplete={(data) => {
              const addr1 = data.roadAddress || data.jibunAddress;
              const zipcode = data.zonecode;
              onSelect?.({ addr1, zipcode });
              onClose?.();
            }}
            autoClose
            animation
          />
        </div>
      </div>
    </div>
  );
}
