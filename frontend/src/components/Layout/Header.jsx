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
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, setIsDark] = useState(
    () => document.documentElement.dataset.theme === "dark"
  );

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setIsDark(!isDark);
  };
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

  const clearOneNotification = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/clear`);
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
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

      // Descobre o board do card para garantir que a aba certa seja aberta
      try {
        const res = await api.get(`/cards/${focusCardId}`);
        const cardBoard = res.data?.board || res.data?.column?.board;
        if (cardBoard) {
          window.dispatchEvent(new CustomEvent("kanban-switch-board", { detail: { board: cardBoard } }));
        }
      } catch {
        // Falha silenciosa — o focus event tentará assim mesmo
      }

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
          width: "420px",
          maxWidth: "100vw",
          height: "100vh",
          background: "var(--bg-card)",
          boxShadow: "-8px 0 48px rgba(20,10,60,0.35)",
          zIndex: 3100,
          display: "flex",
          flexDirection: "column",
          transform: showNotifications ? "translateX(0)" : "translateX(110%)",
          transition: "transform 340ms cubic-bezier(0.4,0,0.2,1)",
          visibility: showNotifications ? "visible" : "hidden",
        }}
      >
        {/* Hero header */}
        <div style={{
          background: "linear-gradient(135deg, #3a0f7a 0%, #5c2eff 55%, #7a4dff 100%)",
          padding: "20px 18px 16px",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 80% at 80% 50%, rgba(255,255,255,0.07), transparent)", pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔔</span>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
                  Notificações
                </h2>
                {unreadCount > 0 && (
                  <span style={{ background: "#ff4d6d", color: "#fff", fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "2px 8px", letterSpacing: "0.2px" }}>
                    {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>
                {notifications.length} total · {unreadCount} não lida{unreadCount !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, position: "relative", zIndex: 1 }}>
            <button type="button" onClick={markAllAsRead}
              style={{ border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "5px 12px", backdropFilter: "blur(4px)", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            >
              ✓ Marcar todas lidas
            </button>
            <button type="button" onClick={clearReadNotifications}
              style={{ border: "1px solid rgba(255,100,100,0.35)", background: "rgba(255,60,60,0.12)", color: "#ffb0b0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "5px 12px", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,60,60,0.22)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,60,60,0.12)"}
            >
              🗑 Limpar lidas
            </button>
          </div>
        </div>

        {/* Lista de notificações */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {notificationsLoading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-label)" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Carregando notificações…</div>
            </div>
          ) : notificationsError ? (
            <div style={{ padding: "20px 16px", color: "#ff6b6b", fontSize: "13px", fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
              <span>⚠</span> {notificationsError}
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-label)" }}>
              <div style={{ fontSize: 40, marginBottom: 12, filter: "grayscale(0.3)" }}>🔕</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Tudo em dia!</div>
              <div style={{ fontSize: 12, color: "var(--text-label)" }}>Nenhuma notificação no momento.</div>
            </div>
          ) : (
            notifications.map((item) => {
              const kindMeta = item.kind === "mention"
                ? { icon: "💬", label: "Menção", color: "#7c4dff", bg: "rgba(124,77,255,0.12)" }
                : item.priority === "high"
                  ? { icon: "⚠️", label: "Urgente", color: "#e53935", bg: "rgba(229,57,53,0.1)" }
                  : { icon: "ℹ️", label: "Info", color: "#1976d2", bg: "rgba(25,118,210,0.1)" };

              const relTime = (() => {
                const d = item.when;
                if (!d) return "";
                const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
                if (diff < 60) return "agora";
                if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
                if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
                return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
              })();

              return (
                <div
                  key={item.id}
                  style={{
                    margin: "0 10px 6px",
                    background: item.readAt ? "var(--bg-card)" : "var(--bg-input)",
                    borderRadius: 12,
                    border: `1px solid ${item.readAt ? "var(--border)" : "rgba(108,59,255,0.2)"}`,
                    borderLeft: `3px solid ${item.readAt ? "var(--border)" : kindMeta.color}`,
                    padding: "12px 14px",
                    opacity: item.readAt ? 0.75 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {/* Header do item */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
                      {!item.readAt && (
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: kindMeta.color, flexShrink: 0, boxShadow: `0 0 6px ${kindMeta.color}` }} />
                      )}
                      <strong style={{ color: "var(--text)", fontSize: "13px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {item.title}
                      </strong>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: kindMeta.color, background: kindMeta.bg, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.3px" }}>
                      {kindMeta.icon} {kindMeta.label}
                    </span>
                  </div>

                  {/* Mensagem */}
                  <div style={{ color: "var(--text-muted)", fontSize: "12px", lineHeight: 1.5, marginBottom: 8 }}>
                    {item.message}
                  </div>

                  {/* Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-label)", fontWeight: 500 }}>{relTime}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!item.readAt && (
                        <button type="button" onClick={() => markOneAsRead(item.id)}
                          style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text-label)", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "3px 9px", transition: "background 0.12s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-input)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          Marcar lida
                        </button>
                      )}
                      {item.cardId !== undefined && item.cardId !== null && (
                        <button type="button" onClick={() => openNotificationCard(item)}
                          style={{ border: "none", background: "linear-gradient(135deg, #6c3bff, #9b6dff)", color: "#fff", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "3px 10px", boxShadow: "0 2px 6px rgba(108,59,255,0.3)", transition: "opacity 0.12s" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        >
                          Ver card →
                        </button>
                      )}
                      <button type="button" onClick={() => clearOneNotification(item.id)}
                        title="Excluir notificação"
                        style={{ border: "1px solid rgba(232,64,90,0.25)", background: "transparent", color: "rgba(232,64,90,0.7)", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "3px 8px", transition: "all 0.12s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,64,90,0.12)"; e.currentTarget.style.color = "#e8405a"; e.currentTarget.style.borderColor = "rgba(232,64,90,0.5)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(232,64,90,0.7)"; e.currentTarget.style.borderColor = "rgba(232,64,90,0.25)"; }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    <div
      style={{
        height: "62px",
        background: "linear-gradient(90deg, #3d1472 0%, #4c1d95 50%, #4f238f 100%)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        color: "#fff",
        position: "relative",
        zIndex: 3000,
        boxShadow: "0 2px 16px rgba(0,0,0,0.22)",
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
            title={isSidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
            style={{
              width: 36,
              height: 36,
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.2s, transform 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          >
            <span
              style={{
                display: "inline-block",
                transform: isSidebarOpen ? "translateX(-1px)" : "translateX(1px)",
                transition: "transform 200ms ease",
                lineHeight: 1,
              }}
            >
              {isSidebarOpen ? "◀" : "▶"}
            </span>
          </button>
        )}
        <h2
          style={{
            margin: 0,
            fontWeight: "600",
            fontSize: "16px",
            letterSpacing: "0.4px",
            opacity: 0.95,
          }}
        >
          🚀 NVX Fibra LTDA
        </h2>
      </div>

      {/* Área direita contendo notificações e menu do usuário */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>

        {/* Toggle tema claro/escuro */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "#fff", cursor: "pointer",
            fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        >
          {isDark ? "☀️" : "🌙"}
        </button>

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
                top: "50px",
                right: "0",
                background: "var(--bg-card)",
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