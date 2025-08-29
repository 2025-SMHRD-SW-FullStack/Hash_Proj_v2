// src/components/common/Modal.jsx
import { motion, AnimatePresence } from "framer-motion";

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 모달 컨테이너 */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>

            {/* 제목 */}
            {title && (
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">
                {title}
              </h2>
            )}

            {/* 내용 */}
            <div className="mb-4">{children}</div>

            {/* 푸터 영역 (예: 확인 / 취소 버튼) */}
            {footer && (
              <div className="flex justify-end gap-2 border-t pt-3">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
