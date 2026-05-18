import { Suspense, lazy, useEffect, useMemo, useState } from "react";

const Board = lazy(() => import("../components/Kanban/Board"));

const BOARD_TAB_KEY = "kanbanBoardTab";
const VALID_BOARDS = ["delivery", "comercial"];

function readPreferredBoard() {
  try {
    const raw = localStorage.getItem(BOARD_TAB_KEY);
    return VALID_BOARDS.includes(raw) ? raw : null;
  } catch {
    return null;
  }
}

function readUserFromStorage() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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

function BoardTabs({ activeBoard, onChange }) {
  const tabStyle = (active) => ({
    padding: "10px 20px",
    borderRadius: "10px 10px 0 0",
    border: "1px solid #d6d0ff",
    borderBottom: active ? "1px solid transparent" : "1px solid #d6d0ff",
    background: active ? "#ffffff" : "#f3eeff",
    color: active ? "#3b126b" : "#7159a8",
    fontWeight: active ? 700 : 600,
    fontSize: "14px",
    cursor: "pointer",
    transition: "background 160ms ease, color 160ms ease",
    position: "relative",
    top: active ? "1px" : "0",
  });

  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        padding: "0 20px",
        marginTop: "8px",
        borderBottom: "1px solid #d6d0ff",
      }}
    >
      <button type="button" style={tabStyle(activeBoard === "delivery")} onClick={() => onChange("delivery")}>
        Delivery
      </button>
      <button type="button" style={tabStyle(activeBoard === "comercial")} onClick={() => onChange("comercial")}>
        Comercial
      </button>
    </div>
  );
}

function NoAccessNotice() {
  return (
    <div
      style={{
        margin: "40px auto",
        maxWidth: "520px",
        padding: "24px",
        borderRadius: "14px",
        border: "1px solid #e2d9ff",
        background: "#ffffff",
        color: "#2f2758",
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(59, 18, 107, 0.08)",
      }}
    >
      <h2 style={{ margin: "0 0 8px 0", fontSize: "20px" }}>Sem acesso ao Kanban</h2>
      <p style={{ margin: 0, color: "#5f4e8f" }}>
        Seu usuário não tem permissão para visualizar Delivery nem Comercial. Solicite acesso a um administrador ou gestor.
      </p>
    </div>
  );
}

export default function Kanban() {
  const user = useMemo(() => readUserFromStorage(), []);
  const canDelivery = Boolean(user?.acesso_kanban_delivery);
  const canComercial = Boolean(user?.acesso_kanban_comercial);

  const availableBoards = useMemo(() => {
    const list = [];
    if (canDelivery) list.push("delivery");
    if (canComercial) list.push("comercial");
    return list;
  }, [canDelivery, canComercial]);

  const [activeBoard, setActiveBoard] = useState(() => {
    const preferred = readPreferredBoard();
    if (preferred && (preferred === "delivery" ? canDelivery : canComercial)) {
      return preferred;
    }
    return canDelivery ? "delivery" : canComercial ? "comercial" : null;
  });

  useEffect(() => {
    if (activeBoard) {
      try {
        localStorage.setItem(BOARD_TAB_KEY, activeBoard);
      } catch {
        // ignore
      }
    }
  }, [activeBoard]);

  if (availableBoards.length === 0) {
    return <NoAccessNotice />;
  }

  const showTabs = availableBoards.length > 1;
  const boardToRender = activeBoard || availableBoards[0];

  return (
    <Suspense fallback={<KanbanSkeleton />}>
      {showTabs && <BoardTabs activeBoard={boardToRender} onChange={setActiveBoard} />}
      <Board
        board={boardToRender}
        canTransferTo={availableBoards.filter((b) => b !== boardToRender)}
        onTransferred={() => {
          // após transferência o card sai daqui — não há mais nada a fazer.
        }}
      />
    </Suspense>
  );
}
