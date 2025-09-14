import React, { useState, useMemo, useEffect, useRef } from 'react';
import MainProducts from '../components/mainPage/MainProducts';
import Button from '../components/common/Button';
import arrowLeft from '../assets/icons/ic_arrow_left.svg';
import arrowRight from '../assets/icons/ic_arrow_right.svg';
import Icon from '../components/common/Icon.jsx';
import useWindowWidth from '../hooks/useWindowWidth';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { getMyPointBalance } from '../service/pointService';
import { getActiveAds } from '../service/adsService';
import { AD_SLOT_TYPES } from '../constants/ads';
import PointIcon from '../assets/icons/ic_point.svg'
import PersonIcon from '../assets/icons/ic_person.png'

const MainPage = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const width = useWindowWidth();
  const intervalRef = useRef(null);
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuthStore();
  const [points, setPoints] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [errorPoints, setErrorPoints] = useState(null);

  const [rollingBanners, setRollingBanners] = useState([]);
  const [sideBanners, setSideBanners] = useState([]);
  const [loadingAds, setLoadingAds] = useState(true);

  const isMobile = width < 640;
  const itemsPerPage = isMobile ? 1 : 3;

  useEffect(() => {
    const fetchAds = async () => {
      setLoadingAds(true);
      try {
        const [rollingData, sideData] = await Promise.all([
          getActiveAds(AD_SLOT_TYPES.MAIN_ROLLING),
          getActiveAds(AD_SLOT_TYPES.MAIN_SIDE),
        ]);
        setRollingBanners(rollingData);
        setSideBanners(sideData);
      } catch (error) {
        console.error("광고 데이터를 불러오는 데 실패했습니다.", error);
      } finally {
        setLoadingAds(false);
      }
    };
    fetchAds();
  }, []);
  
  const extendedItems = useMemo(() => {
    if (rollingBanners.length === 0) return [];
    const headClones = rollingBanners.slice(0, itemsPerPage);
    const tailClones = rollingBanners.slice(-itemsPerPage);
    return [...tailClones, ...rollingBanners, ...headClones];
  }, [rollingBanners, itemsPerPage]);

  useEffect(() => {
    // 자동 슬라이드 인터벌 설정
    intervalRef.current = setInterval(() => {
      if (!isTransitioning) setCurrentIndex(prev => prev + 1);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [isTransitioning]);

  useEffect(() => {
    // 페이지당 아이템 수가 바뀔 때 슬라이드 초기화
    setEnableTransition(false);
    setCurrentIndex(itemsPerPage);
    const id = requestAnimationFrame(() => {
      setEnableTransition(true);
      setIsTransitioning(false);
    });
    return () => cancelAnimationFrame(id);
  }, [itemsPerPage]);

  // 포인트 조회
  useEffect(() => {
    const fetchPoints = async () => {
      if (isLoggedIn) {
        try {
          setLoadingPoints(true);
          const balance = await getMyPointBalance();
          setPoints(balance);
        } catch (err) {
          setErrorPoints('포인트 조회 실패');
        } finally {
          setLoadingPoints(false);
        }
      }
    };
    fetchPoints();
  }, [isLoggedIn]);

  const handlePrev = () => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev - 1);
    }
  };
  const handleNext = () => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleTransitionEnd = () => {
    setIsTransitioning(false);
    if (currentIndex >= itemsPerPage + rollingBanners.length) {
      setEnableTransition(false);
      setCurrentIndex(itemsPerPage);
      setTimeout(() => setEnableTransition(true), 50);
      return;
    }
    if (currentIndex < itemsPerPage) {
      setEnableTransition(false);
      setCurrentIndex(itemsPerPage + rollingBanners.length - 1);
      setTimeout(() => setEnableTransition(true), 50);
    }
  };

  // ✅ 광고 배너 클릭 핸들러
  const handleBannerClick = (banner) => {
    // house 광고가 아니고 productId가 있으면 상품 상세 페이지로 이동
    if (!banner.house && banner.productId) {
      navigate(`/product/${banner.productId}`);
    }
    // 하우스 광고이거나 productId가 없으면 아무 동작 안 함
  };

  return (
    <div className="flex gap-6 flex-col sm:flex-row py-6 px-4">
      <section className="min-w-0 flex-1">
        {/* 배너 */}
        <div className="mb-6 flex items-center">
          {!isMobile && (
            <Icon src={arrowLeft} alt="왼쪽 이동" className="cursor-pointer" onClick={handlePrev} />
          )}
          <div className="w-full flex-1 overflow-hidden">
            <div
              className={`flex ${enableTransition ? 'transition-transform duration-700 ease-in-out' : ''}`}
              style={{
                width: `${(100 / itemsPerPage) * extendedItems.length}%`,
                transform: `translateX(-${(currentIndex * 100) / extendedItems.length}%)`,
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {/* ✅ 실제 광고 데이터로 배너 렌더링 */}
              {extendedItems.map((banner, idx) => (
                <div
                  key={`${banner.slotId}-${idx}`}
                  className="px-2"
                  style={{ width: `${100 / extendedItems.length}%` }}
                >
                  <div
                    onClick={() => handleBannerClick(banner)}
                    className="rounded-lg flex items-center justify-center text-base sm:text-lg font-semibold h-[180px] sm:h-[250px] w-full bg-gray-100 overflow-hidden"
                    style={{ cursor: !banner.house && banner.productId ? 'pointer' : 'default' }}
                  >
                    {/* bannerImageUrl이 있으면 이미지로, 없으면 텍스트로 표시 */}
                    {banner.bannerImageUrl ? (
                      <img src={banner.bannerImageUrl} alt={`광고 배너 ${banner.position}`} className="w-full h-full object-cover" />
                    ) : (
                      `배너 ${banner.position}`
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!isMobile && (
            <Icon src={arrowRight} alt="오른쪽 이동" className="cursor-pointer" onClick={handleNext} />
          )}
        </div>

        {/* 전체 상품 CTA */}
        <div className="mb-6 text-center">
          <Button
            size="lg"
            className="px-4 py-2 sm:px-8 sm:py-3 text-sm sm:text-base bg-black text-white rounded-xl"
            onClick={() => navigate('/products')}
          >
            전체 상품 보러가기
          </Button>
        </div>

        {/* 카테고리별 상품 */}
        <div className="space-y-16 max-w-6xl mx-auto">
          <MainProducts label="⚙ 전자제품" category="전자제품" limit={isMobile ? 3 : undefined} />
          <MainProducts label="💄 화장품" category="화장품" limit={isMobile ? 3 : undefined} />
          <MainProducts label="🍱 밀키트" category="밀키트" limit={isMobile ? 3 : undefined} />
          <MainProducts label="💡 무형자산" category="무형자산" limit={isMobile ? 3 : undefined} />
        </div>
      </section>

      {/* 사이드 영역 */}
      <aside className="hidden w-1/5 flex-shrink-0 sm:block space-y-4 sm:sticky sm:top-8 sm:self-start">
        <div className="h-[250px] border-[#CCC] border-solid border-[1px] mb-12 flex flex-col items-center justify-center rounded-lg p-4 text-center space-y-3 sm:space-y-4">
        {isLoggedIn ? (
          <>
            <div className='flex space-x-4 items-center'>
              {/* 프로필 사진 */}
              <img
                src={user?.profileImageUrl || PersonIcon }
                alt="프로필 사진"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mb-2"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = PersonIcon;
                }}
              />
              
              <p className="flex flex-col items-start font-bold text-sm sm:text-base">
                <span>{user?.nickname}님</span>
                <span>오늘도 소중한 피드백 부탁드릴게요!</span>
              </p>

            </div>

            {/* 포인트 */}
            <div className="w-full flex items-center justify-between border-t">
              <div className="flex items-center gap-2">
                <span className="text-base text-gray-600">내 포인트</span>
                {loadingPoints ? (
                  <span className="text-sm">...</span>
                ) : errorPoints ? (
                  <span className="text-sm text-red-500">오류</span>
                ) : (
                  <span className="font-bold text-xl">
                    {points.toLocaleString()}
                    <span className="text-primary font-bold ml-1">P</span>
                  </span>
                )}
              </div>
              <Button
                variant="blackWhite"
                size="lg"
                onClick={() => navigate("/user/mypage/point-exchange")}
                leftIcon={<img src={PointIcon} alt="포인트 아이콘" className="h-6" />} // 아이콘 크기 지정
              >
              포인트 교환하기
            </Button>
            </div>

            {/* 로그아웃 버튼 */}
            <Button variant='signUp' size="lg" className="w-full" onClick={logout}>
              로그아웃
            </Button>
          </>
        ) : (
          <>
            <div className="my-2 text-sm sm:text-base">
              <span className="text-[#2A5FF2] font-semibold">혁신이 시작되는 곳! </span>
              <br />
              아직 세상에 없는 신제품을 가장 먼저 써보고
              <br />
              당신의 솔직한 피드백으로 완성하세요.
            </div>
            <Button size="lg" className="w-full" onClick={() => navigate('/login')}>
              로그인하기
            </Button>
          </>
        )}
      </div>


        {/* ✅ 실제 광고 데이터로 고정 구좌 렌더링 */}
        {sideBanners.map((banner, i) => (
           <div
            key={banner.slotId || i}
            onClick={() => handleBannerClick(banner)}
            className="h-24 sm:h-28 w-full rounded-lg flex items-center justify-center font-semibold text-white text-sm sm:text-lg bg-gray-100 overflow-hidden"
            style={{ cursor: !banner.house && banner.productId ? 'pointer' : 'default' }}
          >
            {banner.bannerImageUrl ? (
              <img src={banner.bannerImageUrl} alt={`고정 광고 ${banner.position}`} className="w-full h-full object-cover" />
            ) : (
              `고정구좌 ${banner.position}`
            )}
          </div>
        ))}
      </aside>
    </div>
  );
};

export default MainPage;