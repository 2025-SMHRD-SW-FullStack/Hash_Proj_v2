import { useEffect, useState } from "react";
import { getMyOrders } from "../../../service/orderService";
import OrderCard from "./OrderCard";

export default function MyOrders() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    getMyOrders().then(setItems).finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  if (loading) return <div className="p-6">불러오는 중…</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">내 주문 / 배송 내역</h1>
      {items.length === 0 && (
        <div className="text-gray-500">주문 내역이 없습니다.</div>
      )}
      {items.map(order => (
        <OrderCard key={order.id} order={order} onChanged={refresh} />
      ))}
    </div>
  );
}
