import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const TOKEN_KEY = "flowdesk_token";

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fileDownloadUrl = (fileId) =>
  `${API}/attachments/${fileId}/download?auth=${localStorage.getItem(TOKEN_KEY)}`;

export function apiError(e) {
  const detail = e?.response?.data?.detail;
  if (detail == null) return e?.message || "Terjadi kesalahan";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d) => (d && d.msg) || JSON.stringify(d)).join(" ");
  if (detail.msg) return detail.msg;
  return String(detail);
}
