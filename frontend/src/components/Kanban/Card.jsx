export default function Card({ card }) {
  return (
    <div style={{
      background: "#fff",
      padding: "10px",
      marginBottom: "10px",
      borderRadius: "6px",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
    }}>
      <strong>{card.cliente}</strong>
      <p>{card.endereco}</p>
      <small>{card.tipoServico}</small>
    </div>
  );
}