import { useEffect, useState } from "react";
import api from "../services/api";

const TIPOS_SERVICO = ["DIA", "BIA", "SDIA", "L2L"];

const STATUS_INFO = {
  aberta: { label: "Aberta", color: "#7c3aed", icon: "🆕" },
  em_execucao: { label: "Em Execução", color: "#1e40af", icon: "🔧" },
  aguardando_validacao: { label: "Aguardando Validação NVX", color: "#d97706", icon: "⏳" },
  rejeitada: { label: "Rejeitada", color: "#dc2626", icon: "✖" },
  aprovada: { label: "Aprovada", color: "#059669", icon: "✅" },
  carta_gerada: { label: "Carta Gerada", color: "#059669", icon: "📄" },
  finalizada: { label: "Finalizada", color: "#166534", icon: "🏁" },
};

const CAMPOS_TECNICOS = [
  ["ip_publico", "IP público"],
  ["gateway", "Gateway"],
  ["mascara", "Máscara"],
  ["dns", "DNS"],
  ["ipv6", "IPv6"],
  ["vlan", "VLAN"],
  ["latencia", "Latência"],
  ["perda_pacotes", "Perda de pacotes"],
];

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function iniciais(nome) {
  return (
    String(nome || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

export default function Ativacoes() {
  const user = readUser();
  const podeAprovar = ["operacional", "gestor", "admin"].includes(user?.perfil);
  const podeExcluir = ["gestor", "gestor_delivery", "admin"].includes(user?.perfil);

  const [ativacoes, setAtivacoes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [novoLink, setNovoLink] = useState(null);

  async function carregar() {
    setLoading(true);
    try {
      const params = statusFiltro ? { status: statusFiltro } : {};
      const res = await api.get("/ativacoes", { params });
      setAtivacoes(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    api.get("/technicians").then((res) => setTechnicians(res.data)).catch(() => setTechnicians([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro]);

  return (
    <div style={{ padding: "22px 24px", color: "var(--text)", maxWidth: 980, margin: "0 auto" }}>
      <style>{`@keyframes ativacaoPulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 22,
          padding: "20px 24px",
          borderRadius: 18,
          background: "linear-gradient(135deg, #4a1fa8 0%, #6c3bff 55%, #9b6dff 100%)",
          boxShadow: "0 10px 30px rgba(90,60,180,0.28)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: "rgba(255,255,255,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            📄
          </div>
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>Ativações</h2>
            <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 12.5 }}>
              Carta de Ativação — do link do técnico à carta finalizada
            </p>
          </div>
        </div>
        <button
          style={{ ...primaryBtnSt, background: "#fff", color: "#4b2d84", boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          onClick={() => setShowCreate(true)}
        >
          + Nova Ativação
        </button>
      </div>

      {/* Filtros */}
      <div style={{ marginBottom: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <FiltroBtn label="Todas" active={!statusFiltro} onClick={() => setStatusFiltro("")} />
        {Object.entries(STATUS_INFO).map(([key, info]) => (
          <FiltroBtn
            key={key}
            label={info.label}
            icon={info.icon}
            color={info.color}
            active={statusFiltro === key}
            onClick={() => setStatusFiltro(key)}
          />
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 66, borderRadius: 14, ...shimmerSt }} />
          ))}
        </div>
      ) : ativacoes.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            borderRadius: 16,
            border: "1.5px dashed var(--border)",
            color: "var(--text-muted, #6b7280)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <p style={{ margin: 0, fontWeight: 600 }}>Nenhuma ativação encontrada</p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5 }}>Crie a primeira com o botão "+ Nova Ativação" acima.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ativacoes.map((a) => {
            const info = STATUS_INFO[a.status] || { label: a.status, color: "#666", icon: "•" };
            return (
              <div
                key={a.id}
                onClick={() => setSelected(a)}
                style={cardRowSt}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 10px 26px rgba(90,60,180,0.16)";
                  e.currentTarget.style.borderColor = "#c9b8ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(62,44,158,0.06)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                  <div style={avatarSt}>{iniciais(a.cliente)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.cliente} <span style={{ opacity: 0.5, fontWeight: 500 }}>— {a.circuito}</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                      {a.tipo_servico} · {a.velocidade_contratada} · 👤 {a.tecnico?.nome || "sem técnico"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ ...badgeSt, background: info.color }}>
                    {info.icon} {info.label}
                  </span>
                  <span style={{ opacity: 0.35, fontSize: 16 }}>›</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal
          technicians={technicians}
          onClose={() => setShowCreate(false)}
          onCreated={(a) => {
            setShowCreate(false);
            setNovoLink(`${window.location.origin}/ativacao/${a.public_token}`);
            carregar();
          }}
        />
      )}

      {novoLink && (
        <LinkModal link={novoLink} onClose={() => setNovoLink(null)} />
      )}

      {selected && (
        <DetalheModal
          ativacao={selected}
          podeAprovar={podeAprovar}
          podeExcluir={podeExcluir}
          onClose={() => setSelected(null)}
          onChanged={(atualizada) => {
            setSelected(atualizada);
            carregar();
          }}
          onDeleted={() => {
            setSelected(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function FiltroBtn({ label, icon, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 150ms ease",
        border: active ? "none" : "1px solid var(--border)",
        background: active ? "linear-gradient(135deg, #6c3bff 0%, #9b6dff 100%)" : "var(--bg-card)",
        color: active ? "#fff" : "var(--text)",
        boxShadow: active ? "0 3px 10px rgba(108,59,255,0.32)" : "none",
      }}
    >
      {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
      {!icon && !active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color || "#999", display: "inline-block" }} />}
      {label}
    </button>
  );
}

function CreateModal({ technicians, onClose, onCreated }) {
  const [form, setForm] = useState({
    cliente: "", cnpj: "", circuito: "", id_cliente_nvx: "", endereco: "",
    cidade: "", estado: "", contato_cliente: "", email_cliente: "",
    tipo_servico: "DIA", velocidade_contratada: "", gerente_conta: "",
  });
  const [tecnicoNome, setTecnicoNome] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(campo, value) {
    setForm((prev) => ({ ...prev, [campo]: value }));
  }

  // Resolve o nome digitado para um tecnico_id: reaproveita um técnico já
  // cadastrado (nome igual, sem diferenciar maiúsculas) ou cria um novo.
  async function resolverTecnicoId() {
    const nome = tecnicoNome.trim();
    if (!nome) return null;

    const existente = technicians.find((t) => t.nome.trim().toLowerCase() === nome.toLowerCase());
    if (existente) return existente.id;

    const res = await api.post("/technicians", { nome });
    return res.data.id;
  }

  async function salvar() {
    setSaving(true);
    setError("");
    try {
      const tecnico_id = await resolverTecnicoId();
      const res = await api.post("/ativacoes", { ...form, tecnico_id });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao criar ativação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Nova Ativação" icon="📄" onClose={onClose}>
      {error && <div style={erroSt}>{error}</div>}

      <SubSection title="Dados do cliente">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo label="Cliente"><input style={inputSt} value={form.cliente} onChange={(e) => set("cliente", e.target.value)} /></Campo>
          <Campo label="CNPJ"><input style={inputSt} value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} /></Campo>
          <Campo label="Endereço" full><input style={inputSt} value={form.endereco} onChange={(e) => set("endereco", e.target.value)} /></Campo>
          <Campo label="Cidade"><input style={inputSt} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} /></Campo>
          <Campo label="Estado (UF)"><input style={inputSt} maxLength={2} value={form.estado} onChange={(e) => set("estado", e.target.value.toUpperCase())} /></Campo>
          <Campo label="Contato do cliente"><input style={inputSt} value={form.contato_cliente} onChange={(e) => set("contato_cliente", e.target.value)} /></Campo>
          <Campo label="E-mail do cliente"><input type="email" style={inputSt} value={form.email_cliente} onChange={(e) => set("email_cliente", e.target.value)} /></Campo>
        </div>
      </SubSection>

      <SubSection title="Dados do circuito">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Campo label="Circuito"><input style={inputSt} value={form.circuito} onChange={(e) => set("circuito", e.target.value)} /></Campo>
          <Campo label="ID Cliente NVX"><input style={inputSt} value={form.id_cliente_nvx} onChange={(e) => set("id_cliente_nvx", e.target.value)} /></Campo>
          <Campo label="Tipo de serviço">
            <select style={inputSt} value={form.tipo_servico} onChange={(e) => set("tipo_servico", e.target.value)}>
              {TIPOS_SERVICO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo label="Velocidade contratada"><input style={inputSt} value={form.velocidade_contratada} onChange={(e) => set("velocidade_contratada", e.target.value)} /></Campo>
          <Campo label="Gerente da conta"><input style={inputSt} value={form.gerente_conta} onChange={(e) => set("gerente_conta", e.target.value)} /></Campo>
          <Campo label="Técnico responsável">
            <input
              style={inputSt}
              list="tecnicos-sugestoes"
              value={tecnicoNome}
              onChange={(e) => setTecnicoNome(e.target.value)}
              placeholder="Digite o nome do técnico"
            />
            <datalist id="tecnicos-sugestoes">
              {technicians.map((t) => <option key={t.id} value={t.nome} />)}
            </datalist>
          </Campo>
        </div>
      </SubSection>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
        <button style={secondaryBtnSt} onClick={onClose}>Cancelar</button>
        <button style={primaryBtnSt} disabled={saving} onClick={salvar}>{saving ? "Criando…" : "Criar ativação"}</button>
      </div>
    </ModalShell>
  );
}

function LinkModal({ link, onClose }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <ModalShell title="Ativação criada" icon="✅" onClose={onClose}>
      <div style={{ textAlign: "center", padding: "6px 0 18px" }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>🔗</div>
        <p style={{ margin: 0, fontWeight: 600 }}>Envie este link ao técnico responsável pela instalação</p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={inputSt} readOnly value={link} onFocus={(e) => e.target.select()} />
        <button
          style={copiado ? { ...secondaryBtnSt, background: "#dcfce7", borderColor: "#86efac", color: "#166534" } : secondaryBtnSt}
          onClick={() => {
            navigator.clipboard.writeText(link);
            setCopiado(true);
          }}
        >
          {copiado ? "✓ Copiado!" : "Copiar"}
        </button>
      </div>
    </ModalShell>
  );
}

function DetalheModal({ ativacao, podeAprovar, podeExcluir, onClose, onChanged, onDeleted }) {
  const [motivo, setMotivo] = useState("");
  const [showRejeitar, setShowRejeitar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(null);

  async function aprovar() {
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/ativacoes/${ativacao.id}/aprovar`);
      onChanged(res.data.ativacao);
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao aprovar.");
    } finally {
      setBusy(false);
    }
  }

  async function rejeitar() {
    if (!motivo.trim()) {
      setError("Informe o motivo da rejeição.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/ativacoes/${ativacao.id}/rejeitar`, { motivo });
      onChanged(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao rejeitar.");
    } finally {
      setBusy(false);
    }
  }

  async function baixarCarta() {
    const res = await api.get(`/ativacoes/${ativacao.id}/carta`, { responseType: "blob" });
    const href = URL.createObjectURL(res.data);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `carta-ativacao-${ativacao.id}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }

  async function excluir() {
    if (!window.confirm(`Excluir a ativação de "${ativacao.cliente}" (${ativacao.circuito})? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.delete(`/ativacoes/${ativacao.id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao excluir ativação.");
      setBusy(false);
    }
  }

  const evidencias = Array.isArray(ativacao.evidencias) ? ativacao.evidencias : [];
  const info = STATUS_INFO[ativacao.status] || { label: ativacao.status, color: "#666", icon: "•" };

  function baixarEvidencia(ev) {
    const anchor = document.createElement("a");
    anchor.href = ev.dataUrl;
    anchor.download = `evidencia-${ev.tipo}-${ativacao.id}.jpg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function baixarTodasEvidencias() {
    evidencias.forEach((ev, i) => setTimeout(() => baixarEvidencia(ev), i * 300));
  }

  function navegarLightbox(delta) {
    setLightboxIndex((prev) => (prev + delta + evidencias.length) % evidencias.length);
  }

  return (
    <ModalShell title={`${ativacao.cliente} — ${ativacao.circuito}`} icon={iniciais(ativacao.cliente)} onClose={onClose} wide>
      {error && <div style={erroSt}>{error}</div>}
      <span style={{ ...badgeSt, background: info.color }}>
        {info.icon} {info.label}
      </span>

      <Section title="Dados técnicos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
          {CAMPOS_TECNICOS.map(([campo, label]) => (
            <div key={campo} style={fieldRowSt}>
              <span style={{ opacity: 0.6 }}>{label}</span>
              <strong>{ativacao[campo] || "-"}</strong>
            </div>
          ))}
        </div>
      </Section>

      {evidencias.length > 0 && (
        <Section
          title="Evidências"
          action={
            <button style={linkBtnSt} onClick={baixarTodasEvidencias}>⬇ Baixar todas</button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {evidencias.map((ev, i) => (
              <div
                key={ev.tipo}
                onClick={() => setLightboxIndex(i)}
                style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", cursor: "pointer", position: "relative" }}
                onMouseEnter={(e) => (e.currentTarget.querySelector("img").style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.querySelector("img").style.transform = "scale(1)")}
              >
                <div style={{ overflow: "hidden" }}>
                  <img src={ev.dataUrl} alt={ev.tipo} style={{ width: "100%", display: "block", transition: "transform 200ms ease" }} />
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.7, padding: "4px 6px", background: "var(--bg-input, #faf7ff)" }}>
                  🔍 {ev.tipo.replaceAll("_", " ")}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {ativacao.teste_velocidade && (
        <Section title="Teste de velocidade">
          <div style={{ display: "flex", gap: 18, fontSize: 13 }}>
            <span>⬇ <strong>{ativacao.teste_velocidade.download || "-"}</strong></span>
            <span>⬆ <strong>{ativacao.teste_velocidade.upload || "-"}</strong></span>
            <span>📶 <strong>{ativacao.teste_velocidade.ping || "-"}</strong></span>
          </div>
        </Section>
      )}

      {ativacao.observacoes && (
        <Section title="Observações">
          <p style={{ fontSize: 13, margin: 0, background: "var(--bg-input, #faf7ff)", padding: 10, borderRadius: 8 }}>{ativacao.observacoes}</p>
        </Section>
      )}

      {podeAprovar && ativacao.status === "aguardando_validacao" && (
        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
          {showRejeitar ? (
            <>
              <textarea
                style={{ ...inputSt, minHeight: 70, resize: "vertical", width: "100%", boxSizing: "border-box" }}
                placeholder="Motivo da rejeição"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button style={secondaryBtnSt} onClick={() => setShowRejeitar(false)}>Cancelar</button>
                <button style={dangerBtnSt} disabled={busy} onClick={rejeitar}>Confirmar rejeição</button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button style={dangerBtnSt} disabled={busy} onClick={() => setShowRejeitar(true)}>✖ Rejeitar</button>
              <button style={primaryBtnSt} disabled={busy} onClick={aprovar}>{busy ? "Aprovando…" : "✓ Aprovar"}</button>
            </div>
          )}
        </div>
      )}

      {["carta_gerada", "finalizada"].includes(ativacao.status) && (
        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", gap: 10 }}>
          <button style={primaryBtnSt} onClick={baixarCarta}>⬇ Baixar Carta de Ativação (PDF)</button>
          {ativacao.status === "finalizada" && podeExcluir && (
            <button style={dangerBtnSt} disabled={busy} onClick={excluir}>
              {busy ? "Excluindo…" : "🗑 Excluir ativação"}
            </button>
          )}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          evidencias={evidencias}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={navegarLightbox}
          onDownload={baixarEvidencia}
        />
      )}
    </ModalShell>
  );
}

function ModalShell({ title, icon, onClose, children, wide }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(20,10,40,0.55)",
        backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card, #fff)", color: "var(--text, #1f2b46)", borderRadius: 18, padding: 26,
          width: "100%", maxWidth: wide ? 720 : 560, maxHeight: "88vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {icon && (
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "linear-gradient(135deg, #6c3bff 0%, #9b6dff 100%)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800,
                }}
              >
                {icon}
              </div>
            )}
            <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "var(--bg-input, #f6f2ff)", width: 30, height: 30, borderRadius: 8, fontSize: 16, cursor: "pointer", color: "inherit" }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b5ca8", margin: 0 }}>{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function Lightbox({ evidencias, index, onClose, onNavigate, onDownload }) {
  const ev = evidencias[index];

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate(-1);
      if (e.key === "ArrowRight") onNavigate(1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(10,5,20,0.88)", zIndex: 1100,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{ color: "#fff", fontWeight: 700, fontSize: 14, textTransform: "capitalize" }}
        onClick={(e) => e.stopPropagation()}
      >
        {ev.tipo.replaceAll("_", " ")} <span style={{ opacity: 0.5, fontWeight: 400 }}>({index + 1}/{evidencias.length})</span>
      </div>

      <img
        src={ev.dataUrl}
        alt={ev.tipo}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "88vw", maxHeight: "68vh", borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      />

      <div style={{ display: "flex", gap: 10 }} onClick={(e) => e.stopPropagation()}>
        {evidencias.length > 1 && (
          <>
            <button style={secondaryBtnSt} onClick={() => onNavigate(-1)}>‹ Anterior</button>
            <button style={secondaryBtnSt} onClick={() => onNavigate(1)}>Próxima ›</button>
          </>
        )}
        <button style={primaryBtnSt} onClick={() => onDownload(ev)}>⬇ Baixar</button>
        <button style={{ ...secondaryBtnSt, background: "rgba(255,255,255,0.12)", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={onClose}>
          ✕ Fechar
        </button>
      </div>
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9b8cc7", margin: "0 0 10px" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Campo({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b5ca8", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputSt = {
  width: "100%", padding: "9px 11px", border: "1.5px solid var(--border, #e4defa)", borderRadius: 8,
  fontSize: 13, boxSizing: "border-box", outline: "none", background: "var(--bg-input, #fff)", color: "inherit",
  transition: "border-color 150ms ease",
};
const primaryBtnSt = {
  background: "linear-gradient(135deg, #6c3bff 0%, #9b6dff 100%)", color: "#fff", border: "none",
  padding: "9px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
  transition: "transform 150ms ease, box-shadow 150ms ease",
};
const secondaryBtnSt = { border: "1.5px solid #d4c8fb", background: "#f6f2ff", color: "#4b2d84", padding: "9px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13 };
const dangerBtnSt = { border: "none", background: "#dc2626", color: "#fff", padding: "9px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13 };
const linkBtnSt = { border: "none", background: "transparent", color: "#6c3bff", cursor: "pointer", fontWeight: 700, fontSize: 12 };
const badgeSt = { display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, color: "#fff", fontSize: 11, fontWeight: 700 };
const erroSt = { marginBottom: 14, padding: "10px 14px", borderRadius: 10, border: "1px solid #f3b3b3", background: "#fff1f2", color: "#9b1f1f", fontSize: 13 };
const fieldRowSt = { display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" };
const avatarSt = {
  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
  background: "linear-gradient(135deg, #6c3bff 0%, #9b6dff 100%)", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800,
};
const cardRowSt = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
  padding: "14px 18px", borderRadius: 14, background: "var(--bg-card)",
  border: "1px solid var(--border)", cursor: "pointer",
  boxShadow: "0 2px 8px rgba(62,44,158,0.06)",
  transition: "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
};
const shimmerSt = {
  background: "linear-gradient(90deg, #f1ecff 25%, #e8ddff 50%, #f1ecff 75%)",
  backgroundSize: "200% 100%",
  animation: "ativacaoPulse 1.4s ease-in-out infinite",
};
