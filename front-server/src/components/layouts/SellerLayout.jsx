import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import sellerNav from '../../config/sellerNav';
import { fetchOrderStatusCounts } from '../../service/statsService';
import Button from '../../components/common/Button';
import CloseIcon from '../../assets/icons/ic_close.svg';
import Icon from '../common/Icon';
import { motion, AnimatePresence } from 'framer-motion';

const ORDERS_PATH = '/seller/orders';

export default function SellerLayout({ children }) {
  const { pathname } = useLocation();

  const [openFeedback, setOpenFeedback] = useState(
    pathname.startsWith('/seller/feedbacks') ? 'feedbacks' : ''
  );

  const [orderCounts, setOrderCounts] = useState({
    READY: 0,
    SHIPPING: 0,
    DELIVERED: 0,
    ALL: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(false);

  // 모바일 드로어
  const [mobileOpen, setMobileOpen] = useState(false);

  // 라우트 변경 시 그룹 상태 초기화 + 모바일 드로어 닫기
  useEffect(() => {
    if (pathname.startsWith('/seller/feedbacks')) {
      setOpenFeedback('feedbacks');
    } else {
      setOpenFeedback('');
    }
    setMobileOpen(false);
  }, [pathname]);

  // 주문 카운트 조회
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingCounts(true);
        const res = await fetchOrderStatusCounts();
        if (alive && res) setOrderCounts(res);
      } finally {
        if (alive) setLoadingCounts(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 화면이 lg 이상일 때 드로어 닫기
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => e.matches && setMobileOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const navItems = useMemo(() => sellerNav, []);

  const OrdersMini = () => (
    <div className="text-center text-[11px] text-gray-600"></div>
  );

  // ✅ 스타일 정의: Seller 레이아웃에 맞는 검은색으로 수정
  const baseLinkStyle = 'block w-full p-3 text-left text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors no-underline';
  const selectedLinkStyle = 'bg-[#CFADE5] text-white font-semibold'; // 👈 Seller 테마에 맞게 변경

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* 모바일 상단 바 */}
      <div className="pl-4 mt-4 lg:hidden">
        <Button variant="admin" size="md" onClick={() => setMobileOpen(true)}>
          메뉴
        </Button>
      </div>

      {/* ✅ 레이아웃 구조 수정: flexbox 기반으로 변경 */}
      <div className="flex flex-1">
        {/* 사이드바(데스크톱) */}
        <aside className="hidden lg:block w-56 shrink-0 p-4">
          <nav className="space-y-2">
            {navItems.map((it) => {
              // 'group' 타입이 아닌 일반 메뉴 아이템
              if (it.type !== 'group') {
                const isOrders = it.to === ORDERS_PATH;
                return (
                  <div key={it.to} className="space-y-1">
                    <NavLink
                      to={it.to}
                      end={it.to === '/seller'}
                      className={({ isActive }) =>
                        `${baseLinkStyle} ${isActive ? selectedLinkStyle : ''}`
                      }
                    >
                      {it.label}
                    </NavLink>
                    {isOrders && <OrdersMini />}
                  </div>
                );
              }

              // 'group' 타입 메뉴 아이템 (토글 가능)
              const groupActive = pathname.startsWith(it.to);
              return (
                <div key={it.to} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFeedback((v) => (v === it.to ? '' : it.to))
                    }
                    className={`${baseLinkStyle} ${
                      groupActive ? selectedLinkStyle : ''
                    }`}
                  >
                    {it.label}
                  </button>
                  {openFeedback === it.to && (
                    <div className="space-y-1 pl-3">
                      {it.children?.map((c) => (
                        <NavLink
                          key={c.to}
                          to={c.to}
                          className={({ isActive }) =>
                            `${baseLinkStyle} ${isActive ? selectedLinkStyle : ''}`
                          }
                        >
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* 모바일 드로어 (기존과 동일) */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* 오버레이 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-50 bg-black lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              {/* 드로어 */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3 }}
                role="dialog"
                aria-modal="true"
                className="fixed left-0 top-0 z-50 h-full w-80 bg-white shadow-xl ring-1 ring-black/5 lg:hidden"
              >
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <button className="border-none bg-transparent">
                    <Icon
                      src={CloseIcon}
                      alt="닫기"
                      onClick={() => setMobileOpen(false)}
                      className="!w-5 !h-5"
                    />
                  </button>
                </div>
                <nav className="space-y-2 p-3 pr-16">
                  {navItems.map((it) => {
                    if (it.type !== 'group') {
                      const isOrders = it.to === ORDERS_PATH;
                      return (
                        <div key={it.to} className="space-y-1">
                          <NavLink
                            to={it.to}
                            end={it.to === '/seller'}
                            className={({ isActive }) =>
                              `${baseLinkStyle} ${isActive ? selectedLinkStyle : ''}`
                            }
                            onClick={() => setMobileOpen(false)}
                          >
                            {it.label}
                          </NavLink>
                          {isOrders && <OrdersMini />}
                        </div>
                      );
                    }
                    return (
                      <div key={it.to} className="space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenFeedback((v) => (v === it.to ? '' : it.to))
                          }
                          className={`${baseLinkStyle} ${
                            pathname.startsWith(it.to) ? selectedLinkStyle : ''
                          }`}
                        >
                          {it.label}
                        </button>
                        {openFeedback === it.to && (
                          <div className="space-y-1 pl-3">
                            {it.children?.map((c) => (
                              <NavLink
                                key={c.to}
                                to={c.to}
                                className={({ isActive }) =>
                                  `${baseLinkStyle} ${isActive ? selectedLinkStyle : ''}`
                                }
                                onClick={() => setMobileOpen(false)}
                              >
                                {c.label}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 w-full max-w-[1600px] p-4 sm:p-6">
           <div className='mx-auto w-full max-w-7xl lg:px-8 h-full'>
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}