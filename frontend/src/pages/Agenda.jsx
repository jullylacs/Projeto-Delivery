import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

// Nomes dos meses para exibição
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TASK_STATUS = {
  planejado: "Planejado",
  andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const TASK_STATUS_COLORS = {
  planejado: {
    panelBg: "#f3efff",
    panelBorder: "#d8ccff",
    panelTitle: "#4d3ea9",
    chipBg: "#ece4ff",
    chipText: "#563dbd",
    taskBorder: "#d7c9ff",
  },
  andamento: {
    panelBg: "#fff5ea",
    panelBorder: "#ffd9b0",
    panelTitle: "#b25b10",
    chipBg: "#ffe8cf",
    chipText: "#9c500f",
    taskBorder: "#ffd9b0",
  },
  concluido: {
    panelBg: "#ebf8ef",
    panelBorder: "#bfe9cd",
    panelTitle: "#1f7a3f",
    chipBg: "#dff4e7",
    chipText: "#1f7a3f",
    taskBorder: "#bfe9cd",
  },
  cancelado: {
    panelBg: "#fff5f5",
    panelBorder: "#fecaca",
    panelTitle: "#b91c1c",
    chipBg: "#fee2e2",
    chipText: "#b91c1c",
    taskBorder: "#fecaca",
  },
};

const AGENDA_PREFS_KEY = "agendaPrefs";

const VIEW_MODE = {
  month: "month",
  week: "week",
  day: "day",
};

const UI_STATUS_TO_API = {
  planejado: "pendente",
  andamento: "em_execucao",
  concluido: "finalizado",
  cancelado: "cancelado",
};

const API_STATUS_TO_UI = {
  pendente: "planejado",
  confirmado: "planejado",
  reagendado: "planejado",
  em_execucao: "andamento",
  finalizado: "concluido",
  cancelado: "cancelado",
};

const toUiStatus = (apiStatus) => API_STATUS_TO_UI[apiStatus] || "planejado";
const toApiStatus = (uiStatus) => UI_STATUS_TO_API[uiStatus] || "pendente";

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const startOfWeek = (date) => {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  base.setDate(base.getDate() - base.getDay());
  return base;
};

const shiftDate = (date, amountInDays) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amountInDays);
  return next;
};

const parseDateOrNow = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const readAgendaPrefs = () => {
  try {
    const raw = localStorage.getItem(AGENDA_PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export default function Agenda() {
  // Estados principais
  const [currentDate, setCurrentDate] = useState(() => {
    const prefs = readAgendaPrefs();
    return prefs.currentDate ? parseDateOrNow(prefs.currentDate) : new Date();
  }); // Mês atualmente exibido
  const [selectedDate, setSelectedDate] = useState(() => {
    const prefs = readAgendaPrefs();
    return prefs.selectedDate ? parseDateOrNow(prefs.selectedDate) : new Date();
  }); // Dia selecionado
  const [taskTitle, setTaskTitle] = useState(""); // Título da tarefa
  const [taskTime, setTaskTime] = useState(""); // Horário da tarefa
  const [taskNotes, setTaskNotes] = useState(""); // Notas da tarefa
  const [taskStatus, setTaskStatus] = useState("planejado"); // Status inicial da tarefa
  const [tasks, setTasks] = useState({}); // Objeto que armazena tarefas por data
  const [editingNoteId, setEditingNoteId] = useState(null); // ID da tarefa que está sendo editada
  const [editingNoteValue, setEditingNoteValue] = useState(""); // Valor temporário da nota em edição
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedTaskSourceKey, setDraggedTaskSourceKey] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dragOverDayKey, setDragOverDayKey] = useState(null);
  const [expandedDays, setExpandedDays] = useState(() => readAgendaPrefs().expandedDays || {}); // Controle de expansão de tarefas por dia no calendário
  const [viewMode, setViewMode] = useState(() => readAgendaPrefs().viewMode || VIEW_MODE.month);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDate, setTaskModalDate] = useState(() => new Date());
  const [taskModalPosition, setTaskModalPosition] = useState({ x: 0, y: 0 });
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [apiError, setApiError] = useState("");
  const taskModalRef = useRef(null);

  // Carrega tarefas da API ao iniciar o componente
  useEffect(() => {
    const loadSchedules = async () => {
      setApiError("");

      try {
        const response = await api.get("/schedules");
        const list = Array.isArray(response.data) ? response.data : [];
        const grouped = {};

        list.forEach((item) => {
          if (!item?.data) return;

          const day = parseDateOrNow(item.data);
          const key = getLocalDateKey(day);
          const task = {
            id: item.id,
            title: String(item.titulo || "").trim() || "(Sem título)",
            time: String(item.horario || "").trim() || "--",
            notes: String(item.notas || "").trim(),
            status: toUiStatus(item.status),
          };

          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(task);
        });

        setTasks(grouped);
      } catch {
        setApiError("Não foi possível carregar tarefas da API.");
        setTasks({});
      } finally {
        setIsLoadingTasks(false);
      }

    };

    loadSchedules();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      AGENDA_PREFS_KEY,
      JSON.stringify({
        currentDate: currentDate.toISOString(),
        selectedDate: selectedDate.toISOString(),
        expandedDays,
        viewMode,
      })
    );
  }, [currentDate, selectedDate, expandedDays, viewMode]);

  // Determina o primeiro e o último dia do mês atual
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Gera os dias do calendário (incluindo preenchimentos nulos para alinhamento)
  const days = useMemo(() => {
    const result = [];
    const startOffset = firstDayOfMonth.getDay(); // Dia da semana do primeiro dia do mês
    const totalDays = lastDayOfMonth.getDate(); // Quantidade de dias no mês

    // Adiciona dias nulos para alinhar o primeiro dia da semana
    for (let i = 0; i < startOffset; i++) {
      result.push(null);
    }

    // Adiciona os dias reais do mês
    for (let day = 1; day <= totalDays; day++) {
      result.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    }

    // Adiciona dias nulos ao final para completar a última linha da semana
    while (result.length % 7 !== 0) {
      result.push(null);
    }

    return result;
  }, [currentDate, firstDayOfMonth, lastDayOfMonth]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
  }, [currentDate]);

  // Chave para acessar as tarefas do dia selecionado no objeto 'tasks'
  const selectedKey = getLocalDateKey(selectedDate);
  const dayTasks = tasks[selectedKey] || []; // Lista de tarefas do dia selecionado

  const groupedDayTasks = useMemo(() => {
    return {
      planejado: dayTasks.filter((t) => (t.status || "planejado") === "planejado"),
      andamento: dayTasks.filter((t) => (t.status || "planejado") === "andamento"),
      concluido: dayTasks.filter((t) => (t.status || "planejado") === "concluido"),
      cancelado: dayTasks.filter((t) => (t.status || "planejado") === "cancelado"),
    };
  }, [dayTasks]);

  const clearTaskForm = () => {
    setTaskTitle("");
    setTaskTime("");
    setTaskNotes("");
    setTaskStatus("planejado");
  };

  const clampPopupPosition = (x, y) => {
    const maxX = Math.max(16, window.innerWidth - 360);
    const maxY = Math.max(16, window.innerHeight - 320);
    return {
      x: Math.min(Math.max(16, x), maxX),
      y: Math.min(Math.max(16, y), maxY),
    };
  };

  const openTaskModal = (day, event) => {
    event.preventDefault();
    event.stopPropagation();

    const safeDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    setSelectedDate(safeDay);
    setCurrentDate(safeDay);
    setTaskModalDate(safeDay);
    clearTaskForm();

    const nextPos = clampPopupPosition(event.clientX + 8, event.clientY + 8);
    setTaskModalPosition(nextPos);
    setIsTaskModalOpen(true);
  };

  // Função para adicionar uma nova tarefa
  const addTask = async (e, targetDate = selectedDate) => {
    e.preventDefault();
    if (!taskTitle.trim()) return; // Evita adicionar tarefas vazias

    const targetKey = getLocalDateKey(targetDate);

    try {
      const payload = {
        titulo: taskTitle.trim(),
        notas: taskNotes.trim(),
        data: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).toISOString(),
        horario: taskTime || null,
        status: toApiStatus(taskStatus),
        card_id: null,
        tecnico_id: null,
      };

      const response = await api.post("/schedules", payload);
      const created = response.data;
      const newTask = {
        id: created.id,
        title: created.titulo || payload.titulo,
        time: created.horario || "--",
        notes: created.notas || payload.notas,
        status: toUiStatus(created.status || payload.status),
      };

      setTasks((prev) => ({
        ...prev,
        [targetKey]: [...(prev[targetKey] || []), newTask],
      }));

      clearTaskForm();
      setIsTaskModalOpen(false);
      setApiError("");
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      setApiError(`Não foi possível salvar a tarefa na API.${message ? ` (${message})` : ""}`);
    }
  };

  // Função para remover uma tarefa pelo ID
  const removeTask = async (id) => {
    try {
      await api.delete(`/schedules/${id}`);
      setTasks((prev) => {
        const updated = (prev[selectedKey] || []).filter((t) => t.id !== id); // Filtra a tarefa
        const next = { ...prev };
        if (updated.length > 0) next[selectedKey] = updated; // Mantém a lista se ainda houver tarefas
        else delete next[selectedKey]; // Remove a chave se não houver tarefas restantes
        return next;
      });
      setApiError("");
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      setApiError(`Não foi possível remover a tarefa da API.${message ? ` (${message})` : ""}`);
    }
  };

  // Inicia edição de nota de uma tarefa
  const startEditNote = (task) => {
    setEditingNoteId(task.id);
    setEditingNoteValue(task.notes || "");
  };

  // Cancela edição de nota
  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteValue("");
  };

  // Salva nota editada
  const saveEditNote = async (task) => {
    try {
      await api.put(`/schedules/${task.id}`, { notas: editingNoteValue });
      setTasks((prev) => {
        const updated = (prev[selectedKey] || []).map((t) =>
          t.id === task.id ? { ...t, notes: editingNoteValue } : t
        );
        return { ...prev, [selectedKey]: updated };
      });
      setEditingNoteId(null);
      setEditingNoteValue("");
      setApiError("");
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      setApiError(`Não foi possível salvar a nota na API.${message ? ` (${message})` : ""}`);
    }
  };

  const moveTaskStatus = async (taskId, nextStatus) => {
    try {
      await api.put(`/schedules/${taskId}`, { status: toApiStatus(nextStatus) });
      setTasks((prev) => {
        const updated = (prev[selectedKey] || []).map((t) =>
          t.id === taskId ? { ...t, status: nextStatus } : t
        );
        return { ...prev, [selectedKey]: updated };
      });
      setApiError("");
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      setApiError(`Não foi possível atualizar o status na API.${message ? ` (${message})` : ""}`);
    }
  };

  const handleTaskDragStart = (taskId, sourceKey, event) => {
    setDraggedTaskId(taskId);
    setDraggedTaskSourceKey(sourceKey);

    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify({ taskId, sourceKey }));
    }
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDraggedTaskSourceKey(null);
    setDragOverStatus(null);
    setDragOverDayKey(null);
  };

  const moveTaskToDay = async (taskId, fromKey, toDay) => {
    const toKey = getLocalDateKey(toDay);
    if (fromKey === toKey) return;

    const task = (tasks[fromKey] || []).find((t) => t.id === taskId);
    if (!task) return;

    const newDate = new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate()).toISOString();

    try {
      await api.put(`/schedules/${taskId}`, { data: newDate });
      setTasks((prev) => {
        const from = (prev[fromKey] || []).filter((t) => t.id !== taskId);
        const to = [...(prev[toKey] || []), { ...task }];
        const next = { ...prev, [fromKey]: from, [toKey]: to };
        if (next[fromKey].length === 0) delete next[fromKey];
        return next;
      });
      setSelectedDate(toDay);
      setCurrentDate(toDay);
      setApiError("");
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      setApiError(`Não foi possível mover a tarefa.${message ? ` (${message})` : ""}`);
    }
  };

  const handleStatusDrop = (statusKey, event) => {
    const raw = event?.dataTransfer?.getData("text/plain");
    let candidateTaskId = draggedTaskId;
    try { candidateTaskId = JSON.parse(raw).taskId; } catch { candidateTaskId = Number(raw) || draggedTaskId; }
    if (!candidateTaskId) return;

    moveTaskStatus(candidateTaskId, statusKey);
    setDraggedTaskId(null);
    setDragOverStatus(null);
  };

  const toggleDayExpanded = (dayKey) => {
    setExpandedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  const handlePrevious = () => {
    if (viewMode === VIEW_MODE.month) {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
      return;
    }

    const delta = viewMode === VIEW_MODE.week ? -7 : -1;
    setCurrentDate((d) => shiftDate(d, delta));
    setSelectedDate((d) => shiftDate(d, delta));
  };

  const handleNext = () => {
    if (viewMode === VIEW_MODE.month) {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
      return;
    }

    const delta = viewMode === VIEW_MODE.week ? 7 : 1;
    setCurrentDate((d) => shiftDate(d, delta));
    setSelectedDate((d) => shiftDate(d, delta));
  };

  const handleSelectDay = (day) => {
    setSelectedDate(day);
    setCurrentDate(day);
  };

  const handleEnterDayView = (day) => {
    setSelectedDate(day);
    setCurrentDate(day);
    setViewMode(VIEW_MODE.day);
  };

  useEffect(() => {
    if (!isTaskModalOpen) return;

    const handlePointerDown = (event) => {
      if (taskModalRef.current && !taskModalRef.current.contains(event.target)) {
        setIsTaskModalOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsTaskModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isTaskModalOpen]);

  const headerLabel = useMemo(() => {
    if (viewMode === VIEW_MODE.month) {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    if (viewMode === VIEW_MODE.week) {
      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];
      return `${weekStart.toLocaleDateString("pt-BR")} - ${weekEnd.toLocaleDateString("pt-BR")}`;
    }

    return selectedDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [currentDate, selectedDate, viewMode, weekDays]);

  const renderDayCard = (day, idx) => {
    const isSelected = isSameDay(day, selectedDate);
    const key = getLocalDateKey(day);
    const dayTaskCount = (tasks[key] || []).length;
    const dayTaskItems = (tasks[key] || [])
      .filter((t) => t?.title)
      .map((t) => ({ title: t.title, status: t.status || "planejado", time: t.time || "--" }));
    const dayTaskCards = (tasks[key] || []).filter((t) => t?.title);
    const isExpanded = !!expandedDays[key];
    const visibleTaskItems = isExpanded ? dayTaskItems : dayTaskItems.slice(0, 5);

    return (
      <div
        key={`${idx}-${key}`}
        onClick={() => handleSelectDay(day)}
        onDoubleClick={() => handleEnterDayView(day)}
        onContextMenu={(event) => openTaskModal(day, event)}
        title="Duplo clique para abrir o dia"
        onDragOver={(e) => { if (draggedTaskId) { e.preventDefault(); setDragOverDayKey(key); } }}
        onDragEnter={(e) => { if (draggedTaskId) { e.preventDefault(); setDragOverDayKey(key); } }}
        onDragLeave={() => setDragOverDayKey((cur) => cur === key ? null : cur)}
        onDrop={(e) => {
          e.preventDefault();
          const raw = e.dataTransfer?.getData("text/plain");
          let taskId = draggedTaskId;
          let sourceKey = draggedTaskSourceKey;
          try { const p = JSON.parse(raw); taskId = p.taskId; sourceKey = p.sourceKey; } catch {}
          if (taskId && sourceKey) moveTaskToDay(taskId, sourceKey, day);
          setDragOverDayKey(null);
        }}
        style={{
          minHeight: viewMode === VIEW_MODE.day ? "340px" : "120px",
          borderRight:
            viewMode === VIEW_MODE.month && idx % 7 !== 6 ? "1px solid #f0ebff" :
            viewMode === VIEW_MODE.week && idx !== 6 ? "1px solid #f0ebff" :
            "none",
          borderBottom: viewMode === VIEW_MODE.month ? "1px solid #f0ebff" : "none",
          background: dragOverDayKey === key ? "#ede8ff" : isSelected ? "#f0ebff" : isToday(day) ? "#fdfcff" : "#fff",
          outline: dragOverDayKey === key ? "2px solid #7a4dff" : "none",
          outlineOffset: "-2px",
          cursor: draggedTaskId ? "copy" : "pointer",
          padding: "7px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "relative",
          transition: "background 120ms ease, outline 120ms ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: isToday(day) ? "#fff" : isSelected ? "#4c1d95" : "#24334f",
            background: isToday(day) ? "linear-gradient(135deg,#7a4dff,#9d4edd)" : "transparent",
            borderRadius: isToday(day) ? "50%" : 0,
            width: isToday(day) ? 22 : "auto",
            height: isToday(day) ? 22 : "auto",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isToday(day) ? "0 2px 6px rgba(124,77,255,0.4)" : "none",
          }}>
            {viewMode === VIEW_MODE.day
              ? day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
              : day.getDate()}
          </span>
          {dayTaskCount > 0 && <span style={{ fontSize: 10, color: "#9580c8", fontWeight: 700, background: "#ede8ff", borderRadius: 999, padding: "1px 5px" }}>{dayTaskCount}</span>}
        </div>

        {viewMode === VIEW_MODE.day ? (
          dayTaskCards.length === 0 ? (
            <div style={{ marginTop: 8, color: "#7f8ba1", fontSize: 14 }}>Nenhuma tarefa para este dia.</div>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
              {dayTaskCards.map((task) => {
                const statusKey = task.status || "planejado";
                const statusPalette = TASK_STATUS_COLORS[statusKey] || TASK_STATUS_COLORS.planejado;

                return (
                  <div
                    key={`${key}-task-card-${task.id}`}
                    style={{
                      border: `1px solid ${statusPalette.taskBorder}`,
                      borderLeft: `4px solid ${statusPalette.panelTitle}`,
                      borderRadius: 10,
                      background: "#ffffff",
                      padding: "10px 12px",
                      boxShadow: "0 4px 10px rgba(75, 52, 158, 0.08)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <strong style={{ color: "#2a3a56", fontSize: 15, lineHeight: 1.25 }}>{task.title}</strong>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusPalette.chipText, background: statusPalette.chipBg, border: `1px solid ${statusPalette.taskBorder}`, borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap" }}>
                        {TASK_STATUS[statusKey] || TASK_STATUS.planejado}
                      </span>
                    </div>

                    <div style={{ color: "#687690", fontSize: 12, fontWeight: 600 }}>
                      {task.time && task.time !== "--" ? task.time : "Sem horário"}
                    </div>

                    {task.notes && (
                      <p style={{ margin: "8px 0 0", color: "#5f6d86", fontSize: 13, lineHeight: 1.35 }}>{task.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <>
            <div style={{ display: "grid", gap: 4 }}>
              {visibleTaskItems.map((task, taskIndex) => (
                <div
                  key={`${key}-task-${taskIndex}`}
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.35,
                    color: TASK_STATUS_COLORS[task.status]?.chipText || "#4f4291",
                    background: TASK_STATUS_COLORS[task.status]?.chipBg || "#eef3ff",
                    borderLeft: `3px solid ${TASK_STATUS_COLORS[task.status]?.chipText || "#6f83a7"}`,
                    borderRadius: 4,
                    padding: "4px 7px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {task.time !== "--" ? `${task.time} ` : ""}{task.title}
                </div>
              ))}
            </div>

            {dayTaskCount > 5 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDayExpanded(key);
                }}
                style={{
                  marginTop: "auto",
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  color: "#6342cc",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {isExpanded ? "Ler menos" : `Ler mais (+${dayTaskCount - 5})`}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  const today = new Date();
  const isToday = (d) => isSameDay(d, today);

  const inputStyle = {
    padding: "9px 12px",
    border: "1px solid #ddd6ff",
    borderRadius: "9px",
    outline: "none",
    fontSize: 13,
    background: "#faf8ff",
    color: "#1f2b46",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 160ms ease",
  };

  // Renderização do componente
  return (
    <div style={{ padding: "16px 20px", background: "#f2efff", minHeight: "94vh", color: "#1f2b46", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Cabeçalho ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <h2 style={{ margin: 0, color: "#1f2b46", fontSize: "22px", fontWeight: 700, lineHeight: 1.1 }}>
              Calendário <span style={{ fontSize: 12, color: "#9580c8", fontWeight: 600, letterSpacing: "0.4px" }}>NVX</span>
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#7c6fb7", fontWeight: 500 }}>{headerLabel}</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Legenda de status */}
          <div style={{ display: "flex", gap: 5, marginRight: 4 }}>
            {Object.entries(TASK_STATUS).map(([statusKey, statusLabel]) => (
              <span key={statusKey} style={{ fontSize: 11, fontWeight: 700, color: TASK_STATUS_COLORS[statusKey].chipText, background: TASK_STATUS_COLORS[statusKey].chipBg, border: `1px solid ${TASK_STATUS_COLORS[statusKey].taskBorder}`, borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap" }}>
                {statusLabel}
              </span>
            ))}
          </div>

          {/* Botão Hoje */}
          <button
            onClick={() => { const now = new Date(); setCurrentDate(now); setSelectedDate(now); }}
            style={{ padding: "7px 14px", background: "linear-gradient(135deg, #7a4dff, #9d4edd)", color: "#fff", border: "none", borderRadius: "9px", cursor: "pointer", fontWeight: 700, fontSize: 12, boxShadow: "0 3px 10px rgba(124,77,255,0.35)", letterSpacing: "0.2px" }}
          >
            Hoje
          </button>

          {/* Nav prev/next */}
          <div style={{ display: "inline-flex", border: "1px solid #ddd6ff", borderRadius: "9px", overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(76,29,149,0.07)" }}>
            <button onClick={handlePrevious} style={{ padding: "7px 11px", border: "none", borderRight: "1px solid #ddd6ff", background: "#fff", cursor: "pointer", color: "#5d4d9f", fontWeight: 700, fontSize: 13 }}>‹</button>
            <button onClick={handleNext}     style={{ padding: "7px 11px", border: "none", background: "#fff", cursor: "pointer", color: "#5d4d9f", fontWeight: 700, fontSize: 13 }}>›</button>
          </div>

          {/* Seletor de view */}
          <div style={{ display: "inline-flex", gap: 2, border: "1px solid #ddd6ff", borderRadius: 9, padding: 2, background: "#fff", boxShadow: "0 1px 3px rgba(76,29,149,0.07)" }}>
            {[{ key: VIEW_MODE.month, label: "Mês" }, { key: VIEW_MODE.week, label: "Semana" }, { key: VIEW_MODE.day, label: "Dia" }].map((mode) => {
              const isActive = viewMode === mode.key;
              return (
                <button key={mode.key} type="button" onClick={() => setViewMode(mode.key)} style={{ padding: "5px 11px", fontSize: 12, fontWeight: 700, borderRadius: 7, border: "none", cursor: "pointer", background: isActive ? "linear-gradient(135deg, #7a4dff, #9d4edd)" : "transparent", color: isActive ? "#fff" : "#8a96ad", transition: "background 150ms ease, color 150ms ease", boxShadow: isActive ? "0 2px 6px rgba(124,77,255,0.3)" : "none" }}>
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Erros e loading */}
      {apiError && (
        <div style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid #fecaca", background: "#fff5f5", color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>
          {apiError}
        </div>
      )}
      {isLoadingTasks && (
        <div style={{ color: "#7c6fb7", fontSize: 13, fontWeight: 500 }}>Carregando tarefas…</div>
      )}

      {/* ── Layout principal: calendário + painel lateral ── */}
      <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0, alignItems: "flex-start" }}>

        {/* Calendário */}
        <div style={{ flex: 1, minWidth: 0, background: "#fff", border: "1px solid #ddd6ff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(76,29,149,0.07)" }}>
          {/* Dias da semana */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "2px solid #ede8ff", background: "linear-gradient(180deg, #faf8ff, #f5f1ff)" }}>
            {WEEKDAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#7c6fb7", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", padding: "10px 4px" }}>
                {d}
              </div>
            ))}
          </div>

          {viewMode === VIEW_MODE.month && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
              {days.map((day, idx) =>
                day ? renderDayCard(day, idx) : (
                  <div key={`${idx}-empty`} style={{ minHeight: "120px", borderRight: idx % 7 !== 6 ? "1px solid #f0ebff" : "none", borderBottom: "1px solid #f0ebff", background: "#faf8ff" }} />
                )
              )}
            </div>
          )}
          {viewMode === VIEW_MODE.week && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
              {weekDays.map((day, idx) => renderDayCard(day, idx))}
            </div>
          )}
          {viewMode === VIEW_MODE.day && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
              {renderDayCard(selectedDate, 0)}
            </div>
          )}
        </div>

        {/* ── Painel lateral de tarefas ── */}
        <div style={{ width: 300, flexShrink: 0, background: "#fff", border: "1px solid #ddd6ff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(76,29,149,0.07)", display: "flex", flexDirection: "column" }}>
          {/* Cabeçalho do painel */}
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #ede8ff", background: "linear-gradient(180deg, #faf8ff, #f5f1ff)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2b46" }}>
              {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>
            <div style={{ fontSize: 12, color: "#9580c8", marginTop: 2 }}>
              {dayTasks.length === 0 ? "Nenhuma tarefa" : `${dayTasks.length} tarefa${dayTasks.length !== 1 ? "s" : ""}`}
            </div>
          </div>

          {/* Colunas de status */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {dayTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 12px", color: "#9580c8", fontSize: 13, lineHeight: 1.6 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                Nenhuma tarefa para este dia.<br />
                <span style={{ fontSize: 12, opacity: 0.7 }}>Clique com o botão direito no dia para criar.</span>
              </div>
            ) : (
              Object.entries(TASK_STATUS).map(([statusKey, statusLabel]) => {
                const palette = TASK_STATUS_COLORS[statusKey];
                const isDropTarget = dragOverStatus === statusKey;
                return (
                  <div
                    key={statusKey}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => dragOverStatus !== statusKey && setDragOverStatus(statusKey)}
                    onDrop={(e) => { e.preventDefault(); handleStatusDrop(statusKey, e); }}
                    onDragLeave={() => dragOverStatus === statusKey && setDragOverStatus(null)}
                    style={{
                      background: isDropTarget ? palette.panelBg : "#fdfcff",
                      border: `1px solid ${isDropTarget ? palette.panelTitle : palette.panelBorder}`,
                      borderLeft: `3px solid ${palette.panelTitle}`,
                      borderRadius: 10,
                      padding: "8px 10px",
                      transition: "border-color 150ms ease, background 150ms ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: palette.panelTitle, textTransform: "uppercase", letterSpacing: "0.5px" }}>{statusLabel}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: palette.chipText, background: palette.chipBg, borderRadius: 999, padding: "1px 7px", border: `1px solid ${palette.taskBorder}` }}>{groupedDayTasks[statusKey].length}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {groupedDayTasks[statusKey].length === 0 && (
                        <div style={{ fontSize: 12, color: "#b0b8cc", padding: "4px 2px", fontStyle: "italic" }}>Sem tarefas</div>
                      )}
                      {groupedDayTasks[statusKey].map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleTaskDragStart(task.id, selectedKey, e)}
                          onDragEnd={handleTaskDragEnd}
                          style={{ border: `1px solid ${palette.taskBorder}`, borderRadius: 8, padding: "8px 10px", background: "#fff", position: "relative", cursor: "grab", opacity: draggedTaskId === task.id ? 0.55 : 1, userSelect: "none", boxShadow: "0 1px 3px rgba(76,29,149,0.05)", transition: "opacity 150ms ease" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, paddingRight: 18 }}>
                            <strong style={{ display: "block", color: "#2a3a56", fontSize: 13.5, lineHeight: 1.3, fontWeight: 600 }}>{task.title}</strong>
                          </div>
                          {task.time && task.time !== "--" && (
                            <span style={{ display: "inline-block", marginTop: 3, color: palette.chipText, fontSize: 11, fontWeight: 700, background: palette.chipBg, borderRadius: 6, padding: "1px 6px" }}>⏰ {task.time}</span>
                          )}

                          {editingNoteId === task.id ? (
                            <div style={{ marginTop: 6 }}>
                              <textarea value={editingNoteValue} onChange={(e) => setEditingNoteValue(e.target.value)} style={{ ...inputStyle, minHeight: 48, resize: "vertical" }} autoFocus />
                              <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                                <button type="button" onClick={() => saveEditNote(task)} style={{ background: "linear-gradient(135deg,#7a4dff,#9d4edd)", color: "#fff", border: "none", borderRadius: 7, padding: "4px 12px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Salvar</button>
                                <button type="button" onClick={cancelEditNote} style={{ background: "#f0ebff", color: "#5f529e", border: "none", borderRadius: 7, padding: "4px 10px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {task.notes && <p style={{ margin: "5px 0 0", fontSize: 12, lineHeight: 1.4, color: "#7a6ea8" }}>{task.notes}</p>}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5 }}>
                                <button onClick={() => startEditNote(task)} style={{ background: "transparent", color: "#7a4dff", border: "none", fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 600 }}>Editar nota</button>
                                <span style={{ fontSize: 10, color: "#c4b5fd" }}>⠿ arrastar</span>
                              </div>
                            </>
                          )}

                          <button onClick={() => removeTask(task.id)} style={{ position: "absolute", top: 6, right: 6, background: "transparent", border: "none", color: "#c4b5fd", cursor: "pointer", fontWeight: 700, fontSize: 11, lineHeight: 1, padding: 2 }}
                            onMouseEnter={e => e.currentTarget.style.color = "#b91c1c"}
                            onMouseLeave={e => e.currentTarget.style.color = "#c4b5fd"}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de nova tarefa ── */}
      {isTaskModalOpen && (
        <div
          ref={taskModalRef}
          style={{ position: "fixed", top: taskModalPosition.y, left: taskModalPosition.x, width: "min(320px, calc(100vw - 28px))", background: "#fff", border: "1px solid #ddd6ff", borderRadius: 14, boxShadow: "0 20px 48px rgba(67,40,154,0.2)", zIndex: 1200, overflow: "hidden" }}
        >
          {/* Header do modal */}
          <div style={{ padding: "14px 16px 10px", background: "linear-gradient(90deg, #3d1472, #4c1d95)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>Nova tarefa</strong>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 1 }}>
                {taskModalDate.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
              </div>
            </div>
            <button type="button" onClick={() => setIsTaskModalOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            >✕</button>
          </div>

          <form onSubmit={(e) => addTask(e, taskModalDate)} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px" }}>
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Título da tarefa *" style={inputStyle} required
              onFocus={e => e.target.style.borderColor = "rgba(124,77,255,0.6)"}
              onBlur={e => e.target.style.borderColor = "#ddd6ff"}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(124,77,255,0.6)"}
                onBlur={e => e.target.style.borderColor = "#ddd6ff"}
              />
              <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)} style={{ ...inputStyle, fontWeight: 600, color: TASK_STATUS_COLORS[taskStatus]?.chipText || "#5f529e" }}>
                <option value="planejado">Planejado</option>
                <option value="andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <textarea value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} placeholder="Notas (opcional)" style={{ ...inputStyle, minHeight: 68, resize: "vertical" }}
              onFocus={e => e.target.style.borderColor = "rgba(124,77,255,0.6)"}
              onBlur={e => e.target.style.borderColor = "#ddd6ff"}
            />
            <button type="submit" style={{ background: "linear-gradient(135deg,#7a4dff,#9d4edd)", color: "#fff", padding: "10px", border: "none", borderRadius: "9px", cursor: "pointer", fontWeight: 700, fontSize: 13, boxShadow: "0 3px 10px rgba(124,77,255,0.35)", transition: "transform 150ms ease" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              Adicionar tarefa
            </button>
          </form>
        </div>
      )}
    </div>
  );
}