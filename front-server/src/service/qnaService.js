// src/service/qnaService.js
import axiosInstance from '../config/axiosInstance';

// QnA 관련 API 서비스
export const qnaService = {
  // 이미지 업로드
  uploadImage: async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await axiosInstance.post('/api/qna/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.imageUrl;
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    }
  },

  // 문의 등록
  createQna: async (qnaData) => {
    try {
      const response = await axiosInstance.post('/api/qna', qnaData);
      return response.data;
    } catch (error) {
      console.error('QnA 생성 실패:', error);
      throw error;
    }
  },

  // 내 문의 목록 조회
  getMyQnaList: async () => {
    try {
      const response = await axiosInstance.get('/api/me/qna');
      return response.data;
    } catch (error) {
      console.error('내 QnA 목록 조회 실패:', error);
      throw error;
    }
  },

  // 관리자용 문의 목록 조회
  getAdminQnaList: async (params = {}) => {
    try {
      const { status, searchTerm, page = 0, size = 20 } = params;
      const queryParams = new URLSearchParams();
      
      if (status) queryParams.append('status', status);
      if (searchTerm) queryParams.append('searchTerm', searchTerm);
      queryParams.append('page', page);
      queryParams.append('size', size);

      const response = await axiosInstance.get(`/api/admin/qna?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('관리자 QnA 목록 조회 실패:', error);
      throw error;
    }
  },

  // 관리자용 문의 상세 조회
  getAdminQnaDetail: async (qnaId) => {
    try {
      const response = await axiosInstance.get(`/api/admin/qna/${qnaId}`);
      return response.data;
    } catch (error) {
      console.error('관리자 QnA 상세 조회 실패:', error);
      throw error;
    }
  },

  // 답변 등록
  answerQna: async (qnaId, answerData) => {
    try {
      const response = await axiosInstance.post(`/api/admin/qna/${qnaId}/answer`, answerData);
      return response.data;
    } catch (error) {
      console.error('QnA 답변 등록 실패:', error);
      throw error;
    }
  },

  // 문의 상태 변경
  updateQnaStatus: async (qnaId, status) => {
    try {
      const response = await axiosInstance.patch(`/api/admin/qna/${qnaId}/status?status=${status}`);
      return response.data;
    } catch (error) {
      console.error('QnA 상태 변경 실패:', error);
      throw error;
    }
  }
};

// 기존 함수들 (하위 호환성 유지)
export const getMyQnaList = qnaService.getMyQnaList;
export const createQna = qnaService.createQna;
