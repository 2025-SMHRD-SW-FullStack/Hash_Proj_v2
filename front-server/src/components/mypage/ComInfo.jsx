import React, { useCallback, useEffect, useState } from "react";
import axiosInstance from "../../config/axiosInstance";
// import styles from "./UserInfo.module.css";
import styles from "./ComInfo.module.css";

const ComInfo = () => {
  // 초기값을 null이 아닌 빈 값으로 설정해 렌더링 에러 방지
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [isEdit, setIsEdit] = useState(false);

  const fetchComInfo = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/api/company/me");
      console.log("회사 정보 : ", res.data);
      const data = {
        name: res.data.name ?? "",
        ceoName: res.data.ceoName ?? "",
        businessNumber: res.data.businessNumber ?? "",
        industry: res.data.industry ?? "",
        address: res.data.address ?? "",
      };
      
      setForm(data);
      setOriginal(data);

    } catch (error) {
      console.warn("💡회사 정보가 없거나 오류 발생. 빈 값으로 초기화");
      // 💡빈 값으로 초기화해서 UI 렌더링 오류 방지
      const emptyData = {
        name: "",
        ceoName: "",
        businessNumber: "",
        industry: "",
        address: "",
      };
      setForm(emptyData);
      setOriginal(emptyData);
    }
  }, []);

  useEffect(() => {
    fetchComInfo();
  }, [fetchComInfo]);

  const handleEditToggle = () => {
    setIsEdit(true);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleCancel = () => {
    setForm(original);
    setIsEdit(false);
  };

  const handleSave = async () => {
    try {
      const requestData = {
        name: form.name,
        ceoName: form.ceoName,
        businessNumber: form.businessNumber,
        industry: form.industry,
        address: form.address,
      };

      await axiosInstance.put("/api/company/me", requestData);
      alert("회사 정보가 수정되었습니다.");
      setIsEdit(false);
      fetchComInfo();
    } catch (error) {
      console.error("회사 정보 수정 실패:", error);
      alert("수정에 실패했습니다.");
    }
  };

  if (!form) return <div>Loading...</div>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>회사 정보</h2>
        {!isEdit && (
          <button className={styles.editBtn} onClick={handleEditToggle}>
            수정
          </button>
        )}
      </div>
        
      <InfoRow
        label="회사명"
        value={form.name}
        name="name"
        isEdit={isEdit}
        onChange={handleChange}
      />
      <InfoRow
        label="대표자명"
        value={form.ceoName}
        name="ceoName"
        isEdit={isEdit}
        onChange={handleChange}
      />
      <InfoRow
        label="사업자등록번호"
        value={form.businessNumber}
        name="businessNumber"
        isEdit={isEdit}
        onChange={handleChange}
      />
      <InfoRow
        label="업종"
        value={form.industry}
        name="industry"
        isEdit={isEdit}
        onChange={handleChange}
      />
      <InfoRow
        label="회사주소"
        value={form.address}
        name="address"
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
      {isEdit ? (
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

export default ComInfo;
