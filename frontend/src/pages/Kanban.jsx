import { Suspense, lazy, useEffect, useMemo, useState } from "react";

const Board = lazy(() => import("../components/Kanban/Board"));

const BOARD_TAB_KEY = "kanbanBoardTab";
const VALID_BOARDS = ["delivery", "comercial", "bko"];

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
    <div style={{ padding: "20px", background: "#f2efff", minHeight: "80vh" }}>
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

function BoardTabs({ activeBoard, onChange, availableBoards }) {
  const tabStyle = (active) => ({
    padding: "7px 20px",
    borderRadius: "8px",
    border: "none",
    background: active
      ? "linear-gradient(135deg, #7a4dff, #9d4edd)"
      : "transparent",
    color: active ? "#fff" : "#7159a8",
    fontWeight: active ? 700 : 500,
    fontSize: "13.5px",
    cursor: "pointer",
    transition: "background 160ms ease, color 160ms ease, box-shadow 160ms ease",
    boxShadow: active ? "0 3px 10px rgba(124,77,255,0.35)" : "none",
    letterSpacing: "0.1px",
  });

  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        padding: "0 20px 12px",
        marginTop: "4px",
        alignItems: "center",
      }}
    >
      {availableBoards.includes("delivery") && (
        <button type="button" style={tabStyle(activeBoard === "delivery")} onClick={() => onChange("delivery")}>
          🛵 Delivery
        </button>
      )}
      {availableBoards.includes("comercial") && (
        <button type="button" style={tabStyle(activeBoard === "comercial")} onClick={() => onChange("comercial")}>
          💼 Comercial
        </button>
      )}
      {availableBoards.includes("bko") && (
        <button type="button" style={tabStyle(activeBoard === "bko")} onClick={() => onChange("bko")}>
          🗂️ BKO
        </button>
      )}
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
  const canBko = Boolean(user?.acesso_kanban_bko);

  const availableBoards = useMemo(() => {
    const list = [];
    if (canDelivery) list.push("delivery");
    if (canComercial) list.push("comercial");
    if (canBko) list.push("bko");
    return list;
  }, [canDelivery, canComercial, canBko]);

  const [activeBoard, setActiveBoard] = useState(() => {
    const preferred = readPreferredBoard();
    if (preferred && availableBoards.includes(preferred)) return preferred;
    return availableBoards[0] ?? null;
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
      {showTabs && <BoardTabs activeBoard={boardToRender} onChange={setActiveBoard} availableBoards={availableBoards} />}
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
