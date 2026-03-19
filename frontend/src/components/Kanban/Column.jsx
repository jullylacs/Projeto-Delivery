import Card from "./Card";

export default function Column({ title, cards }) {
  return (
    <div style={{
      background: "#f4f5f7",
      padding: "10px",
      width: "250px",
      borderRadius: "8px",
      minHeight: "400px"
    }}>
      <h4>{title}</h4>
      {cards.map(card => (
        <Card key={card._id} card={card} />
      ))}
    </div>
  );
}