import api from "../config/axiosInstance";

export const getAddresses = () =>
  api.get("/api/me/addresses").then(res => res.data);

export const createAddress = (payload) =>
  api.post("/api/me/addresses", payload).then(res => res.data);

export const updateAddress = (id, payload) =>
  api.put(`/api/me/addresses/${id}`, payload).then(res => res.data);

export const deleteAddress = (id) =>
  api.delete(`/api/me/addresses/${id}`).then(res => res.data);
