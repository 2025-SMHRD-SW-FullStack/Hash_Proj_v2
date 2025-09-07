import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../../../components/common/TextField';
import Button from '../../../components/common/Button';
import AddressSearchModal from '../../../components/address/AddressSearchModal';
import { applySeller, getSellerStatus } from '../../../service/sellerService';
import { CATEGORIES } from '../../../constants/products';

// 승인 대기 상태를 표시하는 컴포넌트
const SellerPending = () => (
  <div className="flex flex-col items-center justify-center min-h-[750px] max-w-3xl mx-auto px-8 bg-white rounded-xl shadow-md text-center">
    <span className="text-2xl font-bold mb-4 text-primary">신청 완료</span>
    <span className="text-gray-600">셀러 등록 신청이 정상적으로 접수되었습니다.</span>
    <span className="text-gray-600 mt-2">관리자 승인을 기다려주세요.</span>
    {/* <Button onClick={() => window.location.reload()} className="mt-6">새로고침</Button> */}
  </div>
);

// 승인된 셀러 정보를 표시하는 컴포넌트
// 승인된 셀러 정보를 표시하는 개선된 컴포넌트
const SellerProfileView = ({ profile }) => (
  // 전체 컨테이너를 더 넓게 만들고, 그림자와 패딩을 조정하여 입체감을 줍니다.
  <div className="w-full max-w-5xl mx-auto min-h-[500px] bg-white rounded-2xl shadow-lg p-8 md:p-12 flex flex-col">
    <div className="text-center mb-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">셀러 프로필</h2>
    </div>
    
    <hr className="mb-10" />

    {/* 프로필 정보를 2단 그리드로 표시하여 가독성을 높입니다. */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 text-lg">
      
      {/* 각 정보 항목에 아이콘을 추가하여 시각적 구분을 줍니다. */}
      <div className="flex items-start gap-4">
        <span className="mt-1">🛍️</span>
        <div>
          <p className="text-sm font-semibold text-primary">상호명</p>
          <p className="text-gray-800 font-medium">{profile.shopName}</p>
        </div>
      </div>
      
      <div className="flex items-start gap-4">
        <span className="mt-1">👤</span>
        <div>
          <p className="text-sm font-semibold text-primary">대표자명</p>
          <p className="text-gray-800 font-medium">{profile.ownerName}</p>
        </div>
      </div>
      
      <div className="flex items-start gap-4">
        <span className="mt-1">📄</span>
        <div>
          <p className="text-sm font-semibold text-primary">사업자 등록번호</p>
          <p className="text-gray-800 font-medium">{profile.bizNo}</p>
        </div>
      </div>
      
      <div className="flex items-start gap-4">
        <span className="mt-1">📞</span>
        <div>
          <p className="text-sm font-semibold text-primary">대표 번호</p>
          <p className="text-gray-800 font-medium">{profile.phone}</p>
        </div>
      </div>
      
       {/* 주소처럼 긴 텍스트는 한 줄을 모두 사용하도록 설정 (md:col-span-2) */}
      <div className="flex items-start gap-4 md:col-span-2">
        <span className="mt-1">📍</span>
        <div>
          <p className="text-sm font-semibold text-primary">사업장 주소</p>
          <p className="text-gray-800 font-medium">{profile.addr}</p>
        </div>
      </div>

      <div className="flex items-start gap-4 md:col-span-2">
        <span className="mt-1">🛒</span>
        <div>
          <p className="text-sm font-semibold text-primary">주요 판매 카테고리</p>
          <p className="text-gray-800 font-medium">{profile.category}</p>
        </div>
      </div>

    </div>
  </div>
);
{/* <div className="mt-8 text-center">
    <Button onClick={onEdit}>수정하기</Button>
</div> */}


// 셀러 등록 신청 폼 컴포넌트
const SellerApplyForm = ({ onApplySuccess }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bizNo: '',
    shopName: '',
    ownerName: '',
    zipcode: '', // 우편번호
    addr1: '',   // 기본 주소
    addr2: '',   // 상세 주소
    category: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleAddressSelect = ({ addr1, zipcode }) => {
    setForm(prev => ({ ...prev, addr1, zipcode, addr2: '' }));
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    const { addr2, ...requiredFields } = form;
    if (!Object.values(requiredFields).every(field => String(field).trim())) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        addr: `${form.addr1} ${form.addr2}`.trim()
      };
      await applySeller(payload);
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
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md">
      <div className='flex sm:flex-col items-center justify-center gap-2 mb-4'>
        <h2 className="hidden md:block text-lg md:text-xl font-bold text-gray-800">셀러 등록 신청</h2>
        <div className="flex flex-col sm:flex-row sm:gap-1 mb-4 text-center text-primary/80 ">
          <span>먼저써봄과 함께</span>
          <span>피드백으로 빛나는 상품을 만들어보세요.</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-10 ">
        <TextField id="shopName" name="shopName" label="상호명" value={form.shopName} onChange={handleChange} required />
        <TextField id="ownerName" name="ownerName" label="대표자명" value={form.ownerName} onChange={handleChange} required />
        <TextField id="bizNo" name="bizNo" label="사업자 등록번호" value={form.bizNo} onChange={handleChange} required />
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">사업장 주소 *</label>
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <TextField 
              id="zipcode" 
              name="zipcode" 
              label="" 
              value={form.zipcode} 
              readOnly 
              placeholder="우편번호"
            />
            <Button type="button" onClick={() => setIsModalOpen(true)}>
              주소 검색
            </Button>
          </div>
          <TextField id="addr1" name="addr1" label="" value={form.addr1} readOnly placeholder="주소"/>
          <TextField 
            id="addr2" 
            name="addr2" 
            label="" 
            value={form.addr2} 
            onChange={handleChange} 
            placeholder="상세주소"
          />
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