import { Suspense, lazy } from "react";

const Board = lazy(() => import("../components/Kanban/Board"));

function KanbanSkeleton() {
  const card = {
    borderRadius: "14px",
    border: "1px solid #d6d0ff",
    background: "#fff",
    padding: "14px",
    minHeight: "230px",
  };

  const pulse = {
    background: "linear-gradient(90deg, #f1ecff 25%, #e8ddff 50%, #f1ecff 75%)",
    backgroundSize: "200% 100%",
    animation: "kanbanPulse 1.4s ease-in-out infinite",
    borderRadius: "8px",
  };

  return (
    <div style={{ padding: "20px", background: "linear-gradient(180deg, #f8f7ff 0%, #f2f0ff 100%)", minHeight: "80vh" }}>
      <style>
        {`@keyframes kanbanPulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}
      </style>

      <div style={{ ...pulse, width: "220px", height: "30px", marginBottom: "16px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
        <div style={card}>
          <div style={{ ...pulse, width: "70%", height: "14px", marginBottom: "14px" }} />
          <div style={{ ...pulse, width: "100%", height: "50px", marginBottom: "10px" }} />
          <div style={{ ...pulse, width: "88%", height: "44px", marginBottom: "10px" }} />
          <div style={{ ...pulse, width: "76%", height: "44px" }} />
        </div>
        <div style={card}>
          <div style={{ ...pulse, width: "68%", height: "14px", marginBottom: "14px" }} />
          <div style={{ ...pulse, width: "100%", height: "50px", marginBottom: "10px" }} />
          <div style={{ ...pulse, width: "92%", height: "44px", marginBottom: "10px" }} />
          <div style={{ ...pulse, width: "70%", height: "44px" }} />
        </div>
        <div style={card}>
          <div style={{ ...pulse, width: "64%", height: "14px", marginBottom: "14px" }} />
          <div style={{ ...pulse, width: "100%", height: "50px", marginBottom: "10px" }} />
          <div style={{ ...pulse, width: "84%", height: "44px", marginBottom: "10px" }} />
          <div style={{ ...pulse, width: "66%", height: "44px" }} />
        </div>
      </div>
    </div>
  );
}

// Componente da página Kanban
export default function Kanban() {
  return (
    <Suspense fallback={<KanbanSkeleton />}>
      <Board />
    </Suspense>
  );
}