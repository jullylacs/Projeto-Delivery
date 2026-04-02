import { useEffect, useMemo, useState } from "react";

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
};

const AGENDA_PREFS_KEY = "agendaPrefs";

const VIEW_MODE = {
  month: "month",
  week: "week",
  day: "day",
};

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
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.innerWidth < 1500);
  const [expandedDays, setExpandedDays] = useState(() => readAgendaPrefs().expandedDays || {}); // Controle de expansão de tarefas por dia no calendário
  const [viewMode, setViewMode] = useState(() => readAgendaPrefs().viewMode || VIEW_MODE.month);

  useEffect(() => {
    const onResize = () => setIsCompactLayout(window.innerWidth < 1500);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Carrega tarefas do localStorage ao iniciar o componente
  useEffect(() => {
    const stored = localStorage.getItem("agendaTasks");
    if (stored) setTasks(JSON.parse(stored));
  }, []);

  // Salva tarefas no localStorage sempre que o estado 'tasks' muda
  useEffect(() => {
    localStorage.setItem("agendaTasks", JSON.stringify(tasks));
  }, [tasks]);

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
  const selectedKey = selectedDate.toISOString().split("T")[0];
  const dayTasks = tasks[selectedKey] || []; // Lista de tarefas do dia selecionado

  const groupedDayTasks = useMemo(() => {
    return {
      planejado: dayTasks.filter((t) => (t.status || "planejado") === "planejado"),
      andamento: dayTasks.filter((t) => (t.status || "planejado") === "andamento"),
      concluido: dayTasks.filter((t) => (t.status || "planejado") === "concluido"),
    };
  }, [dayTasks]);

  // Função para adicionar uma nova tarefa
  const addTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return; // Evita adicionar tarefas vazias

    // Cria objeto da nova tarefa
    const newTask = {
      id: Date.now(), // ID único baseado em timestamp
      title: taskTitle.trim(),
      time: taskTime || "--", // Horário opcional
      notes: taskNotes.trim(), // Notas opcionais
      status: taskStatus,
    };

    // Atualiza o estado 'tasks', adicionando a tarefa no dia selecionado
    setTasks((prev) => ({
      ...prev,
      [selectedKey]: [...(prev[selectedKey] || []), newTask],
    }));

    // Limpa os campos do formulário após adicionar a tarefa
    setTaskTitle("");
    setTaskTime("");
    setTaskNotes("");
    setTaskStatus("planejado");
  };

  // Função para remover uma tarefa pelo ID
  const removeTask = (id) => {
    setTasks((prev) => {
      const updated = (prev[selectedKey] || []).filter((t) => t.id !== id); // Filtra a tarefa
      const next = { ...prev };
      if (updated.length > 0) next[selectedKey] = updated; // Mantém a lista se ainda houver tarefas
      else delete next[selectedKey]; // Remove a chave se não houver tarefas restantes
      return next;
    });
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
  const saveEditNote = (task) => {
    setTasks((prev) => {
      const updated = (prev[selectedKey] || []).map((t) =>
        t.id === task.id ? { ...t, notes: editingNoteValue } : t
      );
      return { ...prev, [selectedKey]: updated };
    });
    setEditingNoteId(null);
    setEditingNoteValue("");
  };

  const moveTaskStatus = (taskId, nextStatus) => {
    setTasks((prev) => {
      const updated = (prev[selectedKey] || []).map((t) =>
        t.id === taskId ? { ...t, status: nextStatus } : t
      );
      return { ...prev, [selectedKey]: updated };
    });
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
    const key = day.toISOString().split("T")[0];
    const dayTaskCount = (tasks[key] || []).length;
    const dayTaskItems = (tasks[key] || [])
      .filter((t) => t?.title)
      .map((t) => ({ title: t.title, status: t.status || "planejado", time: t.time || "--" }));
    const isExpanded = !!expandedDays[key];
    const visibleTaskItems = isExpanded ? dayTaskItems : dayTaskItems.slice(0, 5);

    return (
      <div
        key={`${idx}-${key}`}
        onClick={() => handleSelectDay(day)}
        style={{
          minHeight: viewMode === VIEW_MODE.day ? "340px" : "152px",
          borderRight:
            viewMode === VIEW_MODE.month && idx % 7 !== 6 ? "1px solid #eee8ff" :
            viewMode === VIEW_MODE.week && idx !== 6 ? "1px solid #eee8ff" :
            "none",
          borderBottom: viewMode === VIEW_MODE.month ? "1px solid #eee8ff" : "none",
          background: isSelected ? "#efeaff" : "#fff",
          cursor: "pointer",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#24334f" }}>
            {viewMode === VIEW_MODE.day
              ? day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
              : day.getDate()}
          </span>
          {dayTaskCount > 0 && <span style={{ fontSize: 10, color: "#5b6f95", fontWeight: 700 }}>{dayTaskCount}</span>}
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          {visibleTaskItems.map((task, taskIndex) => (
            <div
              key={`${key}-task-${taskIndex}`}
              style={{
                fontSize: "12px",
                lineHeight: 1.25,
                color: TASK_STATUS_COLORS[task.status]?.chipText || "#4f4291",
                background: TASK_STATUS_COLORS[task.status]?.chipBg || "#eef3ff",
                borderLeft: `3px solid ${TASK_STATUS_COLORS[task.status]?.chipText || "#6f83a7"}`,
                borderRadius: 4,
                padding: "3px 6px",
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
      </div>
    );
  };

  // Renderização do componente
  return (
    <div style={{ padding: "20px 22px", background: "#f2efff", minHeight: "94vh", color: "#1f2b46" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, color: "#1f2b46", fontSize: "24px", fontWeight: 700 }}>Calendário</h2>
          <span style={{ fontSize: 12, color: "#7c879f", fontWeight: 600 }}>NVX</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => {
              const now = new Date();
                setCurrentDate(now);
              setSelectedDate(now);
            }}
            style={{ padding: "8px 12px", background: "#6c3bff", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
          >
            Hoje
          </button>
          <div style={{ display: "inline-flex", border: "1px solid #d8cffb", borderRadius: "8px", overflow: "hidden", background: "#fff" }}>
            <button
              onClick={handlePrevious}
              style={{ padding: "8px 10px", border: "none", borderRight: "1px solid #d8cffb", background: "#fff", cursor: "pointer", color: "#5d4d9f", fontWeight: 700 }}
            >
              ◀
            </button>
            <button
              onClick={handleNext}
              style={{ padding: "8px 10px", border: "none", background: "#fff", cursor: "pointer", color: "#5d4d9f", fontWeight: 700 }}
            >
              ▶
            </button>
          </div>
          <div style={{ display: "inline-flex", gap: 2, border: "1px solid #d8cffb", borderRadius: 8, padding: 2, background: "#fff" }}>
            {[
              { key: VIEW_MODE.month, label: "Mês" },
              { key: VIEW_MODE.week, label: "Semana" },
              { key: VIEW_MODE.day, label: "Dia" },
            ].map((mode) => {
              const isActive = viewMode === mode.key;
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setViewMode(mode.key)}
                  style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background: isActive ? "#efe9ff" : "transparent",
                    color: isActive ? "#5a3cb8" : "#8a96ad",
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: "#23314f", fontSize: 22, fontWeight: 700 }}>
          {headerLabel}
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(TASK_STATUS).map(([statusKey, statusLabel]) => (
            <span key={statusKey} style={{ fontSize: 11, fontWeight: 700, color: TASK_STATUS_COLORS[statusKey].chipText, background: TASK_STATUS_COLORS[statusKey].chipBg, border: `1px solid ${TASK_STATUS_COLORS[statusKey].taskBorder}`, borderRadius: 999, padding: "4px 8px" }}>
              {statusLabel}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompactLayout ? "1fr" : "minmax(940px, 3fr) minmax(420px, 1.25fr)",
          gap: "14px",
        }}
      >
        <div style={{ background: "#fff", border: "1px solid #d8cffb", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "1px solid #ece6ff", background: "#faf8ff" }}>
            {WEEKDAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#6d61a8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", padding: "10px 4px" }}>
                {d}
              </div>
            ))}
          </div>

          {viewMode === VIEW_MODE.month && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
              {days.map((day, idx) =>
                day ? (
                  renderDayCard(day, idx)
                ) : (
                  <div
                    key={`${idx}-empty`}
                    style={{
                      minHeight: "152px",
                      borderRight: idx % 7 !== 6 ? "1px solid #eee8ff" : "none",
                      borderBottom: "1px solid #eee8ff",
                      background: "#faf8ff",
                    }}
                  />
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

        <div style={{ background: "#fff", border: "1px solid #d8cffb", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h4 style={{ margin: "0 0 2px", color: "#1f2b46", fontSize: 15, fontWeight: 700 }}>
              {selectedDate.toLocaleDateString("pt-BR")}
            </h4>
            <span style={{ color: "#6b7a95", fontSize: 12 }}>Adicionar e organizar tarefas do dia</span>
          </div>

          <form onSubmit={addTask} style={{ display: "grid", gap: 8 }}>
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Título da tarefa *"
              style={{ padding: "10px 11px", border: "1px solid #d8cffb", borderRadius: "8px", outline: "none", fontSize: 13 }}
              required
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                type="time"
                value={taskTime}
                onChange={(e) => setTaskTime(e.target.value)}
                style={{ padding: "10px 11px", border: "1px solid #d8cffb", borderRadius: "8px", outline: "none", fontSize: 13 }}
              />
              <select
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value)}
                style={{ padding: "10px 11px", border: "1px solid #d8cffb", borderRadius: "8px", outline: "none", color: "#5f529e", fontWeight: 600, fontSize: 13 }}
              >
                <option value="planejado">Planejado</option>
                <option value="andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <textarea
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Notas"
              style={{ padding: "10px 11px", border: "1px solid #d8cffb", borderRadius: "8px", outline: "none", minHeight: "74px", fontSize: 13, resize: "vertical" }}
            />
            <button
              type="submit"
              style={{ background: "#6c3bff", color: "white", padding: "10px 12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
            >
              Adicionar tarefa
            </button>
          </form>

          <div style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
            {dayTasks.length === 0 ? (
              <p style={{ color: "#7f8ba1", fontSize: 13 }}>Nenhuma tarefa para este dia.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {Object.entries(TASK_STATUS).map(([statusKey, statusLabel]) => (
                  <div key={statusKey} style={{ background: TASK_STATUS_COLORS[statusKey].panelBg, border: `1px solid ${TASK_STATUS_COLORS[statusKey].panelBorder}`, borderRadius: 8, padding: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <strong style={{ fontSize: 11, color: TASK_STATUS_COLORS[statusKey].panelTitle, textTransform: "uppercase", letterSpacing: "0.4px" }}>{statusLabel}</strong>
                      <span style={{ fontSize: 11, color: "#6f7c95", fontWeight: 700 }}>{groupedDayTasks[statusKey].length}</span>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      {groupedDayTasks[statusKey].length === 0 && (
                        <div style={{ fontSize: 12, color: "#8b95a9", padding: "6px 4px" }}>Sem tarefas</div>
                      )}

                      {groupedDayTasks[statusKey].map((task) => (
                        <div
                          key={task.id}
                          style={{
                            border: `1px solid ${TASK_STATUS_COLORS[statusKey].taskBorder}`,
                            borderRadius: 8,
                            padding: "8px",
                            background: "#ffffff",
                            position: "relative",
                          }}
                        >
                          <strong style={{ display: "block", color: "#2a3a56", fontSize: 13 }}>{task.title}</strong>
                          <span style={{ color: "#687690", fontSize: "11px", fontWeight: 600 }}>{task.time}</span>

                          {editingNoteId === task.id ? (
                            <div style={{ marginTop: 6 }}>
                              <textarea
                                value={editingNoteValue}
                                onChange={(e) => setEditingNoteValue(e.target.value)}
                                style={{ width: "100%", minHeight: 52, borderRadius: 6, border: "1px solid #b9c6df", padding: 8, fontSize: 12, color: "#5f5a88" }}
                                autoFocus
                              />
                              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                <button type="button" onClick={() => saveEditNote(task)} style={{ background: "#6c3bff", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Salvar</button>
                                <button type="button" onClick={cancelEditNote} style={{ background: "#f1ecff", color: "#5f529e", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {task.notes && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#5f6d86" }}>{task.notes}</p>}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                                <button
                                  onClick={() => startEditNote(task)}
                                  style={{ background: "transparent", color: "#6342cc", border: "none", fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 600 }}
                                  title="Editar nota"
                                >
                                  Editar
                                </button>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {statusKey !== "planejado" && (
                                    <button type="button" onClick={() => moveTaskStatus(task.id, "planejado")} style={{ border: "1px solid #d8cffb", background: "#f8f5ff", borderRadius: 6, fontSize: 10, padding: "2px 6px", cursor: "pointer", color: "#6a5ba8" }}>P</button>
                                  )}
                                  {statusKey !== "andamento" && (
                                    <button type="button" onClick={() => moveTaskStatus(task.id, "andamento")} style={{ border: "1px solid #d8cffb", background: "#f8f5ff", borderRadius: 6, fontSize: 10, padding: "2px 6px", cursor: "pointer", color: "#6a5ba8" }}>A</button>
                                  )}
                                  {statusKey !== "concluido" && (
                                    <button type="button" onClick={() => moveTaskStatus(task.id, "concluido")} style={{ border: "1px solid #d8cffb", background: "#f8f5ff", borderRadius: 6, fontSize: 10, padding: "2px 6px", cursor: "pointer", color: "#6a5ba8" }}>C</button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          <button
                            onClick={() => removeTask(task.id)}
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "6px",
                              background: "transparent",
                              border: "none",
                              color: "#8a7bb4",
                              cursor: "pointer",
                              fontWeight: "700",
                              fontSize: 12,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}