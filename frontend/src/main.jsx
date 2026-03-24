import React from "react"; 
// Importa o React, necessário para JSX e componentes

import ReactDOM from "react-dom/client"; 
// Importa o ReactDOM moderno (a partir do React 18) para renderizar a aplicação

import App from "./App"; 
// Importa o componente principal da aplicação

import { ErrorBoundary } from "./ErrorBoundary"; 
// Importa o componente ErrorBoundary para capturar erros em qualquer componente filho

// Cria a raiz da aplicação React no elemento com id "root"
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* StrictMode ativa verificações adicionais e avisos de práticas não recomendadas */}
    <ErrorBoundary>
      {/* ErrorBoundary envolve toda a aplicação para capturar erros de runtime */}
      <App />
      {/* Componente principal da aplicação */}
    </ErrorBoundary>
  </React.StrictMode>
);