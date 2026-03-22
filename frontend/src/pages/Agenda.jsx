import { useEffect, useMemo, useState } from "react";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [tasks, setTasks] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem("agendaTasks");
    if (stored) setTasks(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("agendaTasks", JSON.stringify(tasks));
  }, [tasks]);

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const days = useMemo(() => {
    const result = [];
    const startOffset = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    for (let i = 0; i < startOffset; i++) {
      result.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      result.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    }

    while (result.length % 7 !== 0) {
      result.push(null);
    }

    return result;
  }, [currentDate, firstDayOfMonth, lastDayOfMonth]);

  const selectedKey = selectedDate.toISOString().split("T")[0];
  const dayTasks = tasks[selectedKey] || [];

  const addTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask = {
      id: Date.now(),
      title: taskTitle.trim(),
      time: taskTime || "--",
      notes: taskNotes.trim(),
    };

    setTasks((prev) => ({
      ...prev,
      [selectedKey]: [...(prev[selectedKey] || []), newTask],
    }));

    setTaskTitle("");
    setTaskTime("");
    setTaskNotes("");
  };

  const removeTask = (id) => {
    setTasks((prev) => {
      const updated = (prev[selectedKey] || []).filter((t) => t.id !== id);
      const next = { ...prev };
      if (updated.length > 0) next[selectedKey] = updated;
      else delete next[selectedKey];
      return next;
    });
  };

  return (
    <div style={{ padding: "18px 20px", background: "#f5f4ff", minHeight: "91vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, color: "#371d98" }}>Agenda</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            style={{ padding: "8px 12px", background: "#fff", border: "1px solid #d6d0ff", borderRadius: "8px", cursor: "pointer" }}
          >
            ← Mês anterior
          </button>
          <button
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            style={{ padding: "8px 12px", background: "#fff", border: "1px solid #d6d0ff", borderRadius: "8px", cursor: "pointer" }}
          >
            Próximo mês →
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", background: "#fff", borderRadius: "14px", padding: "16px", border: "1px solid #e3ddff", boxShadow: "0 10px 20px rgba(83, 63, 164, 0.1)" }}>
          <h3 style={{ margin: "0 0 12px", color: "#4c3aab" }}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: "12px", color: "#6f6aaf", fontWeight: "700" }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {days.map((day, idx) => {
              const isSelected = day && day.toDateString() === selectedDate.toDateString();
              const key = day ? day.toISOString().split("T")[0] : null;
              const hasTask = key && (tasks[key] || []).length > 0;

              return (
                <button
                  key={`${idx}-${key || "empty"}`}
                  onClick={() => day && setSelectedDate(day)}
                  disabled={!day}
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

        <div style={{ flex: "1 1 460px", background: "#fff", borderRadius: "14px", padding: "16px", border: "1px solid #e3ddff", boxShadow: "0 10px 20px rgba(83, 63, 164, 0.1)" }}>
          <h3 style={{ margin: "0 0 12px", color: "#4c3aab" }}>
            Tarefas em {selectedDate.toLocaleDateString("pt-BR")}
          </h3>
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
                  <strong style={{ display: "block", color: "#3c2f96" }}>{task.title}</strong>
                  <span style={{ color: "#675fcf", fontSize: "12px" }}>{task.time}</span>
                  {task.notes && <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#5f5a88" }}>{task.notes}</p>}
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
