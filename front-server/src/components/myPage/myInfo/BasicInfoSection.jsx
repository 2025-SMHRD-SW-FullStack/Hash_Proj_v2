import React from 'react';
import { SectionContainer, FormRow, inputStyle, readOnlyInputStyle } from '../../../pages/user/myPage/MyInfoPage';
import Button from '../../common/Button';
import PersonIcon from '../../../assets/icons/ic_person.png';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

// 날짜 포맷 유틸
const ymd = (d) => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const BasicInfoSection = ({
  isEditing,
  isProfileEditable,
  user,
  profileImageUrl,
  uploading,
  fileInputRef,
  handleImageChange,
  nickname,
  setNickname,
  phoneParts,
  handlePhonePartChange,
  phoneInput2,
  phoneInput3,
  isPhoneEditable,
  phoneVerifyToken,
  setIsPhoneEditable,
  otp,
  setOtp,
  leftSec,
  handleSendCode,
  isSending,
  handleVerifyCode,
  isVerifying,
  infoMsg,
  phoneError,
  gender,
  setGender,
  birthDate,
  setBirthDate,
  isDatePickerOpen,
  setIsDatePickerOpen,
  datePickerRef,
  handleSave,
  handleCancel,
}) => {
  return (
    <SectionContainer title="기본 정보">
      <FormRow label="프로필 사진">
        <div className="flex items-center space-x-4">
          <img
            src={profileImageUrl || PersonIcon}
            alt="프로필"
            className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
            onError={(e) => { e.target.onerror = null; e.target.src = PersonIcon; }}
          />
          {isEditing && (
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              <Button variant="blackWhite" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? '업로드중...' : '이미지 변경'}
              </Button>
            </div>
          )}
        </div>
      </FormRow>
      <FormRow label="아이디(이메일)">
        <input type="text" value={user?.email || ''} readOnly disabled className={readOnlyInputStyle} />
      </FormRow>
      <FormRow label="닉네임">
        {isEditing ? (
          <input id="nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputStyle} />
        ) : (
          <div className="h-11 flex items-center px-3">{nickname}</div>
        )}
      </FormRow>
      <FormRow label="전화번호">
        <div className="flex items-center gap-2">
          <input type="tel" maxLength="3" value={phoneParts.part1} onChange={handlePhonePartChange('part1', 3, phoneInput2)} readOnly={!isPhoneEditable || !isEditing} className={`${inputStyle} text-center ${!isPhoneEditable || !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
          <span>-</span>
          <input type="tel" maxLength="4" ref={phoneInput2} value={phoneParts.part2} onChange={handlePhonePartChange('part2', 4, phoneInput3)} readOnly={!isPhoneEditable || !isEditing} className={`${inputStyle} text-center ${!isPhoneEditable || !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
          <span>-</span>
          <input type="tel" maxLength="4" ref={phoneInput3} value={phoneParts.part3} onChange={handlePhonePartChange('part3', 4, null)} readOnly={!isPhoneEditable || !isEditing} className={`${inputStyle} text-center ${!isPhoneEditable || !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
          {isEditing && !phoneVerifyToken && (
            <Button variant="blackWhite" onClick={() => setIsPhoneEditable(true)} disabled={isPhoneEditable} className="flex-shrink-0">
              변경
            </Button>
          )}
        </div>
      </FormRow>
      {isEditing && isPhoneEditable && (
        <FormRow label="인증번호">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <input type="text" placeholder="인증번호 6자리" value={otp} onChange={(e) => setOtp(e.target.value)} className={inputStyle} maxLength="6" />
                {leftSec > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-500 font-semibold">
                    {`${Math.floor(leftSec / 60)}:${(leftSec % 60).toString().padStart(2, '0')}`}
                  </span>
                )}
              </div>
              <Button onClick={handleSendCode} disabled={isSending || leftSec > 0} className="flex-shrink-0">
                {isSending ? '전송 중...' : '인증번호 받기'}
              </Button>
            </div>
            <Button onClick={handleVerifyCode} disabled={isVerifying || !otp} className="w-full">
              {isVerifying ? '확인 중...' : '인증번호 확인'}
            </Button>
            {(infoMsg || phoneError) && (
              <p className={`text-xs mt-1 ${phoneError ? 'text-red-500' : 'text-green-600'}`}>
                {phoneError || infoMsg}
              </p>
            )}
          </div>
        </FormRow>
      )}
      <FormRow label="성별">
        {isEditing && isProfileEditable ? (
          <div className="flex items-center gap-6 h-11">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="gender" value="M" checked={gender === 'M'} onChange={(e) => setGender(e.target.value)} className="w-5 h-5" />
              남성
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="gender" value="F" checked={gender === 'F'} onChange={(e) => setGender(e.target.value)} className="w-5 h-5" />
              여성
            </label>
          </div>
        ) : (
          <div className="h-11 flex items-center px-3">{user?.gender === 'M' ? '남성' : user?.gender === 'F' ? '여성' : '선택 안함'}</div>
        )}
      </FormRow>
      <FormRow label="생년월일">
        {isEditing && isProfileEditable ? (
          <div className="relative" ref={datePickerRef}>
            <input type="text" value={birthDate} readOnly onClick={() => setIsDatePickerOpen(prev => !prev)} className={`${inputStyle} cursor-pointer`} placeholder="YYYY-MM-DD" />
            {isDatePickerOpen && (
              <div className="absolute top-full mt-2 z-10 bg-white border rounded-lg shadow-lg">
                <DayPicker mode="single" selected={birthDate ? new Date(birthDate) : undefined} onSelect={(date) => { if (date) { setBirthDate(ymd(date)); } setIsDatePickerOpen(false); }} captionLayout="dropdown" fromYear={1950} toYear={new Date().getFullYear()} />
              </div>
            )}
          </div>
        ) : (
          <div className="h-11 flex items-center px-3">{user?.birthDate || '입력 안함'}</div>
        )}
      </FormRow>
      <div className="flex justify-end gap-2 pt-4 border-t mt-6">
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>수정하기</Button>
        ) : (
          <>
            <Button variant="blackWhite" onClick={handleCancel}>취소</Button>
            <Button onClick={handleSave}>저장하기</Button>
          </>
        )}
      </div>
    </SectionContainer>
  );
};

export default BasicInfoSection;