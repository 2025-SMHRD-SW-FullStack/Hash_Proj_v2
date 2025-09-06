import { NavLink } from "react-router-dom";
import Logo from '../../assets/images/Meonjeo_Logo.png';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-400 py-8 mt-auto text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 상단: 로고 + 주요 링크 */}
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-700 pb-6 mb-6">
          {/* 로고 */}
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <img src={Logo} alt="먼저써봄 로고" className="h-8 mx-auto md:mx-0" />
            <p className="text-xs mt-1">당신의 피드백으로 완성되는 제품</p>
          </div>

          {/* 링크 */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <NavLink to="/support/faq" className="text-white hover:text-gray-300 no-underline">
              FAQ
            </NavLink>
            <NavLink to="/support/qna" className="text-white hover:text-gray-300 no-underline">
              Q&A
            </NavLink>
            <NavLink to="/about" className="text-white hover:text-gray-300 no-underline">
              회사소개
            </NavLink>
            <NavLink to="/terms" className="text-white hover:text-gray-300 no-underline">
              이용약관
            </NavLink>
            <NavLink to="/privacy" className="text-white hover:text-gray-300 no-underline">
              개인정보처리방침
            </NavLink>
          </div>
        </div>

        {/* 하단: 회사 정보 */}
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
          <div className="text-center md:text-left mb-3 md:mb-0">
            <p><strong>Team Hash</strong> | 리더: 유준선</p>
            <p>
              <span>유준선</span> | <span>유은지</span> | <span>김형진</span> | <span>공소정</span>
            </p>
            {/* <p>
              문의:{" "}
              <a href="mailto:문의메일" className="hover:underline">
                나중에 추가하기
              </a>
            </p> */}
          </div>
          <p className="text-center md:text-right text-gray-400">
            © {new Date().getFullYear()} Meonjeosseobom. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
