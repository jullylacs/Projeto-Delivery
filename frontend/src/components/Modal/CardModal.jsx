import { useState } from "react";

// Estilos em objeto JS para reutilização nos elementos do formulário
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minHeight: "560px",
    padding: "8px 2px 2px",
    justifyContent: "flex-start",
  },
  sectionCard: {
    background: "#f7f5ff",
    border: "1px solid #ddd4ff",
    borderRadius: "14px",
    padding: "14px",
    boxShadow: "0 3px 12px rgba(73, 42, 173, 0.08)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#3e2b9d",
    margin: 0,
    letterSpacing: "0.2px",
  },
  sectionCaption: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#6e5fb0",
    background: "#ebe5ff",
    borderRadius: "999px",
    padding: "3px 8px",
    border: "1px solid #d7cbff",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#5f4ca8",
    letterSpacing: "0.4px",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    border: "1px solid #d9d0f9",
    borderRadius: "10px",
    padding: "11px 12px",
    background: "#ffffff",
    color: "#201b5f",
    fontSize: "13px",
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    border: "1px solid #d9d0f9",
    borderRadius: "10px",
    padding: "11px 12px",
    background: "#ffffff",
    color: "#201b5f",
    fontSize: "13px",
    minHeight: "92px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  stack: {
    display: "grid",
    gap: "12px",
  },
  actionButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "4px",
    paddingTop: "10px",
    borderTop: "1px solid #e6ddff",
  },
  cancelBtn: {
    border: "1px solid #d9d0f9",
    background: "#ffffff",
    color: "#4f4199",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  saveBtn: {
    border: "none",
    background: "linear-gradient(135deg, #7f5af0, #5a30ff)",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  errorText: {
    color: "#c62828",
    fontSize: "11px",
    fontWeight: "600",
  },
};

const profileBadgePalette = {
  comercial: { bg: "#e9f1ff", text: "#1d4ed8", border: "#bfd3ff" },
  operacional: { bg: "#e8fbf1", text: "#047857", border: "#bae6d1" },
  tecnico: { bg: "#fff3e8", text: "#b45309", border: "#fed7aa" },
  gestor: { bg: "#f1ecff", text: "#6d28d9", border: "#ddd6fe" },
  admin: { bg: "#ffecec", text: "#b91c1c", border: "#fecaca" },
  default: { bg: "#efe8ff", text: "#5135b0", border: "#d6c8ff" },
};

const normalizeProfileKey = (value) => String(value || "").trim().toLowerCase();

const getProfileBadgeStyle = (perfil) => {
  const key = normalizeProfileKey(perfil);
  const palette = profileBadgePalette[key] || profileBadgePalette.default;
  return {
    background: palette.bg,
    color: palette.text,
    border: `1px solid ${palette.border}`,
  };
};

export default function CardModal({ card, onSave, onClose, vendorOptions = [] }) {
  const [vendorSearch, setVendorSearch] = useState("");
  // Estado para armazenar dados do formulário, inicializado com valores do card (ou vazio)
  const [formData, setFormData] = useState({
    titulo: card.titulo || "",
    cliente: card.cliente || "",
    telefone: card.telefone || "",
    endereco: card.endereco || "",
    tipoServico: card.tipoServico || "",
    mensalidade: card.mensalidade || "",
    instalacao: card.instalacao || "",
    tipo_card: card.tipo_card || "",
    sla: card.sla || 0,
    prazo: card.prazo ? card.prazo.split("T")[0] : "", // Converte ISO para YYYY-MM-DD
    tempoContratual: card.tempoContratual || "",
    observacoes: card.observacoes || "",
    vendedorId: String(card?.vendedor?.id || card?.vendedor_id || card?.vendedorId || ""),
    coordenadas: card.coordenadas && card.coordenadas.lat && card.coordenadas.lng
      ? `${card.coordenadas.lat},${card.coordenadas.lng}`
      : typeof card.coordenadas === "string"
        ? card.coordenadas
        : "",
  });

  // Estado para armazenar mensagens de erro de validação
  const [errors, setErrors] = useState({});

  const filteredVendorOptions = vendorOptions.filter((option) =>
    option.label.toLowerCase().includes(vendorSearch.trim().toLowerCase())
  );

  const selectedVendor = vendorOptions.find(
    (option) => option.id === String(formData.vendedorId || "")
  );

  // Função para atualizar campos do formulário
  const handleChange = (field, value) => {
    if (field === "lat" || field === "lng") {
      // Campos de coordenadas atualizam o objeto interno 'coordenadas'
      setFormData(prev => ({
        ...prev,
        coordenadas: {
          ...prev.coordenadas,
          [field]: value,
        },
      }));
    } else {
      // Campos normais atualizam diretamente a chave no formData
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Limpa erro do campo ao digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validação dos campos obrigatórios
  const validate = () => {
    const newErrors = {};
    if (!formData.cliente.trim()) newErrors.cliente = "Cliente é obrigatório";
    // Telefone não é mais obrigatório
    // Endereço e coordenadas agora são opcionais
    if (!formData.tipoServico.trim()) newErrors.tipoServico = "Tipo de serviço é obrigatório";

    setErrors(newErrors); // Atualiza estado de erros
    return Object.keys(newErrors).length === 0; // Retorna true se não houver erros
  };

  // Função chamada ao salvar o card
  const handleSubmit = async () => {
    if (!validate()) return; // Se houver erros, não prossegue

    const updatedCard = {
      ...card, // Mantém propriedades existentes do card
      ...formData, // Sobrescreve com os valores do formulário
      mensalidade: formData.mensalidade ? Number(formData.mensalidade) : undefined,
      instalacao: formData.instalacao ? Number(formData.instalacao) : undefined,
      sla: formData.sla ? Number(formData.sla) : 0, // Converte SLA para número
    };

    await onSave(updatedCard); // Chama função externa de salvamento
  };

  const handleFieldFocus = (event) => {
    event.currentTarget.style.borderColor = "#8d76ff";
    event.currentTarget.style.boxShadow = "0 0 0 3px rgba(124, 91, 255, 0.16)";
  };

  const handleFieldBlur = (event) => {
    const hasError = event.currentTarget.dataset.error === "true";
    event.currentTarget.style.borderColor = hasError ? "#ff4444" : "#d9d0f9";
    event.currentTarget.style.boxShadow = "none";
  };

  // Renderização do modal do card
  return (
    <div style={styles.container}>
      {/* Seção de informações básicas */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Informações básicas</h3>
          <span style={styles.sectionCaption}>Principal</span>
        </div>
        <div style={styles.stack}>
          {/* Título do card */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Título do Card</label>
            <input
              style={styles.input}
              value={formData.titulo}
              onChange={(e) => handleChange("titulo", e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              data-error="false"
              placeholder="Ex: Instalação de Ar Condicionado"
            />
          </div>

          {/* Linha com Cliente e Telefone */}
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Cliente *</label>
              <input
                style={{ ...styles.input, borderColor: errors.cliente ? "#ff4444" : "#e2e0f0" }}
                value={formData.cliente}
                onChange={(e) => handleChange("cliente", e.target.value)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                data-error={errors.cliente ? "true" : "false"}
                placeholder="Nome do cliente"
              />
              {errors.cliente && <span style={styles.errorText}>{errors.cliente}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Telefone</label>
              <input
                style={{ ...styles.input, borderColor: errors.telefone ? "#ff4444" : "#e2e0f0" }}
                value={formData.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                data-error={errors.telefone ? "true" : "false"}
                placeholder="(11) 99999-9999"
              />
              {errors.telefone && <span style={styles.errorText}>{errors.telefone}</span>}
            </div>
          </div>

          {/* Endereço e Coordenadas juntos/opcionais */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Endereço ou Coordenadas</label>
            <input
              style={{ ...styles.input, borderColor: errors.endereco ? "#ff4444" : "#e2e0f0" }}
              value={formData.endereco}
              onChange={(e) => handleChange("endereco", e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              data-error={errors.endereco ? "true" : "false"}
              placeholder="Rua, número, bairro, cidade OU latitude,longitude"
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={formData.coordenadas.lat}
                onChange={e => handleChange("lat", e.target.value)}
                placeholder="Latitude (opcional)"
              />
              <input
                style={{ ...styles.input, flex: 1 }}
                value={formData.coordenadas.lng}
                onChange={e => handleChange("lng", e.target.value)}
                placeholder="Longitude (opcional)"
              />
            </div>
            <span style={{ color: "#7a73a1", fontSize: 12 }}>
              Preencha endereço, coordenadas ou ambos. Nenhum campo é obrigatório.
            </span>
          </div>

          {/* Linha com Tipo de Serviço, Mensalidade, Instalação e Tipo do Card */}
          <div style={{ ...styles.row, gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Serviço *</label>
              <input
                style={{ ...styles.input, borderColor: errors.tipoServico ? "#ff4444" : "#e2e0f0" }}
                value={formData.tipoServico}
                onChange={(e) => handleChange("tipoServico", e.target.value)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                data-error={errors.tipoServico ? "true" : "false"}
                placeholder="Ex: Instalação, Manutenção, Consultoria"
              />
              {errors.tipoServico && <span style={styles.errorText}>{errors.tipoServico}</span>}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Mensalidade (R$)</label>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                value={formData.mensalidade}
                onChange={(e) => handleChange("mensalidade", e.target.value)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                data-error="false"
                placeholder="0,00"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Instalação (R$)</label>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                value={formData.instalacao}
                onChange={(e) => handleChange("instalacao", e.target.value)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                data-error="false"
                placeholder="0,00"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo do Card *</label>
              <select
                style={styles.input}
                value={formData.tipo_card}
                onChange={(e) => handleChange("tipo_card", e.target.value)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                data-error="false"
                required
              >
                <option value="">Selecione...</option>
                <option value="Venda">Venda</option>
                <option value="Cotação">Cotação</option>
                <option value="POC">POC</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Vendedor Responsável</label>
            <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#4f4199" }}>Selecionado:</span>
              <span style={{ ...getProfileBadgeStyle(selectedVendor?.perfil), borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                {selectedVendor?.perfil ? `${selectedVendor.perfil} - ` : ""}
                {selectedVendor?.label || "Manter vendedor atual"}
              </span>
            </div>
            <input
              style={{ ...styles.input, marginBottom: 8 }}
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              data-error="false"
              placeholder="Buscar vendedor..."
            />
            <select
              style={styles.input}
              value={formData.vendedorId || ""}
              onChange={(e) => handleChange("vendedorId", e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              data-error="false"
            >
              <option value="">Manter vendedor atual</option>
              {filteredVendorOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}{option.perfil ? ` - ${option.perfil}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Seção de Localização */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Localização</h3>
          <span style={styles.sectionCaption}>Geo</span>
        </div>
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Latitude</label>
            <input
              style={styles.input}
              value={formData.coordenadas.lat}
              onChange={(e) => handleChange("lat", e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              data-error="false"
              placeholder="-23.5505"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Longitude</label>
            <input
              style={styles.input}
              value={formData.coordenadas.lng}
              onChange={(e) => handleChange("lng", e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              data-error="false"
              placeholder="-46.6333"
            />
          </div>
        </div>
      </div>

      {/* Seção de SLA e Tempo Contratual (Prazo removido) */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>SLA e Contrato</h3>
          <span style={styles.sectionCaption}>Controle</span>
        </div>
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>SLA (horas)</label>
            <input
              style={styles.input}
              type="number"
              value={formData.sla}
              onChange={(e) => handleChange("sla", e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              data-error="false"
              placeholder="0"
            />
            <span style={{ fontSize: '11px', color: '#6e5fb0', marginTop: '2px' }}>
              {formData.sla ? `${formData.sla} horas` : 'Informe o SLA em horas'}
            </span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Tempo Contratual</label>
            <input
              style={styles.input}
              type="text"
              value={formData.tempoContratual}
              onChange={e => handleChange('tempoContratual', e.target.value)}
              placeholder="Ex: 12 meses, 24 meses, etc."
            />
          </div>
        </div>
      </div>

      {/* Seção de Observações */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Observações</h3>
          <span style={styles.sectionCaption}>Notas</span>
        </div>
        <div style={styles.formGroup}>
          <textarea
            style={styles.textarea}
            value={formData.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            onFocus={handleFieldFocus}
            onBlur={handleFieldBlur}
            data-error="false"
            placeholder="Informações adicionais sobre o serviço..."
            rows={4}
          />
        </div>
      </div>

      {/* Botões de ação */}
      <div style={styles.actionButtons}>
        {/* Botão Cancelar */}
        <button
          style={styles.cancelBtn}
          onClick={onClose}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f3ff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
        >
          Cancelar
        </button>

        {/* Botão Salvar */}
        <button
          style={styles.saveBtn}
          onClick={handleSubmit}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(90,48,255,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}