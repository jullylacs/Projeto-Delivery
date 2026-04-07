import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"; 
import { useEffect } from "react";
// Importa componentes do React Router para controle de rotas

import Sidebar from "./components/Layout/Sidebar"; // Barra lateral do layout
import Header from "./components/Layout/Header";   // Cabeçalho do layout
import Dashboard from "./pages/Dashboard";        // Página Dashboard
import Kanban from "./pages/Kanban";              // Página Kanban
import Agenda from "./pages/Agenda";              // Página Agenda
import Profile from "./pages/Profile";            // Página Profile
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";                // Página Login
import Register from "./pages/Register";          // Página Register

const LAST_PRIVATE_ROUTE_KEY = "lastPrivateRoute";
const PRIVATE_ROUTES = ["/dashboard", "/kanban", "/agenda", "/profile", "/admin/users"];

function AdminRoute({ children }) {
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  if (!user || user.perfil !== "admin") {
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

  return (
    <div style={{ display: "flex", background: "#f2efff", color: "#1f2b46" }}>
      <LastRouteTracker />
      {/* Layout principal: sidebar à esquerda e conteúdo à direita */}
      <Sidebar />

      <div style={{ flex: 1, background: "#f2efff", color: "#1f2b46" }}>
        {/* Área principal: Header no topo e conteúdo abaixo */}
        <Header />

        <div
          style={{
            padding: "20px",
            overflow: "auto",
            height: "calc(100vh - 70px)",
            background: "#f2efff",
          }}
        >
          {/* Sub-rotas dentro do layout principal */}
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />

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