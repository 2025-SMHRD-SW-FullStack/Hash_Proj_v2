import { useNavigate } from "react-router-dom";



const useGoHome = () => {

    const navigate = useNavigate();

    return () => navigate('/');

}

export default useGoHome;