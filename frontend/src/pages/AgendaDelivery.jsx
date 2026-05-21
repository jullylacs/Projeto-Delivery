import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import RichTextEditor from "../components/UI/RichTextEditor";

// ===========================================================================
// Constantes de domínio
// ===========================================================================

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const VIEW_MODE = { month: "month", week: "week", day: "day" };
const SCOPE = { individual: "individual", geral: "geral" };

const PREFS_KEY = "agendaDeliveryPrefs";

// Perfis que podem visualizar a Agenda Geral
const SCOPE_GERAL_VIEWERS = ["delivery", "gestor_delivery", "admin", "gestor"];
// Perfis que podem criar/editar/excluir eventos na Agenda Geral
const SCOPE_GERAL_EDITORS = ["gestor_delivery", "admin"];

const EVENT_TYPES = [
  { value: "tarefa", label: "Tarefa" },
  { value: "aviso", label: "Aviso" },
  { value: "programacao", label: "Programação" },
];

const TYPE_LABEL = EVENT_TYPES.reduce((acc, t) => ({ ...acc, [t.value]: t.label }), {});

const PALETTE = [
  { value: "#6c3bff", label: "Roxo" },
  { value: "#e8405a", label: "Vermelho" },
  { value: "#ff9500", label: "Laranja" },
  { value: "#1f7a3f", label: "Verde" },
  { value: "#0e5a7a", label: "Azul" },
  { value: "#6b7a95", label: "Cinza" },
];

const DEFAULT_COLOR = PALETTE[0].value;

// ===========================================================================
// Helpers de data (Date nativo, sem libs externas)
// ===========================================================================

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfWeek = (date) => {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  base.setDate(base.getDate() - base.getDay());
  return base;
};

const endOfWeek = (date) => {
  const start = startOfWeek(date);
  start.setDate(start.getDate() + 6);
  start.setHours(23, 59, 59, 999);
  return start;
};

const startOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

const endOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const shiftDate = (date, amountInDays) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amountInDays);
  return next;
};

const parseDateSafe = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateInput = (date) => {
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Formata "10/05 14:30 - 16:00" ou "10/05 (dia inteiro)"
const formatEventTime = (event) => {
  const inicio = parseDateSafe(event.inicio);
  if (!inicio) return "";
  if (event.all_day) return "Dia inteiro";

  const fim = parseDateSafe(event.fim);
  const fmt = (d) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (fim && !isSameDay(inicio, fim)) {
    return `${fmt(inicio)} - ${fim.toLocaleDateString("pt-BR")} ${fmt(fim)}`;
  }
  return fim ? `${fmt(inicio)} - ${fmt(fim)}` : fmt(inicio);
};

// ===========================================================================
// LocalStorage helpers
// ===========================================================================

const readPrefs = () => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writePrefs = (prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignora erro de quota / acesso negado.
  }
};

const readCurrentUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ===========================================================================
// Componente
// ===========================================================================

export default function AgendaDelivery() {
  const currentUser = useMemo(() => readCurrentUser(), []);
  const userPerfil = currentUser?.perfil || "convidado";

  const canViewGeral = SCOPE_GERAL_VIEWERS.includes(userPerfil);
  const canEditGeral = SCOPE_GERAL_EDITORS.includes(userPerfil);

  const initialPrefs = useMemo(() => readPrefs(), []);

  const [scope, setScope] = useState(() => {
    const saved = initialPrefs.scope;
    if (saved === SCOPE.geral && canViewGeral) return SCOPE.geral;
    return SCOPE.individual;
  });

  const [viewMode, setViewMode] = useState(() => initialPrefs.viewMode || VIEW_MODE.month);

  const [currentDate, setCurrentDate] = useState(() => {
    const parsed = parseDateSafe(initialPrefs.currentDate);
    return parsed || new Date();
  });

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState("");

  // Modal de evento (criar/editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingEvent, setEditingEvent] = useState(null);

  // Form state
  const [formTitulo, setFormTitulo] = useState("");
  const [formTipo, setFormTipo] = useState("tarefa");
  const [formAllDay, setFormAllDay] = useState(false);
  const [formInicioDate, setFormInicioDate] = useState("");
  const [formInicioTime, setFormInicioTime] = useState("09:00");
  const [formFimDate, setFormFimDate] = useState("");
  const [formFimTime, setFormFimTime] = useState("10:00");
  const [formCor, setFormCor] = useState(DEFAULT_COLOR);
  const [formDescricao, setFormDescricao] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Persiste preferências
  useEffect(() => {
    writePrefs({
      scope,
      viewMode,
      currentDate: currentDate.toISOString(),
    });
  }, [scope, viewMode, currentDate]);

  // Garante que usuário sem permissão não fique preso na aba "Geral"
  useEffect(() => {
    if (scope === SCOPE.geral && !canViewGeral) {
      setScope(SCOPE.individual);
    }
  }, [scope, canViewGeral]);

  // ---- Range visível baseado na visão atual ----
  const visibleRange = useMemo(() => {
    if (viewMode === VIEW_MODE.day) {
      return { inicio: startOfDay(currentDate), fim: endOfDay(currentDate) };
    }
    if (viewMode === VIEW_MODE.week) {
      return { inicio: startOfWeek(currentDate), fim: endOfWeek(currentDate) };
    }
    // mês: estende para cobrir a grade completa (linhas que pegam dias do mês anterior/posterior)
    const firstOfMonth = startOfMonth(currentDate);
    const lastOfMonth = endOfMonth(currentDate);
    const gridStart = startOfWeek(firstOfMonth);
    const gridEndBase = shiftDate(startOfWeek(lastOfMonth), 6);
    const gridEnd = endOfDay(gridEndBase);
    return { inicio: gridStart, fim: gridEnd };
  }, [viewMode, currentDate]);

  // ---- Carrega eventos quando muda escopo / range / aba ----
  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setIsLoading(true);
      setApiError("");
      try {
        const params = {
          escopo: scope,
          inicio: visibleRange.inicio.toISOString(),
          fim: visibleRange.fim.toISOString(),
        };
        const res = await api.get("/agenda-eventos", { params });
        if (cancelled) return;
        setEvents(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 403) {
          setApiError("Você não tem permissão para visualizar essa agenda.");
          setEvents([]);
        } else {
          const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
          setApiError(`Não foi possível carregar eventos.${msg ? ` (${msg})` : ""}`);
          setEvents([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [scope, visibleRange.inicio, visibleRange.fim]);

  // ---- Agrupa eventos por dia (chave YYYY-MM-DD local) ----
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((evt) => {
      const inicio = parseDateSafe(evt.inicio);
      if (!inicio) return;
      const key = toDateInput(inicio);
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    });
    // Ordena por horário dentro do dia
    Object.values(map).forEach((list) =>
      list.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    );
    return map;
  }, [events]);

  // ===========================================================================
  // Modal handlers
  // ===========================================================================

  const resetForm = () => {
    setFormTitulo("");
    setFormTipo("tarefa");
    setFormAllDay(false);
    setFormInicioDate(toDateInput(new Date()));
    setFormInicioTime("09:00");
    setFormFimDate(toDateInput(new Date()));
    setFormFimTime("10:00");
    setFormCor(DEFAULT_COLOR);
    setFormDescricao("");
    setFormError("");
    setEditingEvent(null);
  };

  const canEditEvent = (evt) => {
    if (!evt) return false;
    if (scope === SCOPE.geral) return canEditGeral;
    // Individual: o backend já garante que só vêm do próprio usuário.
    return true;
  };

  const openCreateModal = (preselectDate) => {
    if (scope === SCOPE.geral && !canEditGeral) {
      setToast("Apenas gestores podem criar eventos na Agenda Geral.");
      return;
    }
    resetForm();
    setModalMode("create");
    const base = preselectDate || currentDate;
    setFormInicioDate(toDateInput(base));
    setFormFimDate(toDateInput(base));
    setIsModalOpen(true);
  };

  const openEditModal = (evt) => {
    const inicio = parseDateSafe(evt.inicio) || new Date();
    const fim = parseDateSafe(evt.fim) || inicio;
    setModalMode("edit");
    setEditingEvent(evt);
    setFormTitulo(evt.titulo || "");
    setFormTipo(evt.tipo || "tarefa");
    setFormAllDay(Boolean(evt.all_day));
    setFormInicioDate(toDateInput(inicio));
    setFormInicioTime(
      `${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`
    );
    setFormFimDate(toDateInput(fim));
    setFormFimTime(
      `${String(fim.getHours()).padStart(2, "0")}:${String(fim.getMinutes()).padStart(2, "0")}`
    );
    setFormCor(evt.cor || DEFAULT_COLOR);
    setFormDescricao(evt.descricao_html || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Constrói o payload de envio (validando datas)
  const buildPayload = () => {
    const titulo = formTitulo.trim();
    if (!titulo) {
      throw new Error("Informe um título para o evento.");
    }
    if (!formInicioDate) {
      throw new Error("Informe a data de início.");
    }

    const inicioStr = formAllDay
      ? `${formInicioDate}T00:00:00`
      : `${formInicioDate}T${formInicioTime || "00:00"}:00`;
    const inicio = new Date(inicioStr);
    if (Number.isNaN(inicio.getTime())) {
      throw new Error("Data de início inválida.");
    }

    let fim = null;
    if (formAllDay && formFimDate) {
      const candidate = new Date(`${formFimDate}T23:59:59`);
      if (!Number.isNaN(candidate.getTime())) fim = candidate;
    } else if (!formAllDay && formFimDate && formFimTime) {
      const candidate = new Date(`${formFimDate}T${formFimTime}:00`);
      if (!Number.isNaN(candidate.getTime())) fim = candidate;
    }

    if (fim && fim.getTime() < inicio.getTime()) {
      throw new Error("A data fim deve ser maior ou igual à data início.");
    }

    return {
      titulo,
      descricao_html: formDescricao || "",
      inicio: inicio.toISOString(),
      fim: fim ? fim.toISOString() : null,
      all_day: formAllDay,
      escopo: scope,
      tipo: formTipo,
      cor: formCor,
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      setFormError(err.message);
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === "edit" && editingEvent) {
        const res = await api.put(`/agenda-eventos/${editingEvent.id}`, payload);
        const updated = res.data;
        setEvents((prev) => prev.map((evt) => (evt.id === editingEvent.id ? updated : evt)));
      } else {
        const res = await api.post("/agenda-eventos", payload);
        const created = res.data;
        // Só insere se cair no range visível (evita duplicar caso a API filtre depois)
        const inicio = parseDateSafe(created.inicio);
        if (inicio && inicio >= visibleRange.inicio && inicio <= visibleRange.fim) {
          setEvents((prev) => [...prev, created]);
        }
      }
      closeModal();
    } catch (err) {
      if (err?.response?.status === 403) {
        setFormError("Sem permissão para essa operação.");
      } else {
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
        setFormError(msg || "Não foi possível salvar o evento.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    const confirmed = window.confirm(`Excluir o evento "${editingEvent.titulo}"?`);
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await api.delete(`/agenda-eventos/${editingEvent.id}`);
      setEvents((prev) => prev.filter((evt) => evt.id !== editingEvent.id));
      closeModal();
    } catch (err) {
      if (err?.response?.status === 403) {
        setFormError("Sem permissão para excluir.");
      } else {
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
        setFormError(msg || "Não foi possível excluir o evento.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Toast leve com auto-dismiss
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // ===========================================================================
  // Navegação
  // ===========================================================================

  const handlePrev = () => {
    if (viewMode === VIEW_MODE.month) {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
      return;
    }
    setCurrentDate((d) => shiftDate(d, viewMode === VIEW_MODE.week ? -7 : -1));
  };

  const handleNext = () => {
    if (viewMode === VIEW_MODE.month) {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
      return;
    }
    setCurrentDate((d) => shiftDate(d, viewMode === VIEW_MODE.week ? 7 : 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (viewMode === VIEW_MODE.month) {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === VIEW_MODE.week) {
      const ws = startOfWeek(currentDate);
      const we = shiftDate(ws, 6);
      return `${ws.toLocaleDateString("pt-BR")} - ${we.toLocaleDateString("pt-BR")}`;
    }
    return currentDate.toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
  }, [viewMode, currentDate]);

  // ===========================================================================
  // Render helpers
  // ===========================================================================

  const monthDays = useMemo(() => {
    if (viewMode !== VIEW_MODE.month) return [];
    const firstOfMonth = startOfMonth(currentDate);
    const lastOfMonth = endOfMonth(currentDate);
    const result = [];
    const startOffset = firstOfMonth.getDay();
    const totalDays = lastOfMonth.getDate();

    for (let i = 0; i < startOffset; i++) result.push(null);
    for (let day = 1; day <= totalDays; day++) {
      result.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    }
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [viewMode, currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, idx) => shiftDate(start, idx));
  }, [currentDate]);

  const renderEventChip = (evt) => {
    const cor = evt.cor || DEFAULT_COLOR;
    return (
      <div
        key={evt.id}
        onClick={(ev) => {
          ev.stopPropagation();
          openEditModal(evt);
        }}
        title={evt.titulo}
        style={{
          fontSize: 12,
          lineHeight: 1.3,
          color: "#fff",
          background: cor,
          borderRadius: 4,
          padding: "3px 6px",
          marginBottom: 2,
          cursor: "pointer",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontWeight: 600,
        }}
      >
        {evt.all_day ? "" : `${new Date(evt.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} `}
        {evt.titulo}
      </div>
    );
  };

  const renderDayCell = (day, idx, isInCurrentMonth = true) => {
    if (!day) {
      return (
        <div
          key={`empty-${idx}`}
          style={{
            minHeight: 120,
            borderRight: idx % 7 !== 6 ? "1px solid #eee8ff" : "none",
            borderBottom: "1px solid #eee8ff",
            background: "#faf8ff",
          }}
        />
      );
    }
    const key = toDateInput(day);
    const dayEvents = eventsByDay[key] || [];
    const today = new Date();
    const isToday = isSameDay(day, today);

    const canCreateHere = scope === SCOPE.individual || canEditGeral;

    return (
      <div
        key={`${idx}-${key}`}
        onDoubleClick={() => {
          if (canCreateHere) openCreateModal(day);
        }}
        style={{
          minHeight: 120,
          padding: 6,
          background: isToday ? "#efeaff" : isInCurrentMonth ? "#fff" : "#faf8ff",
          borderRight: viewMode === VIEW_MODE.month && idx % 7 !== 6 ? "1px solid #eee8ff" : viewMode === VIEW_MODE.week && idx !== 6 ? "1px solid #eee8ff" : "none",
          borderBottom: viewMode === VIEW_MODE.month ? "1px solid #eee8ff" : "none",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          cursor: canCreateHere ? "pointer" : "default",
        }}
        title={canCreateHere ? "Duplo clique para criar evento" : ""}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#24334f" }}>
            {viewMode === VIEW_MODE.month ? day.getDate() : day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
          {dayEvents.length > 0 && (
            <span style={{ fontSize: 10, color: "#5b6f95", fontWeight: 700 }}>{dayEvents.length}</span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {dayEvents.slice(0, 4).map(renderEventChip)}
          {dayEvents.length > 4 && (
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                setViewMode(VIEW_MODE.day);
                setCurrentDate(day);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#6342cc",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
              }}
            >
              +{dayEvents.length - 4} mais
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render lista detalhada da visão "dia"
  const renderDayList = () => {
    const key = toDateInput(currentDate);
    const dayEvents = eventsByDay[key] || [];
    if (dayEvents.length === 0) {
      return (
        <div style={{ padding: 24, color: "#7f8ba1", fontSize: 14, textAlign: "center" }}>
          Nenhum evento para este dia.
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
        {dayEvents.map((evt) => {
          const cor = evt.cor || DEFAULT_COLOR;
          return (
            <div
              key={evt.id}
              onClick={() => openEditModal(evt)}
              style={{
                border: "1px solid #ece4ff",
                borderLeft: `5px solid ${cor}`,
                borderRadius: 10,
                background: "#fff",
                padding: "12px 14px",
                boxShadow: "0 4px 10px rgba(75, 52, 158, 0.06)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <strong style={{ color: "#2a3a56", fontSize: 16 }}>{evt.titulo}</strong>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: cor, borderRadius: 999, padding: "3px 8px" }}>
                    {TYPE_LABEL[evt.tipo] || evt.tipo}
                  </span>
                </div>
              </div>
              <div style={{ color: "#687690", fontSize: 13, fontWeight: 600 }}>
                {formatEventTime(evt)}
              </div>
              {scope === SCOPE.geral && evt.usuario?.nome && (
                <div style={{ color: "#8c82b6", fontSize: 12, marginTop: 4 }}>
                  Criado por: {evt.usuario.nome}
                </div>
              )}
              {evt.descricao_html && (
                <div
                  style={{ marginTop: 8, color: "#4d4868", fontSize: 13, lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: evt.descricao_html }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ===========================================================================
  // JSX
  // ===========================================================================

  return (
    <div style={{ padding: "20px 22px", background: "#f2efff", minHeight: "94vh", color: "#1f2b46" }}>
      {/* Cabeçalho com toggle de escopo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1f2b46" }}>Agenda Delivery</h2>
          <span style={{ fontSize: 12, color: "#7c879f", fontWeight: 600 }}>NVX</span>
        </div>

        <div style={{ display: "inline-flex", border: "1px solid #d8cffb", borderRadius: 8, padding: 2, background: "#fff" }}>
          <button
            type="button"
            onClick={() => setScope(SCOPE.individual)}
            style={tabBtnStyle(scope === SCOPE.individual)}
          >
            Minha agenda
          </button>
          {canViewGeral && (
            <button
              type="button"
              onClick={() => setScope(SCOPE.geral)}
              style={tabBtnStyle(scope === SCOPE.geral)}
            >
              Agenda Geral
            </button>
          )}
        </div>
      </div>

      {/* Barra de navegação */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={handleToday} style={primaryBtn}>Hoje</button>
          <div style={{ display: "inline-flex", border: "1px solid #d8cffb", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
            <button onClick={handlePrev} style={navBtn}>◀</button>
            <button onClick={handleNext} style={{ ...navBtn, borderLeft: "1px solid #d8cffb" }}>▶</button>
          </div>
          <div style={{ display: "inline-flex", gap: 2, border: "1px solid #d8cffb", borderRadius: 8, padding: 2, background: "#fff" }}>
            {[
              { key: VIEW_MODE.month, label: "Mês" },
              { key: VIEW_MODE.week, label: "Semana" },
              { key: VIEW_MODE.day, label: "Dia" },
            ].map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setViewMode(mode.key)}
                style={tabBtnStyle(viewMode === mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0, color: "#23314f", fontSize: 18, fontWeight: 700 }}>{headerLabel}</h3>
          {(scope === SCOPE.individual || canEditGeral) && (
            <button onClick={() => openCreateModal()} style={primaryBtn}>+ Novo evento</button>
          )}
        </div>
      </div>

      {apiError && (
        <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #f3b3b3", background: "#ffe9e9", color: "#9b1f1f", fontSize: 13, fontWeight: 600 }}>
          {apiError}
        </div>
      )}

      {isLoading && (
        <div style={{ marginBottom: 10, color: "#6b7a95", fontSize: 13, fontWeight: 600 }}>
          Carregando eventos...
        </div>
      )}

      {/* Calendário */}
      <div style={{ background: "#fff", border: "1px solid #d8cffb", borderRadius: 10, overflow: "hidden" }}>
        {viewMode !== VIEW_MODE.day && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "1px solid #ece6ff", background: "#faf8ff" }}>
            {WEEKDAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#6d61a8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", padding: "10px 4px" }}>
                {d}
              </div>
            ))}
          </div>
        )}

        {viewMode === VIEW_MODE.month && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {monthDays.map((day, idx) => renderDayCell(day, idx, !!day))}
          </div>
        )}

        {viewMode === VIEW_MODE.week && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {weekDays.map((day, idx) => renderDayCell(day, idx, true))}
          </div>
        )}

        {viewMode === VIEW_MODE.day && renderDayList()}
      </div>

      {/* Modal de evento */}
      {isModalOpen && (
        <EventModal
          mode={modalMode}
          formTitulo={formTitulo} setFormTitulo={setFormTitulo}
          formTipo={formTipo} setFormTipo={setFormTipo}
          formAllDay={formAllDay} setFormAllDay={setFormAllDay}
          formInicioDate={formInicioDate} setFormInicioDate={setFormInicioDate}
          formInicioTime={formInicioTime} setFormInicioTime={setFormInicioTime}
          formFimDate={formFimDate} setFormFimDate={setFormFimDate}
          formFimTime={formFimTime} setFormFimTime={setFormFimTime}
          formCor={formCor} setFormCor={setFormCor}
          formDescricao={formDescricao} setFormDescricao={setFormDescricao}
          formError={formError}
          isSaving={isSaving}
          canEdit={canEditEvent(editingEvent || { escopo: scope })}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "#1f2b46",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: "0 8px 18px rgba(31, 43, 70, 0.25)",
          zIndex: 1500,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Subcomponente: modal de evento
// ===========================================================================

function EventModal({
  mode,
  formTitulo, setFormTitulo,
  formTipo, setFormTipo,
  formAllDay, setFormAllDay,
  formInicioDate, setFormInicioDate,
  formInicioTime, setFormInicioTime,
  formFimDate, setFormFimDate,
  formFimTime, setFormFimTime,
  formCor, setFormCor,
  formDescricao, setFormDescricao,
  formError,
  isSaving,
  canEdit,
  onSave,
  onDelete,
  onClose,
}) {
  const modalRef = useRef(null);
  const isEdit = mode === "edit";

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleBackdropClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  };

  return (
    <div
      onMouseDown={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31, 18, 64, 0.42)",
        zIndex: 1400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: "min(560px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          border: "1px solid #d8cffb",
          borderRadius: 14,
          boxShadow: "0 24px 48px rgba(40, 22, 90, 0.28)",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <strong style={{ color: "#2b1f6d", fontSize: 16 }}>
            {isEdit ? "Editar evento" : "Novo evento"}
          </strong>
          <button onClick={onClose} type="button" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7a6bb5", fontWeight: 700, fontSize: 16 }}>
            ✕
          </button>
        </div>

        <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Título */}
          <div>
            <label style={labelStyle}>Título *</label>
            <input
              value={formTitulo}
              onChange={(e) => setFormTitulo(e.target.value)}
              placeholder="Título do evento"
              style={inputStyle}
              disabled={!canEdit}
              required
            />
          </div>

          {/* Tipo + cor */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
                style={inputStyle}
                disabled={!canEdit}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Cor</label>
              <div style={{ display: "flex", gap: 6 }}>
                {PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => canEdit && setFormCor(c.value)}
                    title={c.label}
                    aria-label={c.label}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: c.value,
                      border: formCor === c.value ? "3px solid #1f2b46" : "2px solid #fff",
                      boxShadow: "0 0 0 1px rgba(120, 108, 165, 0.32)",
                      cursor: canEdit ? "pointer" : "not-allowed",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* All day */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#2f2758", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={formAllDay}
              onChange={(e) => setFormAllDay(e.target.checked)}
              disabled={!canEdit}
            />
            Dia inteiro
          </label>

          {/* Datas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Início</label>
              <input
                type="date"
                value={formInicioDate}
                onChange={(e) => setFormInicioDate(e.target.value)}
                style={inputStyle}
                disabled={!canEdit}
                required
              />
              {!formAllDay && (
                <input
                  type="time"
                  value={formInicioTime}
                  onChange={(e) => setFormInicioTime(e.target.value)}
                  style={{ ...inputStyle, marginTop: 6 }}
                  disabled={!canEdit}
                />
              )}
            </div>
            <div>
              <label style={labelStyle}>Fim (opcional)</label>
              <input
                type="date"
                value={formFimDate}
                onChange={(e) => setFormFimDate(e.target.value)}
                style={inputStyle}
                disabled={!canEdit}
              />
              {!formAllDay && (
                <input
                  type="time"
                  value={formFimTime}
                  onChange={(e) => setFormFimTime(e.target.value)}
                  style={{ ...inputStyle, marginTop: 6 }}
                  disabled={!canEdit}
                />
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>Descrição</label>
            {canEdit ? (
              <RichTextEditor
                value={formDescricao}
                onChange={setFormDescricao}
                placeholder="Detalhes do evento..."
                minHeight={140}
              />
            ) : (
              <div
                style={{ padding: 10, border: "1px solid #d8cffb", borderRadius: 8, background: "#faf8ff", minHeight: 80 }}
                dangerouslySetInnerHTML={{ __html: formDescricao || "<em>(sem descrição)</em>" }}
              />
            )}
          </div>

          {formError && (
            <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #f3b3b3", background: "#ffe9e9", color: "#9b1f1f", fontSize: 13, fontWeight: 600 }}>
              {formError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
            <div>
              {isEdit && canEdit && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isSaving}
                  style={{
                    border: "1px solid #ffb9c6",
                    background: "#fff1f4",
                    color: "#a4001d",
                    padding: "9px 14px",
                    borderRadius: 8,
                    cursor: isSaving ? "wait" : "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  Excluir
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  border: "1px solid #d4c8fb",
                  background: "#faf7ff",
                  color: "#4b2d84",
                  padding: "9px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              {canEdit && (
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    background: "#6c3bff",
                    color: "#fff",
                    border: "none",
                    padding: "9px 18px",
                    borderRadius: 8,
                    cursor: isSaving ? "wait" : "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===========================================================================
// Estilos auxiliares
// ===========================================================================

const labelStyle = {
  display: "block",
  fontSize: 12,
  color: "#5f4e8f",
  fontWeight: 700,
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid #d8cffb",
  borderRadius: 8,
  outline: "none",
  fontSize: 13,
  background: "#fff",
  color: "#2f2758",
  boxSizing: "border-box",
};

const primaryBtn = {
  padding: "8px 14px",
  background: "#6c3bff",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};

const navBtn = {
  padding: "8px 12px",
  border: "none",
  background: "#fff",
  cursor: "pointer",
  color: "#5d4d9f",
  fontWeight: 700,
};

const tabBtnStyle = (isActive) => ({
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  background: isActive ? "#efe9ff" : "transparent",
  color: isActive ? "#5a3cb8" : "#8a96ad",
});
