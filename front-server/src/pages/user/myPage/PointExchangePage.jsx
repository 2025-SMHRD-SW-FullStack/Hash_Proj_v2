import React, { useState } from "react";
import Button from "../../../components/common/Button";

const PointExchangePage = () => {
  const [exchangeAmount, setExchangeAmount] = useState("");

  const handleExchange = () => {
    if (!exchangeAmount) {
      alert("교환할 포인트를 입력해주세요.");
      return;
    }
    alert(`${exchangeAmount} 포인트 교환 요청! (추후 연동 예정)`);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">포인트 교환</h2>
      <p className="text-gray-600 mb-6">보유 포인트를 다른 혜택으로 교환할 수 있습니다.</p>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">교환할 포인트</label>
        <input
          type="number"
          value={exchangeAmount}
          onChange={(e) => setExchangeAmount(e.target.value)}
          placeholder="포인트 입력"
          className="w-full p-3 border rounded-lg"
        />
      </div>

      <Button className="w-full h-12 text-base" onClick={handleExchange}>
        교환하기
      </Button>
    </div>
  );
};

export default PointExchangePage;
