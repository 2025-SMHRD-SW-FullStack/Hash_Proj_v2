// src/config/axiosInstance.js
import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Spring 서버 주소
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // 세션 쿠키 자동 포함
});

// ✅ 요청 전 AccessToken 자동 첨부
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ 자동 리프레시 처리
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true } // ✅ 쿠키에서 refreshToken 가져옴
        );

        console.log("refresh 응답: ", res.data);
        
        const newToken = res.data.token;

        if (!newToken) {
          console.error("❌ accessToken이 응답에 없습니다!", res.data);
          throw new Error("AccessToken이 응답에 없습니다");
        }
        
        localStorage.setItem("accessToken", newToken);
        axiosInstance.defaults.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        // 실패했던 원래 요청 재시도
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err.response?.data || err.message);
  }
);

export default axiosInstance;
