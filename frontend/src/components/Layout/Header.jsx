import { useNavigate } from "react-router-dom"; // Hook para navegação programática
import { useState, useEffect, useRef } from "react";     // Hooks de estado e ciclo de vida
import api from "../../services/api";

const NOTIFICATION_READ_KEY = "readNotifications";
const USER_UPDATED_EVENT = "user-updated";
const KANBAN_FOCUS_CARD_KEY = "kanbanFocusCardId";

const readReadNotifications = () => {
  try {
    const raw = localStorage.getItem(NOTIFICATION_READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getCardId = (card) => card?._id || card?.id || card?.uuid || String(Math.random());

const buildSlaNotifications = (cards) => {
  const now = new Date();

  return cards
    .filter((card) => {
      if (!card?.prazo) return false;
      return card.status !== "Concluído" && card.status !== "Inativo";
    })
    .map((card) => {
      const deadline = new Date(card.prazo);
      if (Number.isNaN(deadline.getTime())) return null;

      const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      const baseId = getCardId(card);

      if (deadline < now) {
        return {
          id: `${baseId}-late-${deadline.toISOString()}`,
          title: card.empresa || card.nome || card.title || "Card sem título",
          message: "Prazo vencido. Requer atenção imediata.",
          when: deadline,
          priority: "high",
        };
      }

      if (diffDays >= 0 && diffDays <= 3) {
        return {
          id: `${baseId}-due-${deadline.toISOString()}`,
          title: card.empresa || card.nome || card.title || "Card sem título",
          message: `Prazo vence em ${diffDays} dia(s).`,
          when: deadline,
          priority: "medium",
        };
      }

      return null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.priority === b.priority) {
        return a.when - b.when;
      }

      return a.priority === "high" ? -1 : 1;
    });
};

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const commentMentionsUser = (commentText, userName) => {
  const safeText = normalizeName(commentText);
  const safeUser = normalizeName(userName);
  if (!safeText || !safeUser) return false;
  return safeText.includes(`@${safeUser}`);
};

const buildMentionNotifications = (cards, currentUserName) => {
  if (!currentUserName) return [];

  return cards
    .flatMap((card) => {
      const cardId = getCardId(card);
      const title = card?.cliente || card?.titulo || card?.nome || "Card sem título";
      const comments = Array.isArray(card?.comments) ? card.comments : [];

      return comments
        .filter((comment) => {
          if (!comment?.text) return false;
          const author = normalizeName(comment.author);
          const me = normalizeName(currentUserName);
          if (author && me && author === me) return false;
          return commentMentionsUser(comment.text, currentUserName);
        })
        .map((comment, index) => {
          const when = comment?.createdAt ? new Date(comment.createdAt) : new Date();
          const safeWhen = Number.isNaN(when.getTime()) ? new Date() : when;
          const commentId = comment?.id || `${safeWhen.toISOString()}-${index}`;
          const snippet = String(comment.text || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100);

          return {
            id: `mention-${cardId}-${commentId}`,
            type: "mention",
            cardId,
            title,
            message: `${comment.author || "Alguém"} mencionou você${snippet ? `: ${snippet}` : "."}`,
            when: safeWhen,
            priority: "high",
          };
        });
    })
    .sort((a, b) => b.when - a.when);
};

// Componente de cabeçalho da aplicação com navegação, busca e menu do usuário
export default function Header() {
  const navigate = useNavigate(); // Hook para redirecionamento de rotas
  const [showMenu, setShowMenu] = useState(false); // Controla visibilidade do menu dropdown
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotifications, setReadNotifications] = useState(() => readReadNotifications());
  const [user, setUser] = useState(null); // Armazena dados do usuário logado
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  const unreadCount = notifications.filter((item) => !readNotifications.includes(item.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map((item) => item.id);
    setReadNotifications(allIds);
  };

  const markOneAsRead = (notificationId) => {
    setReadNotifications((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
  };

  // Carrega dados do usuário do localStorage ao montar o componente
  useEffect(() => {
    const syncUser = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "{}"); // Busca o objeto 'user'
      setUser(userData); // Atualiza estado do usuário
    };

    const handleStorage = (event) => {
      if (!event.key || event.key === "user") {
        syncUser();
      }
    };

    syncUser();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(USER_UPDATED_EVENT, syncUser);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(USER_UPDATED_EVENT, syncUser);
    };
  }, []); // Executa apenas na montagem

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(readNotifications));
  }, [readNotifications]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get("/cards");
        const cards = Array.isArray(response.data) ? response.data : [];
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const currentUserName = userData?.nome || userData?.username || userData?.email || "";
        const slaItems = buildSlaNotifications(cards);
        const mentionItems = buildMentionNotifications(cards, currentUserName);

        // Menções primeiro, depois SLA
        setNotifications([...mentionItems, ...slaItems]);
      } catch {
        setNotifications([]);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowMenu(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
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
        position: "relative", // Necessário para posicionar dropdown
        zIndex: 3000,
      }}
    >
      {/* Título */}
      <h2
        style={{
          margin: 0,
          fontWeight: "500",
          letterSpacing: "0.5px"
        }}
      >
        🚀 NVX Fibra LTDA
      </h2>

      {/* Área direita contendo notificações e menu do usuário */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Ícone de Notificação */}
        <div ref={notificationsRef} style={{ position: "relative" }}>
          <div
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowMenu(false);
              if (!showNotifications && unreadCount > 0) {
                markAllAsRead();
              }
            }}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "0.2s",
              position: "relative",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} // Hover
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} // Normal
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

          {showNotifications && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                right: "0",
                background: "#fff",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                minWidth: "320px",
                maxWidth: "360px",
                zIndex: 2200,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #efe8ff",
                  fontSize: "13px",
                  color: "#4e3ca4",
                  fontWeight: 700,
                }}
              >
                Notificações ({notifications.length})
              </div>

              <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "14px", color: "#7b6cae", fontSize: "13px" }}>
                    Sem notificações no momento.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        markOneAsRead(item.id);
                        setShowNotifications(false);
                        if (item.type === "mention" && item.cardId !== undefined && item.cardId !== null) {
                          localStorage.setItem(KANBAN_FOCUS_CARD_KEY, String(item.cardId));
                        }
                        navigate("/kanban");
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: readNotifications.includes(item.id) ? "#fff" : "#f6f1ff",
                        borderBottom: "1px solid #f3edff",
                        cursor: "pointer",
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <strong style={{ color: "#3f3292", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</strong>
                        <span style={{ fontSize: "10px", color: item.priority === "high" ? "#d32f2f" : "#7b54e8", fontWeight: 700 }}>
                          {item.type === "mention" ? "MENÇÃO" : item.priority === "high" ? "ALTO" : "MÉDIO"}
                        </span>
                      </div>
                      <div style={{ color: "#685d95", fontSize: "12px", marginTop: 4 }}>{item.message}</div>
                      <div style={{ color: "#8d83b3", fontSize: "11px", marginTop: 4 }}>
                        {item.when.toLocaleDateString("pt-BR")}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
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
                background: user?.avatar
                  ? `url(${user.avatar})` // Se tiver imagem
                  : "linear-gradient(135deg, #9d4edd6a, #c77dff)", // Caso não
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "12px"
              }}
            >
              {/* Mostra iniciais se não houver avatar */}
              {!user?.avatar && getInitials(user?.nome)}
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
  );
}