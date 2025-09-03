import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const MainLayout = () => {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto">
          <Outlet />
        <Footer />
      </main>
    </div>
  )
}

export default MainLayout
