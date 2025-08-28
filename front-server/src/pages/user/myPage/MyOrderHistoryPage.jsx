import React from 'react';
import MyOrderList from '../../../components/myPage/MyOrderList.jsx';

const MyOrderHistoryPage = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">주문/배송 내역</h2>
      <MyOrderList />
    </div>
  );
};

export default MyOrderHistoryPage;