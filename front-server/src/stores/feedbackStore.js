import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useFeedbackStore = create(
  persist(
    (set) => ({
      // productId를 키로 사용하는 객체
      feedbacksByProduct: {},

      // 피드백 추가 액션
      addFeedback: (productId, feedback) => {
        set((state) => ({
          feedbacksByProduct: {
            ...state.feedbacksByProduct,
            [productId]: [...(state.feedbacksByProduct[productId] || []), feedback],
          },
        }));
      },
    }),
    {
      name: 'feedback-storage', // localStorage에 저장될 키
    }
  )
);

export default useFeedbackStore;