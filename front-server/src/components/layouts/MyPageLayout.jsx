import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import { useState, useEffect } from "react";
import Button from "../common/Button";
import { getMyPointBalance } from "../../service/pointService";
import PersonIcon from "../../assets/icons/ic_person.png";
import PointIcon from '../../assets/icons/ic_point.svg'
import CategorySelect from "../common/CategorySelect";

const MyPageLayout = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation(); 
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navItems = [
    { to: "/user/mypage/orders", label: "주문/배송 내역" },
    { to: "/user/mypage/feedback-history", label: "작성한 피드백" },
    { to: "/user/mypage/edit", label: "내 정보 수정" },
    { to: "/user/mypage/cart", label: "장바구니" },
    { to: "/user/mypage/support/qna", label: "문의 내역" },
    { to: "/user/mypage/seller-apply", label: "셀러 등록하기" },
  ];
  
  const [selectedNav, setSelectedNav] = useState(
    () => navItems.find(item => location.pathname.startsWith(item.to)) || navItems[0]
  );

  useEffect(() => {
    const currentNavItem = navItems.find(item => location.pathname.startsWith(item.to));
    if (currentNavItem) {
      setSelectedNav(currentNavItem);
    }
  }, [location.pathname]);


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
  
  const categorySelectItems = navItems.map(item => ({
    value: item.to,
    label: item.label,
  }));

  const handleCategoryChange = (selected) => {
    navigate(selected.value);
  };
  
  const selectedCategory = categorySelectItems.find(item => item.value === selectedNav.to);

  return (
    <div className="flex h-full flex-col md:flex-row bg-gray-50 p-4 md:p-8 md:gap-8">
      {/* 왼쪽 사이드바 */}
      <aside className="w-full md:w-1/5 flex-shrink-0 md:sticky md:top-8 md:self-start">
        <div className="flex flex-col p-4 border rounded-lg shadow bg-white">
          {/* 프로필 이미지와 닉네임 */}
          <div className="flex items-center w-full md:flex-col">
            <img
              src={user?.profileImageUrl || PersonIcon}
              alt="프로필 사진"
              className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover mr-4 md:mr-0 md:mb-4"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = PersonIcon;
              }}
            />
            <strong className="text-base md:text-xl font-bold md:mb-4">{user?.nickname}님</strong>
          </div>

          {/* 포인트와 교환 버튼 */}
          <div className="w-full flex flex-row items-center justify-between mt-4 md:mt-0 md:border-t md:pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">내 포인트</span>
              {loading ? (
                <span className="text-sm">...</span>
              ) : error ? (
                <span className="text-sm text-red-500">오류</span>
              ) : (
                <span className="font-bold text-lg">
                  {points.toLocaleString()}
                  <span className="text-primary font-bold ml-1">P</span>
                </span>
              )}
            </div>
            <Button
              variant="blackWhite"
              size="lg"
              onClick={() => navigate("/user/mypage/point-exchange")}
              leftIcon={<img src={PointIcon} alt="포인트 아이콘" className="h-6" />}
            >
              포인트 교환하기
            </Button>
          </div>
        </div>

        {/* 모바일 카테고리 선택바 */}
        <div className="md:hidden my-4">
            <CategorySelect
              categories={categorySelectItems}
              selected={selectedCategory}
              onChange={handleCategoryChange}
              className="max-w-none"
            />
        </div>

        {/* 데스크탑 nav */}
        <nav className="hidden md:block mt-4">
          <ul className="space-y-2 p-0 list-none">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/user/mypage/orders'}
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
        <div className='min-h-[750px] mx-auto w-full max-w-7xl lg:px-8'>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MyPageLayout;