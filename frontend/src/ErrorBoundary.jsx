import React from "react"; 
// Importa React, necessário para criar componentes de classe

export class ErrorBoundary extends React.Component {
  // Componente de classe que atua como um "circuit breaker" de erros na árvore React
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    // Estado inicial: não há erro
  }

  static getDerivedStateFromError(error) {
    // Método de ciclo de vida que atualiza o estado quando um erro é detectado em um filho
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Captura o erro e informações adicionais, útil para logging
    console.error("ErrorBoundary pegou um erro:", error, errorInfo);
  }

  render() {
    // Renderiza a UI dependendo se ocorreu um erro ou não
    if (this.state.hasError) {
      // Caso haja erro, mostra uma tela amigável de fallback
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>Algo deu errado 😢</h1>
            <p style={styles.text}>
              Ocorreu um erro inesperado na aplicação.
            </p>

            <button
              style={styles.button}
              onClick={() => window.location.reload()}
              // Botão para recarregar a página e tentar resetar a aplicação
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    // Se não há erro, renderiza os filhos normalmente
    return this.props.children;
  }
}

// Estilos inline para o fallback UI
const styles = {
  container: {
    height: "100vh", // ocupa toda a altura da tela
    width: "100%",   // ocupa toda a largura
    display: "flex", 
    justifyContent: "center", // centraliza horizontalmente
    alignItems: "center",     // centraliza verticalmente
    background: "linear-gradient(135deg, #2e1065, #4c1d95, #6d28d9)", 
    fontFamily: "Arial, sans-serif",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)", // sombra para destacar o card
    textAlign: "center",
    maxWidth: "400px",
    width: "90%",
  },
  title: {
    color: "#5b21b6",
    marginBottom: "10px",
  },
  text: {
    color: "#4b5563",
    marginBottom: "20px",
  },
  button: {
    backgroundColor: "#6d28d9",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "0.3s", // efeito de transição suave
  },
};

// Efeito hover (não funcionará automaticamente com inline styles, mas serve como referência)
styles.button[":hover"] = {
  backgroundColor: "#5b21b6",
};