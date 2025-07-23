import React, { useCallback, useEffect, useState } from "react";
import axiosInstance from "../../config/axiosInstance"; // ✅ axiosInstance 불러오기
import styles from "./UserInfo.module.css";

const UserInfo = () => {
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [isEdit, setIsEdit] = useState(false);

  // 회원 정보 불러오기
  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/api/users/me");
      
      const data = {
        nickname: res.data.nickname,
        name: res.data.name,
        email: res.data.email,
        birth: res.data.birth,
        phone: res.data.phone,
      };

      setForm(data);
      setOriginal(data);
    } catch (error) {
      console.error("회원 정보 불러오기 실패:", error);
    }
  }, []);

  // 첫 로딩 시 정보 가져오기
  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  // 입력값 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 수정 모드로 전환
  const handleEditToggle = () => {
    setIsEdit(true);
  };

  // 취소
  const handleCancel = () => {
    setForm(original);
    setIsEdit(false);
  };

  // 저장
  const handleSave = async () => {
    try {
      const requestData = {
        nickname: form.nickname,
        phone: form.phone,
        birth: form.birth,
        name: form.name,
        email: form.email,
      };

      await axiosInstance.put("/api/users/me", requestData);

      alert("회원 정보가 수정되었습니다.");
      setIsEdit(false);
      fetchUserInfo(); // 저장 후 최신 정보 불러오기
    } catch (error) {
      console.error("회원 정보 수정 실패:", error);
      alert("수정에 실패했습니다.");
    }
  };

  if (!form) return <div>Loading...</div>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>회원 정보</h2>
        {!isEdit && (
          <button className={styles.editBtn} onClick={handleEditToggle}>
            수정
          </button>
        )}
      </div>

      <InfoRow
        label="닉네임"
        value={form.nickname}
        name="nickname"
        isEdit={isEdit}
        onChange={handleChange}
      />
      <InfoRow
        label="이름"
        value={form.name}
        name="name"
        isEdit={isEdit}
        onChange={handleChange}
      />
      {/* <InfoRow
        label="이메일"
        value={form.email}
        name="email"
        isEdit={false}
      /> */}
      <InfoRow
        label="생년월일"
        value={form.birth}
        name="birth"
        isEdit={isEdit}
        onChange={handleChange}
      />
      <InfoRow
        label="휴대전화"
        value={form.phone}
        name="phone"
        isEdit={isEdit}
        onChange={handleChange}
      />

      {isEdit && (
        <div className={styles.buttonGroup}>
          <button className={styles.submitBtn} onClick={handleSave}>
            완료
          </button>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            취소
          </button>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value, name, isEdit, onChange }) => {
  return (
    <div className={styles.infoRow}>
      <span className={styles.label}>{label}</span>
      {isEdit && name !== "email" ? (
        <input
          name={name}
          value={value}
          onChange={onChange}
          className={styles.input}
        />
      ) : (
        <span className={styles.value}>{value}</span>
      )}
    </div>
  );
};

export default UserInfo;
