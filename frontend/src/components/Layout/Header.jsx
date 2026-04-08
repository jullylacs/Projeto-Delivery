import { useLocation, useNavigate } from "react-router-dom"; // Hook para navegação programática
import { useState, useEffect, useRef } from "react";     // Hooks de estado e ciclo de vida
import api from "../../services/api";

const USER_UPDATED_EVENT = "user-updated";
const KANBAN_FOCUS_CARD_KEY = "kanbanFocusCardId";
const KANBAN_FOCUS_EVENT = "kanban-focus-card";

const normalizeAvatar = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const decoder = document.createElement("textarea");
  decoder.innerHTML = trimmed;
  return decoder.value.trim();
};


// Componente de cabeçalho da aplicação com navegação, busca e menu do usuário
export default function Header({ onToggleSidebar, isSidebarOpen }) {
  const navigate = useNavigate(); // Hook para redirecionamento de rotas
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false); // Controla visibilidade do menu dropdown
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [user, setUser] = useState(null); // Armazena dados do usuário logado
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const userMenuRef = useRef(null);

  const avatarSrc = normalizeAvatar(user?.avatar);
  const hasAvatar = avatarSrc.length > 0;
  const showAvatarImage = hasAvatar && !avatarLoadError;

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const logNotificationLoadError = (error) => {
    const status = error?.response?.status;
    const method = (error?.config?.method || "").toUpperCase();
    const url = error?.config?.url || "(url desconhecida)";
    const message = error?.response?.data?.message || error?.message || "erro desconhecido";
    console.error(`[Notifications] Falha ${method} ${url} (status: ${status || "n/a"}) - ${message}`);
  };

  const refreshNotifications = async ({ silent = false } = {}) => {
    try {
      if (!silent) setNotificationsLoading(true);
      setNotificationsError("");
      await api.post("/notifications/sync");
      const response = await api.get("/notifications", { params: { limit: 120 } });
      const list = Array.isArray(response.data) ? response.data : [];
      setNotifications(list.map((item) => ({
        ...item,
        when: item.when ? new Date(item.when) : new Date(),
      })));
    } catch (error) {
      logNotificationLoadError(error);
      setNotificationsError("Falha ao carregar notificações.");
      if (!silent) setNotifications([]);
    } finally {
      if (!silent) setNotificationsLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    } catch (error) {
      logNotificationLoadError(error);
    }
  };

  const markOneAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, readAt: item.readAt || new Date().toISOString() } : item))
      );
    } catch (error) {
      logNotificationLoadError(error);
    }
  };

  const clearReadNotifications = async () => {
    try {
      await api.patch("/notifications/clear-read");
      setNotifications((prev) => prev.filter((item) => !item.readAt));
    } catch (error) {
      logNotificationLoadError(error);
    }
  };

  const openNotificationCard = async (item) => {
    await markOneAsRead(item.id);
    setShowNotifications(false);

    const normalizedCardId = item?.cardId ?? item?.card_id ?? item?.metadata?.cardId ?? item?.metadata?.card_id;

    if (normalizedCardId !== undefined && normalizedCardId !== null && String(normalizedCardId).trim() !== "") {
      const focusCardId = String(normalizedCardId).trim();
      localStorage.setItem(KANBAN_FOCUS_CARD_KEY, focusCardId);

      window.dispatchEvent(
        new CustomEvent(KANBAN_FOCUS_EVENT, {
          detail: { cardId: focusCardId },
        })
      );
    }

    if (location.pathname !== "/kanban") {
      navigate("/kanban");
    }
  };

  // Carrega dados do usuário do localStorage e sincroniza com a API
  useEffect(() => {
    const syncUser = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "{}"); // Busca o objeto 'user'
      setUser({ ...userData, avatar: normalizeAvatar(userData?.avatar) }); // Atualiza estado do usuário
    };

    const handleStorage = (event) => {
      if (!event.key || event.key === "user") {
        syncUser();
      }
    };

    // Leitura inicial do localStorage (exibição imediata)
    syncUser();

    // Busca dados frescos da API para garantir que o avatar esteja atualizado
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = storedUser?._id || storedUser?.id;
    if (userId) {
      api.get(`/users/${userId}`)
        .then((res) => {
          const normalizedUser = { ...res.data, avatar: normalizeAvatar(res.data?.avatar) };
          localStorage.setItem("user", JSON.stringify(normalizedUser));
          setUser(normalizedUser);
        })
        .catch(() => {}); // Em caso de erro, mantém os dados do localStorage
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(USER_UPDATED_EVENT, syncUser);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(USER_UPDATED_EVENT, syncUser);
    };
  }, []); // Executa apenas na montagem

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarSrc]);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(() => refreshNotifications({ silent: true }), 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Função que realiza logout
  const handleLogout = () => {
    // Remove dados de sessão/localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login"); // Redireciona para a tela de login
  };

  // Função que extrai iniciais do nome do usuário para exibir no avatar
  const getInitials = (nome) => {
    return nome
      ?.split(" ") // Divide o nome por espaços
      .map(n => n[0]) // Pega a primeira letra de cada palavra
      .join("") // Junta as iniciais
      .toUpperCase() // Converte para maiúsculas
      .slice(0, 2) || "⭐"; // Limita a duas letras, fallback para estrela
  };

  return (
    <>
      {/* Backdrop do painel de notificações */}
      {showNotifications && (
        <div
          onClick={() => setShowNotifications(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3099,
            background: "rgba(0,0,0,0.28)",
          }}
        />
      )}

      {/* Painel lateral de notificações */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "400px",
          maxWidth: "100vw",
          height: "100vh",
          background: "#fff",
          boxShadow: "-4px 0 28px rgba(76,29,149,0.18)",
          zIndex: 3100,
          display: "flex",
          flexDirection: "column",
          transform: showNotifications ? "translateX(0)" : "translateX(110%)",
          transition: "transform 320ms cubic-bezier(0.4,0,0.2,1)",
          visibility: showNotifications ? "visible" : "hidden",
        }}
      >
        {/* Cabeçalho do painel */}
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid #efe8ff",
            background: "#f8f5ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "14px", color: "#4e3ca4", fontWeight: 700 }}>
            🔔 Notificações ({notifications.length})
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              type="button"
              onClick={markAllAsRead}
              style={{
                border: "1px solid #ddd2ff",
                background: "#fff",
                color: "#4d3ba2",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px 10px",
              }}
            >
              Marcar lidas
            </button>
            <button
              type="button"
              onClick={clearReadNotifications}
              style={{
                border: "1px solid #ffd8d8",
                background: "#fff6f6",
                color: "#b42318",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px 10px",
              }}
            >
              Limpar lidas
            </button>
            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              style={{
                border: "none",
                background: "rgba(0,0,0,0.06)",
                color: "#555",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px 8px",
                lineHeight: 1,
              }}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista de notificações */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {notificationsLoading ? (
            <div style={{ padding: "20px 16px", color: "#7b6cae", fontSize: "13px" }}>
              Carregando notificações...
            </div>
          ) : notificationsError ? (
            <div style={{ padding: "20px 16px", color: "#b42318", fontSize: "13px" }}>
              {notificationsError}
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: "40px 16px", color: "#7b6cae", fontSize: "13px", textAlign: "center" }}>
              Sem notificações no momento.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                style={{
                  background: item.readAt ? "#fff" : "#f6f1ff",
                  borderBottom: "1px solid #f0ebff",
                  padding: "12px 16px",
                  opacity: item.readAt ? 0.82 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <strong style={{ color: "#3f3292", fontSize: "13px", lineHeight: 1.3 }}>{item.title}</strong>
                  <span
                    style={{
                      fontSize: "10px",
                      color: item.priority === "high" ? "#d32f2f" : "#7b54e8",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {item.kind === "mention" ? "MENÇÃO" : item.priority === "high" ? "ALTO" : "MÉDIO"}
                  </span>
                </div>
                <div style={{ color: "#685d95", fontSize: "12px", marginTop: 5, lineHeight: 1.45 }}>{item.message}</div>
                <div style={{ color: "#8d83b3", fontSize: "11px", marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span>{item.when.toLocaleDateString("pt-BR")}</span>
                  <span>{item.readAt ? "Lida" : "Não lida"}</span>
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  {!item.readAt && (
                    <button
                      type="button"
                      onClick={() => markOneAsRead(item.id)}
                      style={{
                        border: "1px solid #ddd2ff",
                        background: "#f8f5ff",
                        color: "#4d3ba2",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: "4px 10px",
                      }}
                    >
                      Marcar lida
                    </button>
                  )}
                  {item.cardId !== undefined && item.cardId !== null && (
                    <button
                      type="button"
                      onClick={() => openNotificationCard(item)}
                      style={{
                        border: "1px solid #d7ccff",
                        background: "#ede7ff",
                        color: "#3f3292",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: "4px 10px",
                      }}
                    >
                      Ir para card
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    <div
      style={{
        height: "70px",
        background: "rgba(76, 29, 149, 0.9)", // Roxo translúcido
        backdropFilter: "blur(10px)",          // Desfoque de fundo
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
        borderBottom: "1px solid rgba(255,255,255,0.1)", // Linha inferior
        color: "#fff",
        position: "relative",
        zIndex: 3000,
      }}
    >
      {/* Título */}
      {/* Botão toggle sidebar + Título */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Ocultar menu lateral" : "Mostrar menu lateral"}
            style={{
              width: 36,
              height: 36,
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          >
            ☰
          </button>
        )}
        <h2
          style={{
            margin: 0,
            fontWeight: "500",
            letterSpacing: "0.5px"
          }}
        >
          🚀 NVX Fibra LTDA
        </h2>
      </div>

      {/* Área direita contendo notificações e menu do usuário */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Ícone de Notificação */}
        <div
          onClick={() => {
            setShowNotifications((prev) => !prev);
            setShowMenu(false);
          }}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: showNotifications ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "0.2s",
            position: "relative",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          onMouseLeave={(e) => e.currentTarget.style.background = showNotifications ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}
        >
          🔔
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-3px",
                right: "-3px",
                minWidth: "18px",
                height: "18px",
                borderRadius: "9px",
                background: "#ff4d6d",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        {/* Usuário com menu dropdown */}
        <div ref={userMenuRef} style={{ position: "relative" }}>
          {/* Botão de usuário que abre/fecha dropdown */}
          <div
            onClick={() => {
              setShowMenu(!showMenu);
              setShowNotifications(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.1)",
              transition: "0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"} // Hover
            onMouseLeave={(e) => {
              if (!showMenu) { // Só volta ao normal se dropdown fechado
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: showAvatarImage
                  ? "transparent"
                  : "linear-gradient(135deg, #9d4edd6a, #c77dff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "12px",
                overflow: "hidden"
              }}
            >
              {showAvatarImage && (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  onError={() => setAvatarLoadError(true)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              )}
              {/* Mostra iniciais se não houver avatar */}
              {!showAvatarImage && getInitials(user?.nome)}
            </div>

            {/* Nome do usuário */}
            <span style={{ fontSize: "14px" }}>{user?.nome || "Usuário"}</span>
          </div>

          {/* Menu Dropdown */}
          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "50px", // Abaixo do botão
                right: "0",
                background: "#fff",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                minWidth: "200px",
                zIndex: 2200,
                overflow: "hidden"
              }}
            >
              {/* Email do usuário */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #efe8ff",
                  fontSize: "12px",
                  color: "#6a5ea8",
                  fontWeight: "600"
                }}
              >
                {user?.email}
              </div>

              {/* Botão Meu Perfil */}
              <button
                onClick={() => {
                  navigate("/profile"); // Redireciona
                  setShowMenu(false); // Fecha dropdown
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "none",
                  background: "transparent",
                  color: "#3c2f9f",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  textAlign: "left",
                  transition: "0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f4efff"} // Hover
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"} // Normal
              >
                Meu Perfil
              </button>

              {/* Botão Sair */}
              <div style={{ borderTop: "1px solid #efe8ff" }}>
                <button
                  onClick={() => {
                    handleLogout(); // Executa logout
                    setShowMenu(false); // Fecha dropdown
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "transparent",
                    color: "#d32f2f",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    textAlign: "left"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f7edff"} // Hover
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"} // Normal
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
    </>
  );
}