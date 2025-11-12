import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const { supabase } = await import("@/lib/supabase/client");
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

// Handle 401 errors and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { supabase } = await import("@/lib/supabase/client");
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!currentSession) {
          throw new Error("No session available");
        }

        const {
          data: { session: newSession },
          error: refreshError,
        } = await supabase.auth.refreshSession(currentSession);

        if (refreshError || !newSession) {
          throw refreshError || new Error("Failed to refresh session");
        }

        processQueue(null, newSession.access_token);

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newSession.access_token}`;
        }

        isRefreshing = false;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // If refresh fails, redirect to sign in
        if (typeof window !== "undefined") {
          window.location.href = "/auth/signin";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
