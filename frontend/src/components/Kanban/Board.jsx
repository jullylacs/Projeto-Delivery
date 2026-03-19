import { useEffect, useState } from "react";
import Column from "./Column";
import api from "../services/api";

export default function Board() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    api.get("/cards")
      .then(res => setCards(res.data))
      .catch(err => console.log(err));
  }, []);

  const columns = ["Novo", "Em análise", "Agendamento", "Agendado", "Em execução", "Concluído"];

  return (
    <div className="kanban-board">
      {columns.map(col => (
        <Column key={col} title={col} cards={cards.filter(c => c.status === col)} />
      ))}
    </div>
  );
}