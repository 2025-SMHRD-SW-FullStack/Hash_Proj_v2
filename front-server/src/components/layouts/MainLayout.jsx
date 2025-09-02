import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const MainLayout = () => {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="py-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  )
}

export default MainLayout
