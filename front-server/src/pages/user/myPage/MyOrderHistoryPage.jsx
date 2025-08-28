import React, { useEffect, useState } from 'react';
import useAuthStore from '../../../stores/authStore.js';
import { getMyPointBalance } from '../../../service/pointService.js';
import MyOrderList from '../../../components/myPage/MyOrderList.jsx';

const MyOrderHistoryPage = () => {
  const { user } = useAuthStore();

  const handleNav = () => {

  }
  
  // 👈 3. 컴포넌트가 마운트될 때 포인트 정보를 가져오는 로직
  useEffect(() => {
    const fetchPoints = async () => {
      try {
        setLoading(true);
        const balance = await getMyPointBalance();
        setPoints(balance);
      } catch (err) {
        setError('포인트 정보를 불러오는데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPoints();
    }
  }, [user]); // user 정보가 있을 때만 실행

  // 사용자 정보가 아직 로드되지 않았을 경우
  if (!user) {
    return <div>사용자 정보를 불러오는 중...</div>;
  }

  return (
    // 🎨 UI를 이미지와 유사하게 구성
    <div className="flex p-8">
    
      <main className="w-3/4 ml-8">
        <h2 className="text-2xl font-bold mb-4">주문/배송 내역</h2>
        <MyOrderList/>
      </main>
    </div>
  );
};

export default MyOrderHistoryPage;