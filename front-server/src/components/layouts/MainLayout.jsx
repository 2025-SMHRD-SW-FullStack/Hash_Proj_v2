import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const MainLayout = () => {
  const location = useLocation();

  // 푸터를 숨길 페이지 경로 목록
  const noFooterPaths = [
    '/user/chat/rooms/',
    '/seller/chat/rooms/',
    '/user/order',
    '/user/feedback/editor',
    '/user/survey',
    '/login',
    '/email_signup',
    '/find-auth',
  ];

  // 현재 경로가 목록에 포함되는지 확인
  const isFooterHidden = noFooterPaths.some(path => location.pathname.startsWith(path));

  return (
    <div className="flex flex-col h-screen bg-white">
      <Header />

      <main data-scroll-root className={`flex-1 ${isFooterHidden ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className={isFooterHidden ? 'h-full' : 'min-h-[750px]'}>
          <Outlet />
        </div>
        
        {/* isFooterHidden이 false일 때만 푸터를 렌더링 */}
        {!isFooterHidden && <Footer />}
      </main>
    </div>
  )
}

export default MainLayout