import api from "../config/axiosInstance";

export const getMyPointBalance = () =>
  api.get("/api/me/points/balance").then((r) => r.data?.balance ?? 0);
