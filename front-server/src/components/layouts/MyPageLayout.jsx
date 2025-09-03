import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import { useState, useEffect } from "react";
import Button from "../common/Button";
import { getMyPointBalance } from "../../service/pointService";
import PersonIcon from "../../assets/icons/ic_person.svg";
import { Listbox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import PointIcon from '../../assets/icons/ic_point.svg'

const MyPageLayout = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navItems = [
    { to: "/user/mypage/orders", label: "주문/배송 내역" },
    { to: "/user/mypage/feedback-history", label: "작성한 피드백" },
    { to: "/user/mypage/edit", label: "내 정보 수정" },
    { to: "/user/mypage/cart", label: "장바구니" },
    { to: "/user/mypage/support/qna", label: "문의내역" },
    { to: "/user/mypage/seller-apply", label: "셀러 등록하기" },
  ];

  const [selected, setSelected] = useState(navItems[0]);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const balance = await getMyPointBalance(user.accessToken);
        setPoints(balance);
      } catch (err) {
        setError("포인트 조회 실패");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoints();
  }, [user]);

  const baseLinkStyle =
    "block w-full p-3 text-left text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors no-underline";
  const selectedLinkStyle = "bg-[#9FC5FB] text-white font-semibold";

  return (
    <div className="flex flex-col md:flex-row bg-gray-50 min-h-screen p-4 md:p-8 gap-4 md:gap-8">
      {/* 왼쪽 사이드바 */}
      <aside className="w-full md:w-1/5 flex-shrink-0">
        <div className="flex flex-col items-center p-4 border rounded-lg shadow bg-white">
          <img
            src={user?.profileImageUrl || PersonIcon}
            alt="프로필 사진"
            className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover mb-2 md:mb-4"
          />
          <strong className="text-base md:text-xl font-bold mb-1 md:mb-4">{user?.nickname}님</strong>

          <div className="flex items-center justify-center w-full p-2 rounded-lg text-centermb-3 space-x-2">
            <span className="text-sm text-gray-600">내 포인트</span>
            {loading ? (
              <span className="text-sm">조회 중...</span>
            ) : error ? (
              <span className="text-sm text-red-500">{error}</span>
            ) : (
              <span className="text-lg md:text-2xl font-bold flex items-center">
                {points.toLocaleString()}
                <span className="text-[#5882F6] font-bold ml-1">P</span>
              </span>
            )}
          </div>


          <Button
            className="w-full h-10 md:h-14 text-sm md:text-base"
            variant="blackWhite"
            onClick={() => navigate("/user/mypage/point-exchange")}
            leftIcon={<img src={PointIcon} alt="포인트 교환"/>}
          >
            포인트 교환하기
          </Button>
        </div>



        {/* 모바일 Listbox */}
        <div className="md:hidden mt-4">
          <Listbox value={selected} onChange={(val) => { setSelected(val); navigate(val.to); }}>
            <div className="relative">
              <Listbox.Button className="relative w-full cursor-pointer bg-white border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500">
                <span className="block truncate">{selected.label}</span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </Listbox.Button>

              <Listbox.Options className="absolute mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto z-10">
                {navItems.map((item) => (
                  <Listbox.Option
                    key={item.to}
                    value={item}
                    className={({ active, selected }) =>
                      `cursor-pointer select-none relative py-2 pl-4 pr-10 ${
                        selected ? "bg-[#9FC5FB] text-white font-semibold" :
                        active ? "bg-blue-100 text-blue-900" : "text-gray-700"
                      }`
                    }
                  >
                    {({ selected: isSelected }) => (
                      <>
                        <span className={`block truncate ${isSelected ? "font-semibold" : "font-normal"}`}>
                          {item.label}
                        </span>
                        {isSelected && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-white">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        {/* 데스크탑 nav */}
        <nav className="hidden md:block mt-4">
          <ul className="space-y-2 p-0 list-none">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `${baseLinkStyle} ${isActive ? selectedLinkStyle : ""}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* 오른쪽 콘텐츠 영역 */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default MyPageLayout;
