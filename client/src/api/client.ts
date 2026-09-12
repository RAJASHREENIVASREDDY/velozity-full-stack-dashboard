import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Access token lives only in memory (never localStorage for refresh tokens).
let accessToken: string | null = null;
export function setAccessToken(t: string | null): void {
  accessToken = t;
}
export function getAccessToken(): string | null {
  return accessToken;
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // send HttpOnly refresh cookie
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const res = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
  const token = res.data?.data?.accessToken as string;
  setAccessToken(token);
  return token;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error?.response?.status === 401 && original && !original._retried && !original.url?.includes("/auth/")) {
      original._retried = true;
      try {
        refreshing = refreshing ?? doRefresh().finally(() => (refreshing = null));
        const token = await refreshing;
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  },
);
