import React from 'react';
import { SectionContainer, FormRow } from '../../../pages/user/myPage/MyInfoPage';
import Button from '../../common/Button';
import GoogleIcon from '../../../assets/images/google.png';
import NaverIcon from '../../../assets/images/naver.png';
import KakaoIcon from '../../../assets/images/kakao.png';

const SecuritySection = ({ user, handlePasswordReset }) => {
  return (
    <SectionContainer title="보안">
      <FormRow label="비밀번호">
        <Button variant="blackWhite" onClick={handlePasswordReset}>비밀번호 재설정</Button>
      </FormRow>
      <FormRow label="연결된 계정">
        {user?.provider && user.provider !== 'LOCAL' ? (
          <div className="flex items-center gap-2">
            <img src={user.provider === 'GOOGLE' ? GoogleIcon : user.provider === 'NAVER' ? NaverIcon : KakaoIcon} alt={user.provider} className="w-8 h-8"/>
            <span className="font-semibold">{user.provider.charAt(0) + user.provider.slice(1).toLowerCase()}</span>
          </div>
        ) : (<span>연결된 소셜 계정이 없습니다.</span>)}
      </FormRow>
    </SectionContainer>
  );
};

export default SecuritySection;