import Header from './Header'
import Footer from './Footer'
import styles from './MainLayout.module.css'

const MainLayout = ({ children }) => {
    return (
        <>
            <div className={styles.layout}>
                <Header/>
                <main className={styles.main}>{children}</main>
            </div>
            {/* <Footer/> */}
        </>
    )
}

export default MainLayout