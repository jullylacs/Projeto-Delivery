export default function CardModal({ visible, onClose, card }) {
  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        width: "400px"
      }}>
        <h3>{card ? "Editar Card" : "Novo Card"}</h3>
        {/* Aqui você pode colocar inputs para editar/criar card */}
        <button onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}