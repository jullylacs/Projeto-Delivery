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
  timeout: 10000,                   // Tempo máximo de espera de 10 segundos
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

// Interceptor de resposta: executa após receber uma resposta
api.interceptors.response.use(
  (response) => response, // Se a resposta for ok, retorna normalmente
  (error) => {
    if (error.response?.status === 401) {
      // Se a resposta for 401 (não autorizado), significa token inválido ou expirado
      localStorage.removeItem("token"); // Remove token do localStorage
      localStorage.removeItem("user");  // Remove dados do usuário
      window.location.href = "/login";  // Redireciona para a página de login
    }
    return Promise.reject(error); // Rejeita a Promise com o erro
  }
);

export default api;
// Exporta a instância do Axios para ser usada em toda a aplicação