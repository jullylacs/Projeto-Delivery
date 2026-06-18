import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import useWindowWidth from "./hooks/useWindowWidth";

// Aplica o tema salvo antes de qualquer render
const savedTheme = localStorage.getItem("theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

import Sidebar from "./components/Layout/Sidebar";
import Header from "./components/Layout/Header";
import Dashboard from "./pages/Dashboard";
import Graficos from "./pages/Graficos";
import Kanban from "./pages/Kanban";
import Agenda from "./pages/Agenda";
import AgendaDelivery from "./pages/AgendaDelivery";
import Profile from "./pages/Profile";
import RamaisPage from "./pages/Ramais";
import MuralPage from "./pages/Mural";
import BuscarProvedores from "./pages/BuscarProvedores";
import AdminUsers from "./pages/AdminUsers";
import Arquivados from "./pages/Arquivados";
import Lixeira from "./pages/Lixeira";
import Notas from "./pages/Notas";
import Login from "./pages/Login";
import Register from "./pages/Register";

const LAST_PRIVATE_ROUTE_KEY = "lastPrivateRoute";
const SIDEBAR_OPEN_KEY = "sidebarOpen";
const PRIVATE_ROUTES = ["/dashboard", "/graficos", "/kanban", "/agenda", "/agenda-delivery", "/profile", "/admin/users", "/buscar-provedores", "/notas"];

function AdminRoute({ children }) {
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  if (!user || !["admin", "gestor"].includes(user.perfil)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function DeliveryAgendaRoute({ children }) {
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  const allowed = ["delivery", "admin", "noc"];
  if (!user || !allowed.includes(user.perfil)) {
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
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const restoreRoute = getLastPrivateRoute();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (window.innerWidth < 768) return false;
    const saved = localStorage.getItem(SIDEBAR_OPEN_KEY);
    return saved === null ? true : saved === "true";
  });

  // Persiste preferência só no desktop
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(isSidebarOpen));
    }
  }, [isSidebarOpen, isMobile]);

  // Fecha sidebar ao navegar no mobile
  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao redimensionar para desktop, restaura preferência salva
  const prevIsMobile = useRef(isMobile);
  useEffect(() => {
    if (prevIsMobile.current && !isMobile) {
      const saved = localStorage.getItem(SIDEBAR_OPEN_KEY);
      setIsSidebarOpen(saved === null ? true : saved === "true");
    }
    if (!prevIsMobile.current && isMobile) {
      setIsSidebarOpen(false);
    }
    prevIsMobile.current = isMobile;
  }, [isMobile]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f2efff", color: "#1f2b46", width: "100%", minWidth: 0, overflow: "hidden", position: "relative" }}>
      <LastRouteTracker />

      {/* ── Desktop: sidebar empurra o conteúdo ── */}
      {!isMobile && (
        <div style={{
          width: isSidebarOpen ? 250 : 0,
          minWidth: 0,
          transition: "width 320ms ease",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          <Sidebar isOpen={isSidebarOpen} />
        </div>
      )}

      {/* ── Mobile: sidebar como overlay ── */}
      {isMobile && (
        <>
          {/* Backdrop */}
          {isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 998,
              }}
            />
          )}
          {/* Sidebar deslizante */}
          <div style={{
            position: "fixed", top: 0, left: 0,
            height: "100vh", zIndex: 999,
            transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 320ms cubic-bezier(0.4,0,0.2,1)",
          }}>
            <Sidebar isOpen={true} onNavigate={() => setIsSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Área principal */}
      <div style={{ flex: 1, minWidth: 0, background: "#f2efff", color: "#1f2b46", overflow: "hidden" }}>
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
          isMobile={isMobile}
        />

        <div
          className="content-area"
          style={{
            padding: isMobile ? "12px" : "20px",
            overflowY: "auto",
            overflowX: "hidden",
            height: "calc(100vh - 62px)",
            background: "#f2efff",
            minWidth: 0,
          }}
        >
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/graficos" element={<Graficos />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/agenda-delivery" element={<DeliveryAgendaRoute><AgendaDelivery /></DeliveryAgendaRoute>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/notas" element={<Notas />} />
            <Route path="/arquivados" element={<Arquivados />} />
            <Route path="/lixeira" element={<AdminRoute><Lixeira /></AdminRoute>} />
            <Route path="/ramais" element={<RamaisPage />} />
            <Route path="/mural" element={<MuralPage />} />
            <Route path="/buscar-provedores" element={<BuscarProvedores />} />
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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
