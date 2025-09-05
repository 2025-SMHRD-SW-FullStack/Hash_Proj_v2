import React from 'react';
import { SectionContainer } from '../../../pages/user/myPage/MyInfoPage';
import Button from '../../common/Button';

const AddressSection = ({ primaryAddress, onManageAddress }) => {
  return (
    <SectionContainer title="주소록">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">기본 배송지</p>
        <Button variant="blackWhite" onClick={onManageAddress}>+ 배송지 관리</Button>
      </div>
      {primaryAddress ? (
        <div>
          <p className="font-semibold">
            {primaryAddress.receiver} <span className="text-gray-500 font-normal">({primaryAddress.phone})</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            ({primaryAddress.zipcode}) {primaryAddress.addr1} {primaryAddress.addr2}
          </p>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">등록된 배송지가 없습니다.</p>
      )}
    </SectionContainer>
  );
};

export default AddressSection;