import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { capturarFotoComOverlay, obterLocalizacaoAtual } from "../utils/photoOverlay";

const EVIDENCIAS = [
  { tipo: "caixa_atendimento", label: "Caixa de atendimento", obrigatoria: true },
  { tipo: "equipamento", label: "Equipamento instalado", obrigatoria: true },
  { tipo: "identificacao_circuito", label: "Identificação do circuito", obrigatoria: true },
  { tipo: "rack", label: "Rack (quando aplicável)", obrigatoria: false },
  { tipo: "teste_conectividade", label: "Teste de conectividade", obrigatoria: true },
];

const CAMPOS_TECNICOS = [
  ["ip_publico", "IP público"],
  ["gateway", "Gateway"],
  ["mascara", "Máscara"],
  ["dns", "DNS"],
  ["ipv6", "IPv6 (quando aplicável)"],
  ["vlan", "VLAN"],
  ["latencia", "Latência"],
  ["perda_pacotes", "Perda de pacotes"],
];

const MAX_ANEXO_BYTES = 15 * 1024 * 1024; // 15MB por arquivo — vídeos maiores estouram o limite do corpo da requisição

function arquivoParaDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(String(ev.target?.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

const STATUS_LABEL = {
  aguardando_validacao: "Aguardando validação da NVX",
  aprovada: "Aprovada — gerando carta de ativação",
  carta_gerada: "Carta de ativação gerada",
  finalizada: "Ativação concluída",
};

export default function AtivacaoTecnico() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ativacao, setAtivacao] = useState(null);
  const [form, setForm] = useState({});
  const [evidencias, setEvidencias] = useState([]);
  const [testeVelocidade, setTesteVelocidade] = useState({ download: "", upload: "", ping: "" });
  const [resultadoConectividade, setResultadoConectividade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [observacoesAnexos, setObservacoesAnexos] = useState([]);
  const [uploadingTipo, setUploadingTipo] = useState(null);
  const [anexandoObservacao, setAnexandoObservacao] = useState(false);
  const [saving, setSaving] = useState(false);
  const [concluding, setConcluding] = useState(false);
  const [faltando, setFaltando] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    api
      .get(`/ativacoes/public/${token}`)
      .then((res) => {
        if (ignore) return;
        const data = res.data;
        setAtivacao(data);
        setForm({
          ip_publico: data.ip_publico || "",
          gateway: data.gateway || "",
          mascara: data.mascara || "",
          dns: data.dns || "",
          ipv6: data.ipv6 || "",
          vlan: data.vlan || "",
          latencia: data.latencia || "",
          perda_pacotes: data.perda_pacotes || "",
        });
        setEvidencias(Array.isArray(data.evidencias) ? data.evidencias : []);
        setTesteVelocidade(data.teste_velocidade || { download: "", upload: "", ping: "" });
        setResultadoConectividade(data.resultado_conectividade || "");
        setObservacoes(data.observacoes || "");
        setObservacoesAnexos(Array.isArray(data.observacoes_anexos) ? data.observacoes_anexos : []);
      })
      .catch(() => {
        if (!ignore) setNotFound(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  const editavel = ativacao && ["aberta", "em_execucao", "rejeitada"].includes(ativacao.status);

  async function handleAddPhoto(tipo, file) {
    if (!file) return;
    setUploadingTipo(tipo);
    setMessage("");
    try {
      const { lat, lng } = await obterLocalizacaoAtual();
      const evidencia = await capturarFotoComOverlay(file, { lat, lng });
      setEvidencias((prev) => [...prev, { id: crypto.randomUUID(), tipo, ...evidencia }]);
    } catch (err) {
      setMessage(err.message || "Falha ao processar a foto.");
    } finally {
      setUploadingTipo(null);
    }
  }

  function handleRemovePhoto(id) {
    setEvidencias((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleAddObservacaoAnexo(files) {
    if (!files?.length) return;
    setAnexandoObservacao(true);
    setMessage("");
    try {
      const aceitos = Array.from(files).filter((file) => {
        if (file.size > MAX_ANEXO_BYTES) {
          setMessage(`"${file.name}" excede 15MB e não foi anexado. Tente um arquivo menor.`);
          return false;
        }
        return true;
      });
      const novos = await Promise.all(
        aceitos.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          data: await arquivoParaDataUrl(file),
        }))
      );
      setObservacoesAnexos((prev) => [...prev, ...novos]);
    } catch (err) {
      setMessage(err.message || "Falha ao anexar arquivo.");
    } finally {
      setAnexandoObservacao(false);
    }
  }

  function handleRemoveObservacaoAnexo(id) {
    setObservacoesAnexos((prev) => prev.filter((a) => a.id !== id));
  }

  function buildPayload() {
    return {
      ...form,
      evidencias,
      teste_velocidade: testeVelocidade,
      resultado_conectividade: resultadoConectividade,
      observacoes,
      observacoes_anexos: observacoesAnexos,
    };
  }

  async function salvarProgresso() {
    setSaving(true);
    setMessage("");
    try {
      await api.patch(`/ativacoes/public/${token}`, buildPayload());
      setMessage("Progresso salvo.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Erro ao salvar progresso.");
    } finally {
      setSaving(false);
    }
  }

  async function concluirInstalacao() {
    setConcluding(true);
    setFaltando([]);
    setMessage("");
    try {
      await api.patch(`/ativacoes/public/${token}`, buildPayload());
      const res = await api.post(`/ativacoes/public/${token}/concluir`);
      setAtivacao(res.data);
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.faltando) {
        setFaltando(err.response.data.faltando);
        setMessage(err.response.data.message);
      } else {
        setMessage(err.response?.data?.message || "Erro ao concluir instalação.");
      }
    } finally {
      setConcluding(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <p style={{ textAlign: "center", opacity: 0.7 }}>Carregando…</p>
      </PageShell>
    );
  }

  if (notFound) {
    return (
      <PageShell>
        <h2 style={{ color: "#c62828" }}>Link inválido</h2>
        <p>Este link de ativação não existe ou expirou. Confira com o responsável pela NVX.</p>
      </PageShell>
    );
  }

  if (!editavel) {
    return (
      <PageShell>
        <h2 style={{ color: "#3d1466" }}>{ativacao.cliente}</h2>
        <p style={{ color: "#444" }}>{ativacao.circuito} — {ativacao.endereco}</p>
        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", fontWeight: 600 }}>
          {STATUS_LABEL[ativacao.status] || ativacao.status}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h2 style={{ color: "#3d1466", marginBottom: 4 }}>{ativacao.cliente}</h2>
      <p style={{ color: "#444", marginTop: 0 }}>
        {ativacao.circuito} · {ativacao.tipo_servico} · {ativacao.velocidade_contratada}
      </p>
      <p style={{ color: "#666", fontSize: 13 }}>{ativacao.endereco} {ativacao.cidade ? `— ${ativacao.cidade}/${ativacao.estado || ""}` : ""}</p>

      {ativacao.status === "rejeitada" && ativacao.motivo_rejeicao && (
        <div style={sectionErro}>
          <strong>Correção solicitada:</strong> {ativacao.motivo_rejeicao}
        </div>
      )}

      <Section title="Dados técnicos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {CAMPOS_TECNICOS.map(([campo, label]) => (
            <div key={campo}>
              <label style={labelSt}>{label}</label>
              <input
                style={inputSt}
                value={form[campo] || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Evidências fotográficas">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {EVIDENCIAS.map(({ tipo, label, obrigatoria }) => {
            const fotos = evidencias.filter((e) => e.tipo === tipo);
            return (
              <div key={tipo} style={fotoCardSt}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {label} {obrigatoria && <span style={{ color: "#c62828" }}>*</span>}
                </div>
                {fotos.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                    {fotos.map((foto) => (
                      <div key={foto.id} style={{ position: "relative", width: "calc(50% - 3px)" }}>
                        <img src={foto.dataUrl} alt={label} style={{ width: "100%", borderRadius: 8, display: "block" }} />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(foto.id)}
                          title="Remover foto"
                          style={removeBtnSt}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>Nenhuma foto ainda</div>
                )}
                <label style={fotoBtnSt}>
                  {uploadingTipo === tipo ? "Processando…" : fotos.length > 0 ? "+ Adicionar outra foto" : "Tirar/enviar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={(e) => { handleAddPhoto(tipo, e.target.files?.[0]); e.target.value = ""; }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Testes">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelSt}>Velocidade download</label>
            <input style={inputSt} value={testeVelocidade.download || ""} onChange={(e) => setTesteVelocidade((p) => ({ ...p, download: e.target.value }))} />
          </div>
          <div>
            <label style={labelSt}>Velocidade upload</label>
            <input style={inputSt} value={testeVelocidade.upload || ""} onChange={(e) => setTesteVelocidade((p) => ({ ...p, upload: e.target.value }))} />
          </div>
          <div>
            <label style={labelSt}>Ping</label>
            <input style={inputSt} value={testeVelocidade.ping || ""} onChange={(e) => setTesteVelocidade((p) => ({ ...p, ping: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelSt}>Resultado do teste de conectividade</label>
          <input style={inputSt} value={resultadoConectividade} onChange={(e) => setResultadoConectividade(e.target.value)} placeholder="Ex: OK - 100% de sucesso" />
        </div>
      </Section>

      <Section title="Observações">
        <textarea
          style={{ ...inputSt, minHeight: 80, resize: "vertical" }}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Campo livre para observações"
        />

        {observacoesAnexos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {observacoesAnexos.map((anexo) => (
              <div key={anexo.id} style={{ position: "relative", width: 110 }}>
                {anexo.type?.startsWith("image/") ? (
                  <img src={anexo.data} alt={anexo.name} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8, display: "block" }} />
                ) : anexo.type?.startsWith("video/") ? (
                  <video src={anexo.data} controls style={{ width: "100%", height: 90, borderRadius: 8, display: "block", background: "#000" }} />
                ) : (
                  <div style={{ width: "100%", height: 90, borderRadius: 8, background: "#f6f2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, textAlign: "center", padding: 6, wordBreak: "break-word" }}>
                    {anexo.name}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveObservacaoAnexo(anexo.id)}
                  title="Remover anexo"
                  style={removeBtnSt}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <label style={{ ...fotoBtnSt, display: "inline-block", marginTop: 10, width: "auto", padding: "8px 16px" }}>
          {anexandoObservacao ? "Anexando…" : "📎 Anexar imagem ou vídeo"}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => { handleAddObservacaoAnexo(e.target.files); e.target.value = ""; }}
          />
        </label>
      </Section>

      {faltando.length > 0 && (
        <div style={sectionErro}>
          <strong>Pendências antes de concluir:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            {faltando.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {message && faltando.length === 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: "#3d1466" }}>{message}</div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button style={secondaryBtnSt} disabled={saving} onClick={salvarProgresso}>
          {saving ? "Salvando…" : "Salvar progresso"}
        </button>
        <button style={primaryBtnSt} disabled={concluding} onClick={concluirInstalacao}>
          {concluding ? "Enviando…" : "Instalação Concluída"}
        </button>
      </div>
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div style={{ height: "100vh", overflowY: "auto", boxSizing: "border-box", background: "#f2efff", padding: "24px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 8px 32px rgba(90,60,180,0.12)" }}>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.6px", color: "#6b5ca8", marginBottom: 10 }}>{title}</h3>
      {children}
    </div>
  );
}

const labelSt = { display: "block", fontSize: 11, fontWeight: 700, color: "#6b5ca8", marginBottom: 4 };
const inputSt = { width: "100%", padding: "9px 11px", border: "1.5px solid #e4defa", borderRadius: 8, fontSize: 13, boxSizing: "border-box", outline: "none" };
const fotoCardSt = { border: "1px solid #e4defa", borderRadius: 10, padding: 10 };
const fotoBtnSt = { display: "block", textAlign: "center", padding: "8px 10px", borderRadius: 8, background: "#f6f2ff", color: "#4b2d84", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const removeBtnSt = { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 };
const sectionErro = { marginTop: 16, padding: "11px 14px", borderRadius: 10, border: "1px solid #f3b3b3", background: "#fff1f2", color: "#9b1f1f", fontSize: 13 };
const primaryBtnSt = { flex: 1, background: "linear-gradient(135deg, #6c3bff 0%, #9b6dff 100%)", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 };
const secondaryBtnSt = { border: "1.5px solid #d4c8fb", background: "#f6f2ff", color: "#4b2d84", padding: "12px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 };
