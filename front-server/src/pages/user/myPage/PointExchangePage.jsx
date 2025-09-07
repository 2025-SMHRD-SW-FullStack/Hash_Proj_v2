import React, { useState, useEffect } from "react";
import Button from "../../../components/common/Button";
import { getMyPointBalance, requestPointRedemption, getMyRedemptionHistory } from "../../../service/pointService";

const EXCHANGE_OPTIONS = [5000, 10000, 30000];

// 상태에 따른 뱃지 스타일
const StatusBadge = ({ status }) => {
  const styles = {
    REQUESTED: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  const text = {
    REQUESTED: '처리중',
    APPROVED: '교환완료',
    REJECTED: '반려',
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const PointExchangePage = () => {
  const [balance, setBalance] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [balanceData, historyData] = await Promise.all([
        getMyPointBalance(),
        getMyRedemptionHistory(0, 5) // 최근 5건만 표시
      ]);
      setBalance(balanceData);
      setHistory(historyData.content || []);
    } catch (error) {
      alert("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleExchange = async () => {
    if (!selectedAmount) {
      alert("교환할 금액을 선택해주세요.");
      return;
    }
    if (balance < selectedAmount) {
      alert("포인트 잔액이 부족합니다.");
      return;
    }

    if (confirm(`${selectedAmount.toLocaleString()}P를 교환하시겠습니까?`)) {
      try {
        setLoading(true);
        await requestPointRedemption(selectedAmount);
        alert("교환 신청이 완료되었습니다.");
        fetchInitialData(); // 교환 후 데이터 새로고침
        setSelectedAmount(null); // 선택 초기화
      } catch (error) {
        alert(error.response?.data?.message || "교환 신청 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">포인트 교환하기</h2>
        <p className="text-gray-600">보유한 포인트로 기프트쇼 등 다양한 상품을 교환하세요.</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-500 text-sm">나의 포인트</p>
        <p className="text-3xl font-bold text-primary mt-1">
          {loading ? '조회 중...' : `${balance.toLocaleString()} P`}
        </p>
      </div>

      <div>
        <p className="font-semibold mb-3">교환할 금액 선택</p>
        <div className="grid grid-cols-3 gap-4">
          {EXCHANGE_OPTIONS.map((amount) => (
            <button
              key={amount}
              onClick={() => setSelectedAmount(amount)}
              disabled={balance < amount}
              className={`p-4 border rounded-lg text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${selectedAmount === amount ? 'bg-primary text-white border-primary ring-2 ring-blue-300' : 'bg-white hover:border-primary focus:border-primary'}`}
            >
              <span className="text-xs">giftshow</span>
              <p className="font-bold text-lg">{amount.toLocaleString()}원</p>
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full h-14 text-lg" onClick={handleExchange} disabled={!selectedAmount || loading}>
        {loading ? '처리 중...' : '교환하기'}
      </Button>

      <div>
        <h3 className="text-lg font-semibold mb-3">최근 교환 내역</h3>
        <div className="space-y-2">
          {history.length > 0 ? (
            history.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{item.amount.toLocaleString()}P 교환</p>
                  <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">최근 교환 내역이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PointExchangePage;