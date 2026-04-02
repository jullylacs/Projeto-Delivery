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

export default function CardModal({ card, onSave, onClose }) {
  // Estado para armazenar dados do formulário, inicializado com valores do card (ou vazio)
  const [formData, setFormData] = useState({
    titulo: card.titulo || "",
    cliente: card.cliente || "",
    telefone: card.telefone || "",
    endereco: card.endereco || "",
    tipoServico: card.tipoServico || "",
    preco: card.preco || "",
    sla: card.sla || 0,
    prazo: card.prazo ? card.prazo.split("T")[0] : "", // Converte ISO para YYYY-MM-DD
    observacoes: card.observacoes || "",
    coordenadas: {
      lat: card.coordenadas?.lat || "",
      lng: card.coordenadas?.lng || "",
    },
  });

  // Estado para armazenar mensagens de erro de validação
  const [errors, setErrors] = useState({});

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
    if (!formData.telefone.trim()) newErrors.telefone = "Telefone é obrigatório";
    if (!formData.endereco.trim()) newErrors.endereco = "Endereço é obrigatório";
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
      preco: formData.preco ? Number(formData.preco) : undefined, // Converte preço para número
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
              <label style={styles.label}>Telefone *</label>
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

          {/* Endereço */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Endereço *</label>
            <input
              style={{ ...styles.input, borderColor: errors.endereco ? "#ff4444" : "#e2e0f0" }}
              value={formData.endereco}
              onChange={(e) => handleChange("endereco", e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              data-error={errors.endereco ? "true" : "false"}
              placeholder="Rua, número, bairro, cidade"
            />
            {errors.endereco && <span style={styles.errorText}>{errors.endereco}</span>}
          </div>

          {/* Linha com Tipo de Serviço e Preço */}
          <div style={styles.row}>
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
              <label style={styles.label}>Preço (R$)</label>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) => handleChange("preco", e.target.value)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                data-error="false"
                placeholder="0,00"
              />
            </div>
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

      {/* Seção de Prazo e SLA */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Prazos e SLA</h3>
          <span style={styles.sectionCaption}>Controle</span>
        </div>
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Prazo</label>
            <input
              style={styles.input}
              type="date"
              value={formData.prazo}
              onChange={(e) => handleChange("prazo", e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              data-error="false"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>SLA (dias)</label>
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