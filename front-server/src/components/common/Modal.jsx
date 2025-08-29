import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  maxWidth = "max-w-2xl" 
}) => {
  // ESC로 닫기 + body 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 배경 클릭으로 닫기 */}
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />

          {/* 모달 컨테이너 */}
          <motion.div
            className={`relative w-full ${maxWidth} rounded-2xl bg-white shadow-2xl p-6`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* 헤더 */}
            {title && (
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                <Button variant="signUp" size="sm" onClick={onClose}>
                  닫기
                </Button>
              </div>
            )}

            {/* 본문 */}
            <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden">
              {children}
            </div>

            {/* 푸터 */}
            {footer && (
              <div className="flex justify-end gap-2 border-t pt-3 mt-4">
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
