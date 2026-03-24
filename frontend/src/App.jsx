import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; 
// Importa componentes do React Router para controle de rotas

import Sidebar from "./components/Layout/Sidebar"; // Barra lateral do layout
import Header from "./components/Layout/Header";   // Cabeçalho do layout
import Dashboard from "./pages/Dashboard";        // Página Dashboard
import Kanban from "./pages/Kanban";              // Página Kanban
import Agenda from "./pages/Agenda";              // Página Agenda
import Profile from "./pages/Profile";            // Página Profile
import Login from "./pages/Login";                // Página Login
import Register from "./pages/Register";          // Página Register

export default function App() {
  return (
    <BrowserRouter>
      {/* BrowserRouter envolve toda a aplicação e permite navegação via URL */}
      <Routes>
        {/* Define todas as rotas da aplicação */}

        {/* Rotas públicas (sem layout de sidebar/header) */}
        <Route path="/login" element={<Login />} /> 
        <Route path="/register" element={<Register />} /> 

        {/* Rotas protegidas / principais da aplicação */}
        <Route
          path="/*" 
          element={
            <div style={{ display: "flex" }}>
              {/* Layout principal: sidebar à esquerda e conteúdo à direita */}
              <Sidebar /> 

              <div style={{ flex: 1 }}>
                {/* Área principal: Header no topo e conteúdo abaixo */}
                <Header /> 

                <div 
                  style={{ 
                    padding: "20px", 
                    overflow: "auto", 
                    height: "calc(100vh - 70px)" 
                  }}
                >
                  {/* Sub-rotas dentro do layout principal */}
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/kanban" element={<Kanban />} />
                    <Route path="/agenda" element={<Agenda />} />
                    <Route path="/profile" element={<Profile />} />

                    {/* Redireciona "/" para "/dashboard" */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}