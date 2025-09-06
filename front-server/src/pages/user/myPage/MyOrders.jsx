// src/pages/user/myPage/MyOrders.jsx
import { useEffect, useState } from "react";
import { getMyOrders } from "../../../service/orderService";
import OrderCard from "./OrderCard";

const MyOrders = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      const list = await getMyOrders();
      setRows(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-4">
      <h1 className="hidden md:block text-xl font-semibold text-gray-800">내 주문/배송 내역</h1>
      {loading && <div>불러오는 중…</div>}
      {!loading && rows.length === 0 && <div className="rounded-lg p-4 h-60 flex items-center justify-center text-gray-400">주문 내역이 없습니다.</div>}

      <div className="space-y-3 md:space-y-4">
        {rows.map(o => (
          <OrderCard key={o.id} order={o} onChanged={refresh} className="w-full" />
        ))}
      </div>
    </div>

  );
}

export default MyOrders