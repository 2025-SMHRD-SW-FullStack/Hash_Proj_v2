import api from "../config/axiosInstance";

// 상세
export const getProductDetail = (id) =>
  api.get(`/api/products/${id}`).then((res) => res.data);

// 목록(필요 시)
export const getProducts = (params) =>
  api.get("/api/products", { params }).then((res) => res.data);
