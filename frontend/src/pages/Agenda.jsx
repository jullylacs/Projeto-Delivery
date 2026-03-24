import { useEffect, useMemo, useState } from "react";

// Nomes dos meses para exibição
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Agenda() {
  // Estados principais
  const [currentDate, setCurrentDate] = useState(new Date()); // Mês atualmente exibido
  const [selectedDate, setSelectedDate] = useState(new Date()); // Dia selecionado
  const [taskTitle, setTaskTitle] = useState(""); // Título da tarefa
  const [taskTime, setTaskTime] = useState(""); // Horário da tarefa
  const [taskNotes, setTaskNotes] = useState(""); // Notas da tarefa
  const [tasks, setTasks] = useState({}); // Objeto que armazena tarefas por data
  const [editingNoteId, setEditingNoteId] = useState(null); // ID da tarefa que está sendo editada
  const [editingNoteValue, setEditingNoteValue] = useState(""); // Valor temporário da nota em edição

  // Carrega tarefas do localStorage ao iniciar o componente
  useEffect(() => {
    const stored = localStorage.getItem("agendaTasks");
    if (stored) setTasks(JSON.parse(stored));
  }, []);

  // Salva tarefas no localStorage sempre que o estado 'tasks' muda
  useEffect(() => {
    localStorage.setItem("agendaTasks", JSON.stringify(tasks));
  }, [tasks]);

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

  // Chave para acessar as tarefas do dia selecionado no objeto 'tasks'
  const selectedKey = selectedDate.toISOString().split("T")[0];
  const dayTasks = tasks[selectedKey] || []; // Lista de tarefas do dia selecionado

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

  // Renderização do componente
  return (
    <div style={{ padding: "18px 20px", background: "#f5f4ff", minHeight: "91vh" }}>
      {/* Cabeçalho com título e navegação de meses */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, color: "#371d98" }}>Agenda</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Botão mês anterior */}
          <button
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            style={{ padding: "8px 12px", background: "#fff", border: "1px solid #d6d0ff", borderRadius: "8px", cursor: "pointer" }}
          >
            ← Mês anterior
          </button>
          {/* Botão próximo mês */}
          <button
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            style={{ padding: "8px 12px", background: "#fff", border: "1px solid #d6d0ff", borderRadius: "8px", cursor: "pointer" }}
          >
            Próximo mês →
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {/* Calendário */}
        <div style={{ flex: "1 1 320px", background: "#fff", borderRadius: "14px", padding: "16px", border: "1px solid #e3ddff", boxShadow: "0 10px 20px rgba(83, 63, 164, 0.1)" }}>
          <h3 style={{ margin: "0 0 12px", color: "#4c3aab" }}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>

          {/* Cabeçalho com dias da semana */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: "12px", color: "#6f6aaf", fontWeight: "700" }}>{d}</div>
            ))}
          </div>

          {/* Dias do mês */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {days.map((day, idx) => {
              const isSelected = day && day.toDateString() === selectedDate.toDateString(); // Verifica se é o dia selecionado
              const key = day ? day.toISOString().split("T")[0] : null;
              const hasTask = key && (tasks[key] || []).length > 0; // Verifica se o dia tem tarefas

              return (
                <button
                  key={`${idx}-${key || "empty"}`}
                  onClick={() => day && setSelectedDate(day)}
                  disabled={!day} // Dias nulos não clicáveis
                  style={{
                    minHeight: "44px",
                    borderRadius: "8px",
                    border: isSelected ? "2px solid #6c3bff" : "1px solid #e1ddff",
                    background: isSelected ? "#ebe7ff" : "#f9f8ff",
                    cursor: day ? "pointer" : "default",
                    color: day ? (day.getMonth() === currentDate.getMonth() ? "#302b67" : "#a1a1ce") : "transparent",
                    position: "relative",
                  }}
                >
                  {day?.getDate()}
                  {/* Indicador de tarefa */}
                  {hasTask && (
                    <span
                      style={{
                        position: "absolute",
                        right: "4px",
                        top: "4px",
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#6c3bff",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel de tarefas */}
        <div style={{ flex: "1 1 460px", background: "#fff", borderRadius: "14px", padding: "16px", border: "1px solid #e3ddff", boxShadow: "0 10px 20px rgba(83, 63, 164, 0.1)" }}>
          <h3 style={{ margin: "0 0 12px", color: "#4c3aab" }}>
            Tarefas em {selectedDate.toLocaleDateString("pt-BR")}
          </h3>

          {/* Formulário para adicionar tarefa */}
          <form onSubmit={addTask} style={{ display: "grid", gap: "10px", marginBottom: "14px" }}>
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Título da tarefa *"
              style={{ padding: "10px", border: "1px solid #cec8ff", borderRadius: "10px", outline: "none" }}
              required
            />
            <input
              type="time"
              value={taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
              placeholder="Horário"
              style={{ padding: "10px", border: "1px solid #cec8ff", borderRadius: "10px", outline: "none" }}
            />
            <textarea
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Notas (opcional)"
              style={{ padding: "10px", border: "1px solid #cec8ff", borderRadius: "10px", outline: "none", minHeight: "80px" }}
            />
            <button
              type="submit"
              style={{ background: "#6c3bff", color: "white", padding: "10px", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700" }}
            >
              Adicionar tarefa
            </button>
          </form>

          {/* Lista de tarefas do dia selecionado */}
          <div>
            {dayTasks.length === 0 ? (
              <p style={{ color: "#7f7d96" }}>Nenhuma tarefa para este dia.</p>
            ) : (
              dayTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    border: "1px solid #d5cfff",
                    borderRadius: "9px",
                    padding: "10px",
                    marginBottom: "8px",
                    background: "#f8f6ff",
                    position: "relative",
                  }}
                >
                  {/* Título e horário */}
                  <strong style={{ display: "block", color: "#3c2f96" }}>{task.title}</strong>
                  <span style={{ color: "#675fcf", fontSize: "12px" }}>{task.time}</span>

                  {/* Edição de nota */}
                  {editingNoteId === task.id ? (
                    <div style={{ marginTop: 6 }}>
                      <textarea
                        value={editingNoteValue}
                        onChange={e => setEditingNoteValue(e.target.value)}
                        style={{ width: "100%", minHeight: 60, borderRadius: 8, border: "1px solid #b9aaff", padding: 8, fontSize: 13, color: "#5f5a88" }}
                        autoFocus
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button type="button" onClick={() => saveEditNote(task)} style={{ background: "#6c3bff", color: "white", border: "none", borderRadius: 6, padding: "4px 12px", fontWeight: 600, cursor: "pointer" }}>Salvar</button>
                        <button type="button" onClick={cancelEditNote} style={{ background: "#eee", color: "#6c3bff", border: "none", borderRadius: 6, padding: "4px 12px", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Nota exibida */}
                      {task.notes && <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#5f5a88" }}>{task.notes}</p>}
                      {/* Botão para editar nota */}
                      <button
                        onClick={() => startEditNote(task)}
                        style={{ background: "transparent", color: "#6c3bff", border: "none", fontSize: 13, cursor: "pointer", marginTop: 2, marginRight: 8 }}
                        title="Editar nota"
                      >
                        ✏️ Editar nota
                      </button>
                    </>
                  )}

                  {/* Botão para remover tarefa */}
                  <button
                    onClick={() => removeTask(task.id)}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "transparent",
                      border: "none",
                      color: "#a057ff",
                      cursor: "pointer",
                      fontWeight: "700",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}