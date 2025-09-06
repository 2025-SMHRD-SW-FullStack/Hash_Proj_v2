import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../../../components/common/TextField';
import Button from '../../../components/common/Button';
import AddressSearchModal from '../../../components/address/AddressSearchModal';
import { applySeller, getSellerStatus } from '../../../service/sellerService';
import { CATEGORIES } from '../../../constants/products';

// 승인 대기 상태를 표시하는 컴포넌트
const SellerPending = () => (
  <div className="max-w-xl mx-auto px-8 bg-white rounded-xl shadow-md text-center">
    <h2 className="text-2xl font-bold mb-4">신청 완료</h2>
    <p className="text-gray-600">셀러 등록 신청이 정상적으로 접수되었습니다.</p>
    <p className="text-gray-600 mt-2">관리자 승인을 기다려주세요.</p>
    {/* <Button onClick={() => window.location.reload()} className="mt-6">새로고침</Button> */}
  </div>
);

// 승인된 셀러 정보를 표시하는 컴포넌트
const SellerProfileView = ({ profile, onEdit }) => (
    <div className="max-w-xl mx-auto px-8 bg-white rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">셀러 프로필</h2>
        <div className="space-y-4">
            <TextField id="shopName" name="shopName" label="상호명" value={profile.shopName} readOnly />
            <TextField id="ownerName" name="ownerName" label="대표자명" value={profile.ownerName} readOnly />
            <TextField id="bizNo" name="bizNo" label="사업자 등록번호" value={profile.bizNo} readOnly />
            <TextField id="addr" name="addr" label="사업장 주소" value={profile.addr} readOnly />
            <TextField id="phone" name="phone" label="대표 번호" type="tel" value={profile.phone} readOnly />
            <TextField id="category" name="category" label="주요 판매 카테고리" value={profile.category} readOnly />
        </div>
        {/* <div className="mt-8 text-center">
            <Button onClick={onEdit}>수정하기</Button>
        </div> */}
    </div>
);


// 셀러 등록 신청 폼 컴포넌트
const SellerApplyForm = ({ onApplySuccess }) => {
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
      await applySeller(form);
      alert('셀러 신청이 완료되었습니다.');
      onApplySuccess(); // 성공 콜백 호출
    } catch (error) {
      alert('신청 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="hidden md:block text-lg md:text-xl font-bold mb-4 text-gray-800">셀러 등록 신청</h2>
      
      
      <div className="mx-auto p-6 bg-white rounded-xl shadow-md">
        <p className="text-center text-gray-600 mb-8">
        먼저써봄과 함께 피드백으로 빛나는 상품을 만들어보세요.
      </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField id="shopName" name="shopName" label="상호명" value={form.shopName} onChange={handleChange} required />
          <TextField id="ownerName" name="ownerName" label="대표자명" value={form.ownerName} onChange={handleChange} required />
          <TextField id="bizNo" name="bizNo" label="사업자 등록번호" value={form.bizNo} onChange={handleChange} required />
          <div className="flex gap-2">
            <TextField id="addr" name="addr" label="사업장 주소" value={form.addr} onChange={handleChange} readOnly required className="flex-grow" />
            <Button type="button" onClick={() => setIsModalOpen(true)} className="mt-auto">
              주소 검색
            </Button>
          </div>
          <TextField id="phone" name="phone" label="대표 번호" type="tel" value={form.phone} onChange={handleChange} required />
          <div className="flex flex-col">
            <label htmlFor="category" className="text-sm font-medium text-gray-700 mb-2">
              주요 판매 카테고리
            </label>
            <select id="category" name="category" value={form.category} onChange={handleChange} required className="w-full h-11 border border-gray-300 rounded-lg px-3">
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
    </div>
  );
};

// 메인 페이지 컴포넌트
const SellerApplyPage = () => {
    const [status, setStatus] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const data = await getSellerStatus();
            if (data) {
                setStatus(data.status);
                setProfile(data);
            } else {
                setStatus(null); // 신청 내역 없음
            }
        } catch (error) {
            console.error("셀러 상태 조회 실패:", error);
            setStatus(null); // 에러 발생 시에도 신청 폼을 보여주도록 처리
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    if (loading) {
        return <div className="text-center p-10">정보를 불러오는 중...</div>;
    }
    
    // 상태에 따라 다른 컴포넌트를 렌더링
    if (status === 'APPROVED') {
        return <SellerProfileView profile={profile} onEdit={() => {
            // TODO: 수정 폼 로직 구현
            alert('수정 기능은 아직 구현되지 않았습니다.');
        }} />;
    } else if (status === 'PENDING') {
        return <SellerPending />;
    } else { // status가 null (신청 전) 또는 'REJECTED' (반려)
        return <SellerApplyForm onApplySuccess={fetchStatus} />;
    }
};

export default SellerApplyPage;