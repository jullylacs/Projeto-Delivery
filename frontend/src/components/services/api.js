import axios from "axios";

// Instância do Axios configurada com a URL base do backend
const api = axios.create({
  baseURL: "http://localhost:3000" // endereço do seu backend
});

export default api;