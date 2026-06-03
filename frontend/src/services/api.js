import axios from "axios";
// Importa a biblioteca Axios para fazer requisições HTTP

const apiProtocol = import.meta.env.VITE_API_PROTOCOL || "http";
const apiHost = import.meta.env.VITE_API_HOST || "localhost";
const apiPort = import.meta.env.VITE_API_PORT || "3000";
const apiBasePath = import.meta.env.VITE_API_BASE_PATH || "/api/v1";
const fallbackBase = `${apiProtocol}://${apiHost}${apiPort ? `:${apiPort}` : ""}`;
const explicitBaseUrl = import.meta.env.VITE_API_URL;
const normalizedBasePath = String(apiBasePath).startsWith("/") ? apiBasePath : `/${apiBasePath}`;
const apiBaseUrl = explicitBaseUrl
  ? String(explicitBaseUrl).replace(/\/$/, "")
  : `${fallbackBase}${normalizedBasePath}`;

// Cria uma instância do Axios com configuração padrão
const api = axios.create({
  baseURL: apiBaseUrl, // URL base para todas as requisições
  timeout: 200000,                   // Tempo máximo de espera de 200 segundos
  headers: {
    "Content-Type": "application/json" // Define que o conteúdo será JSON
  }
});

// Interceptor de requisição: executa antes de cada requisição
api.interceptors.request.use(
  (config) => {
    // Pega o token armazenado no localStorage
    const token = localStorage.getItem("token");
    if (token) {
      // Adiciona o token no cabeçalho Authorization, se existir
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config; // Retorna a configuração atualizada
  },
  (error) => {
    // Caso ocorra algum erro antes de enviar a requisição
    return Promise.reject(error);
  }
);

// Controle de refresh em andamento (evita múltiplas chamadas simultâneas)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

const doLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

// Interceptor de resposta: executa após receber uma resposta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ignora erros na própria rota de refresh (evita loop infinito)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/users/refresh") &&
      !originalRequest.url?.includes("/users/login")
    ) {
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        doLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Enfileira requests que chegaram enquanto o refresh já está em andamento
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post("/users/refresh", { refreshToken });
        const newToken = res.data.token;
        const newRefresh = res.data.refreshToken;

        localStorage.setItem("token", newToken);
        if (newRefresh) localStorage.setItem("refreshToken", newRefresh);

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        doLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
// Exporta a instância do Axios para ser usada em toda a aplicação