import React, { useEffect, useState } from 'react';
import Button from '../common/Button';
import {getMyOrderList} from '../../service/myOrderListService'
import MyOrderItem from './MyOrderItem'

// 주문 목록 전체를 관리하는 메인 컴포넌트
const MyOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getMyOrderList();
        setOrders(data);
      } catch (err) {
        setError('주문 내역을 불러오는데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="text-center p-10">주문 내역을 불러오는 중...</div>;
  if (error) return <div className="text-center p-10 text-red-500">{error}</div>;
  if (orders.length === 0) {
    return (
      <div className="border rounded-lg p-4 h-96 flex items-center justify-center text-gray-400">
        주문 내역이 없습니다.
      </div>
    );
  }

  return (
    <div>
      {orders.map(order => <MyOrderItem key={order.id} order={order} />)}
    </div>
  );
};

export default MyOrderList;