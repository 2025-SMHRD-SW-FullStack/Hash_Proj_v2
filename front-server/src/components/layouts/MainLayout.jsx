import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const MainLayout = () => {
  return (
    <div className="flex flex-col h-screen">
      {/* 고정 Header */}
      <Header />

      {/* Main - 항상 화면 꽉 차고, 스크롤은 여기서만 */}
      <main className="flex-1 overflow-y-auto bg-white">
        <Outlet />
        
        {/* 고정 Footer */}
        <Footer />
      </main>

    </div>
  )
}

export default MainLayout
