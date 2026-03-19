import { useEffect, useState } from "react";
import api from "../../services/api";
import Column from "./Column";

export default function Board() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    api.get("/cards").then(res => setCards(res.data));
  }, []);

  const columns = ["Novo", "Em análise", "Agendamento", "Agendado", "Em execução", "Concluído"];

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px", overflowX: "auto" }}>
      {columns.map(col => (
        <Column
          key={col}
          title={col}
          cards={cards.filter(c => c.status === col)}
        />
      ))}
    </div>
  );
}