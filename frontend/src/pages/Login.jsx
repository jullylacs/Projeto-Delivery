import { useState } from "react";
import api from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const login = async () => {
    try {
      const res = await api.post("/users/login", { email, senha });
      localStorage.setItem("token", res.data.token);
      alert("Logado!");
    } catch {
      alert("Falha no login");
    }
  };

  return (
    <div style={{ padding: "50px" }}>
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input placeholder="Senha" type="password" onChange={e => setSenha(e.target.value)} />
      <button onClick={login}>Entrar</button>
    </div>
  );
}