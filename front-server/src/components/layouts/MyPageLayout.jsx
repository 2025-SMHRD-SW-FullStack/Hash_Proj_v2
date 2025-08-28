import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { useState, useEffect } from 'react';
import Button from '../common/Button';
import { getMyPointBalance } from '../../service/pointService';
import Icon from '../common/Icon';
import arrowDown from '../../assets/icons/ic_arrow_down.svg';

const MyPageLayout = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);

  // 🔽 포인트 조회 로직
  useEffect(() => {
    const fetchPoints = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const balance = await getMyPointBalance(user.accessToken);
        setPoints(balance);
      } catch (err) {
        setError('포인트 조회 실패');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoints();
  }, [user]);

  // 🔽 NavLink 스타일 정의 (변수명 개선)
  const baseLinkStyle =
  'block w-full p-4 text-left text-base text-gray-600 rounded-lg hover:bg-gray-100 transition-colors';
  const selectedLinkStyle = 'bg-[#E4F5FA] text-[#35A6CF] font-bold';
  const subLinkStyle =
    'block w-full py-2 px-8 text-left text-sm text-gray-500 rounded-lg hover:bg-gray-100 transition-colors';

  return (
    <div className="flex p-8 gap-8">
      {/* 왼쪽 사이드바 */}
      <aside className="w-1/5 flex-shrink-0">
        <div className="flex flex-col items-center p-4 border rounded-lg shadow">
          <img
            src={user?.profileImageUrl || 'https://via.placeholder.com/150'}
            alt="프로필 사진"
            className="w-24 h-24 rounded-full object-cover mb-4"
          />
          <strong className="text-xl font-bold mb-4">
            {user?.nickname}님
          </strong>

          <div className="flex items-center justify-center w-full p-3 rounded-lg text-center">
            <h4 className="text-sm text-gray-600">내 포인트 &ensp;</h4>
            {loading ? (
              <p>조회 중...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <div className="text-2xl font-bold ">
                {points.toLocaleString()}
                <span className="text-[#35A6CF]">P</span>
              </div>
            )}
          </div>

          <Button className="w-full h-14 text-base" variant="whiteBlack">
            포인트 교환하기
          </Button>
        </div>

        {/* --- 내비게이션 메뉴 --- */}
        <nav className="mt-6">
          <ul className="space-y-2 p-0 list-none">
            <li>
              <NavLink
                to="/user/mypage/orders"
                end
                className={({ isActive }) =>
                  `${baseLinkStyle} ${
                    isActive ? selectedLinkStyle : ''
                  } no-underline`
                }
              >
                주문/배송 내역
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/user/mypage/feedback"
                end
                className={({ isActive }) =>
                  `${baseLinkStyle} ${
                    isActive ? selectedLinkStyle : ''
                  } no-underline`
                }
              >
                작성한 피드백
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/user/mypage/edit"
                end
                className={({ isActive }) =>
                  `${baseLinkStyle} ${
                    isActive ? selectedLinkStyle : ''
                  } no-underline`
                }
              >
                내 정보 수정
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/user/mypage/cart"
                end
                className={({ isActive }) =>
                  `${baseLinkStyle} ${
                    isActive ? selectedLinkStyle : ''
                  } no-underline`
                }
              >
                장바구니
              </NavLink>
            </li>
            <li>
              <button
                onClick={() => setIsSupportMenuOpen(!isSupportMenuOpen)}
                className={`
                  ${baseLinkStyle} no-underline bg-white border-none 
                  ${isSupportMenuOpen ? selectedLinkStyle : ''}
                `}
              >
                고객센터
              </button>

              {/* ▼ 서브메뉴 */}
              <div
                className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${isSupportMenuOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}
              `}
              >
                <div className="pl-4 pt-1">
                  <ul className="space-y-1 list-none p-0">
                    <li>
                      <NavLink
                        to="/user/mypage/support/faq"
                        className={({ isActive }) =>
                          `${subLinkStyle} ${
                            isActive ? selectedLinkStyle : ''
                          } no-underline`
                        }
                      >
                        FAQ
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/user/mypage/support/qna"
                        className={({ isActive }) =>
                          `${subLinkStyle} ${
                            isActive ? selectedLinkStyle : ''
                          } no-underline`
                        }
                      >
                        Q&A
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/user/mypage/seller-apply"
                        className={({ isActive }) =>
                          `${subLinkStyle} ${
                            isActive ? selectedLinkStyle : ''
                          } no-underline`
                        }
                      >
                        셀러 신청하기
                      </NavLink>
                    </li>
                  </ul>
                </div>
              </div>
            </li>
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
