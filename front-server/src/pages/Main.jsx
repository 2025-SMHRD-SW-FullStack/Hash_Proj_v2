import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '/src/components/layouts/MainLayout'
import  styles from './Main.module.css'


const Main = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        // if (!token) {
        //     alert("로그인이 필요합니다.");
        //     navigate("/login");
        // }
    }, [navigate]);

    return (
        <MainLayout>
            <div className={styles.wrapper}>
                <div className={styles.left}>
                    
                </div>
                
                <div className={styles.right}>                  
                    
                </div>

            </div>
        </MainLayout>
    )
}

export default Main
