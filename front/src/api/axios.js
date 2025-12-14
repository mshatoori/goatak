import axios from "axios";
import router from "../router";

const api = axios.create({
  baseURL: "/api", // Proxy handles redirection to webclient
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Add Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 and Refresh
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint via the proxy
        // Since /auth is proxied to auth-service and cookies are HttpOnly, we just call it.
        // Wait, auth-service checks Cookie.
        // We need to make sure axios sends cookies.
        const response = await axios.post(
          "/auth/refresh",
          {},
          { withCredentials: true }
        );

        const { access_token } = response.data;
        localStorage.setItem("access_token", access_token);

        api.defaults.headers.common["Authorization"] = "Bearer " + access_token;
        originalRequest.headers["Authorization"] = "Bearer " + access_token;

        processQueue(null, access_token);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("access_token");
        router.push("/login");
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = axios.create({
  baseURL: "/auth",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // For cookies
});

export default api;
