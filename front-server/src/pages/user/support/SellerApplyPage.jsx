import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../../../components/common/TextField';
import Button from '../../../components/common/Button';
import AddressSearchModal from '../../../components/address/AddressSearchModal';
import { applySeller } from '../../../service/sellerService'; // 새롭게 정의할 서비스 함수
import { CATEGORIES } from '../../../constants/products';

const SellerApplyPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bizNo: '',
    shopName: '',
    ownerName: '',
    addr: '',
    phone: '',
    category: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleAddressSelect = ({ addr1, zipcode }) => {
    setForm({ ...form, addr: addr1, zipcode });
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Object.values(form).every(field => field.trim())) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      // API 호출
      await applySeller(form);
      alert('셀러 신청이 완료되었습니다.');
      navigate('/user/mypage');
    } catch (error) {
      alert('신청 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">셀러 등록 신청</h2>
      <p className="text-center text-gray-600 mb-8">
        먼저써봄과 함께 피드백으로 빛나는 상품을 만들어보세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="shopName"
          name="shopName"
          label="상호명"
          value={form.shopName}
          onChange={handleChange}
          required
        />
        <TextField
          id="ownerName"
          name="ownerName"
          label="대표자명"
          value={form.ownerName}
          onChange={handleChange}
          required
        />
        <TextField
          id="bizNo"
          name="bizNo"
          label="사업자 등록번호"
          value={form.bizNo}
          onChange={handleChange}
          required
        />
        <div className="flex gap-2">
          <TextField
            id="addr"
            name="addr"
            label="사업장 주소"
            value={form.addr}
            onChange={handleChange}
            readOnly
            required
            className="flex-grow"
          />
          <Button type="button" onClick={() => setIsModalOpen(true)} className="mt-auto">
            주소 검색
          </Button>
        </div>
        <TextField
          id="phone"
          name="phone"
          label="대표 번호"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          required
        />
        <div className="flex flex-col">
          <label htmlFor="category" className="text-sm font-medium text-gray-700 mb-2">
            주요 판매 카테고리
          </label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            className="w-full h-11 border border-gray-300 rounded-lg px-3"
          >
            <option value="">선택</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={loading} className="w-full mt-8">
          {loading ? '신청 중...' : '셀러 등록하기'}
        </Button>
      </form>

      <AddressSearchModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleAddressSelect}
      />
    </div>
  );
};

export default SellerApplyPage;