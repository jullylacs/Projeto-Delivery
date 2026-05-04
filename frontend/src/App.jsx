import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"; 
import { useEffect, useState } from "react";
// Importa componentes do React Router para controle de rotas

import Sidebar from "./components/Layout/Sidebar"; // Barra lateral do layout
import Header from "./components/Layout/Header";   // Cabeçalho do layout
import Dashboard from "./pages/Dashboard";        // Página Dashboard
import Kanban from "./pages/Kanban";              // Página Kanban
import Agenda from "./pages/Agenda";              // Página Agenda
import Profile from "./pages/Profile";            // Página Profile
import RamaisPage from "./pages/Ramais";

import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";
import Register from "./pages/Register";

const LAST_PRIVATE_ROUTE_KEY = "lastPrivateRoute";
const SIDEBAR_OPEN_KEY = "sidebarOpen";
const PRIVATE_ROUTES = ["/dashboard", "/kanban", "/agenda", "/profile", "/admin/users"];

function AdminRoute({ children }) {
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  if (!user || !["admin", "gestor"].includes(user.perfil)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function getLastPrivateRoute() {
  const saved = localStorage.getItem(LAST_PRIVATE_ROUTE_KEY);
  return PRIVATE_ROUTES.includes(saved) ? saved : "/dashboard";
}

function LastRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    if (PRIVATE_ROUTES.includes(location.pathname)) {
      localStorage.setItem(LAST_PRIVATE_ROUTE_KEY, location.pathname);
    }
  }, [location.pathname]);

  return null;
}

function MainLayout() {
  const restoreRoute = getLastPrivateRoute();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_OPEN_KEY);
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_OPEN_KEY, String(isSidebarOpen));
  }, [isSidebarOpen]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f2efff", color: "#1f2b46", width: "100%", minWidth: 0, overflow: "hidden", position: "relative" }}>
      <LastRouteTracker />
      {/* Layout principal: sidebar à esquerda e conteúdo à direita */}

      <div
        style={{
          width: isSidebarOpen ? 250 : 0,
          minWidth: 0,
          transition: "width 320ms ease",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Sidebar isOpen={isSidebarOpen} />
      </div>

      <div style={{ flex: 1, minWidth: 0, background: "#f2efff", color: "#1f2b46", overflow: "hidden" }}>
        {/* Área principal: Header no topo e conteúdo abaixo */}
        <Header onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} isSidebarOpen={isSidebarOpen} />

        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            overflowX: "hidden",
            height: "calc(100vh - 70px)",
            background: "#f2efff",
            minWidth: 0,
          }}
        >
          {/* Sub-rotas dentro do layout principal */}
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/ramais" element={<RamaisPage />} />

            {/* Redireciona "/" para última rota privada */}
            <Route path="/" element={<Navigate to={restoreRoute} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

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
          element={<MainLayout />}
        />
      </Routes>
    </BrowserRouter>
  );
}