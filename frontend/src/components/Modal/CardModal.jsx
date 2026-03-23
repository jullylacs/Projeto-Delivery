import { useState } from "react";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#5d3fdd",
    letterSpacing: "0.3px",
  },
  input: {
    width: "100%",
    border: "1px solid #e2e0f0",
    borderRadius: "12px",
    padding: "12px 14px",
    background: "#fefefe",
    color: "#1e1a61",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  textarea: {
    width: "100%",
    border: "1px solid #e2e0f0",
    borderRadius: "12px",
    padding: "12px 14px",
    background: "#fefefe",
    color: "#1e1a61",
    fontSize: "14px",
    minHeight: "80px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  },
  select: {
    width: "100%",
    border: "1px solid #e2e0f0",
    borderRadius: "12px",
    padding: "12px 14px",
    background: "#fefefe",
    color: "#1e1a61",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  actionButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "8px",
  },
  cancelBtn: {
    border: "1px solid #e2e0f0",
    background: "#ffffff",
    color: "#5b4eaa",
    padding: "10px 20px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
  saveBtn: {
    border: "none",
    background: "linear-gradient(135deg, #7c5bff, #5a30ff)",
    color: "#fff",
    padding: "10px 24px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#3e2c9e",
    margin: "8px 0 4px",
    paddingBottom: "8px",
    borderBottom: "2px solid rgba(108,59,255,0.2)",
  },
};

export default function CardModal({ card, onSave, onClose }) {
  const [formData, setFormData] = useState({
    titulo: card.titulo || "",
    cliente: card.cliente || "",
    telefone: card.telefone || "",
    endereco: card.endereco || "",
    tipoServico: card.tipoServico || "",
    preco: card.preco || "",
    sla: card.sla || 0,
    prazo: card.prazo ? card.prazo.split("T")[0] : "",
    observacoes: card.observacoes || "",
    coordenadas: {
      lat: card.coordenadas?.lat || "",
      lng: card.coordenadas?.lng || "",
    },
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    if (field === "lat" || field === "lng") {
      setFormData(prev => ({
        ...prev,
        coordenadas: {
          ...prev.coordenadas,
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.cliente.trim()) newErrors.cliente = "Cliente é obrigatório";
    if (!formData.telefone.trim()) newErrors.telefone = "Telefone é obrigatório";
    if (!formData.endereco.trim()) newErrors.endereco = "Endereço é obrigatório";
    if (!formData.tipoServico.trim()) newErrors.tipoServico = "Tipo de serviço é obrigatório";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    const updatedCard = {
      ...card,
      ...formData,
      preco: formData.preco ? Number(formData.preco) : undefined,
      sla: formData.sla ? Number(formData.sla) : 0,
    };
    
    await onSave(updatedCard);
  };

  return (
    <div style={styles.container}>
      <div>
        <h3 style={styles.sectionTitle}>📋 Informações Básicas</h3>
        <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Título do Card</label>
            <input
              style={styles.input}
              value={formData.titulo}
              onChange={(e) => handleChange("titulo", e.target.value)}
              placeholder="Ex: Instalação de Ar Condicionado"
            />
          </div>
          
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Cliente *</label>
              <input
                style={{ ...styles.input, borderColor: errors.cliente ? "#ff4444" : "#e2e0f0" }}
                value={formData.cliente}
                onChange={(e) => handleChange("cliente", e.target.value)}
                placeholder="Nome do cliente"
              />
              {errors.cliente && <span style={{ color: "#ff4444", fontSize: "11px" }}>{errors.cliente}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Telefone *</label>
              <input
                style={{ ...styles.input, borderColor: errors.telefone ? "#ff4444" : "#e2e0f0" }}
                value={formData.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
              {errors.telefone && <span style={{ color: "#ff4444", fontSize: "11px" }}>{errors.telefone}</span>}
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Endereço *</label>
            <input
              style={{ ...styles.input, borderColor: errors.endereco ? "#ff4444" : "#e2e0f0" }}
              value={formData.endereco}
              onChange={(e) => handleChange("endereco", e.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
            {errors.endereco && <span style={{ color: "#ff4444", fontSize: "11px" }}>{errors.endereco}</span>}
          </div>
          
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Serviço *</label>
              <input
                style={{ ...styles.input, borderColor: errors.tipoServico ? "#ff4444" : "#e2e0f0" }}
                value={formData.tipoServico}
                onChange={(e) => handleChange("tipoServico", e.target.value)}
                placeholder="Ex: Instalação, Manutenção, Consultoria"
              />
              {errors.tipoServico && <span style={{ color: "#ff4444", fontSize: "11px" }}>{errors.tipoServico}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Preço (R$)</label>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) => handleChange("preco", e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={styles.sectionTitle}>📍 Localização</h3>
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Latitude</label>
            <input
              style={styles.input}
              value={formData.coordenadas.lat}
              onChange={(e) => handleChange("lat", e.target.value)}
              placeholder="-23.5505"
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Longitude</label>
            <input
              style={styles.input}
              value={formData.coordenadas.lng}
              onChange={(e) => handleChange("lng", e.target.value)}
              placeholder="-46.6333"
            />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={styles.sectionTitle}>⏱️ Prazos e SLAs</h3>
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Prazo</label>
            <input
              style={styles.input}
              type="date"
              value={formData.prazo}
              onChange={(e) => handleChange("prazo", e.target.value)}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>SLA (dias)</label>
            <input
              style={styles.input}
              type="number"
              value={formData.sla}
              onChange={(e) => handleChange("sla", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </div>
      
      <div>
        <h3 style={styles.sectionTitle}>📝 Observações</h3>
        <div style={styles.formGroup}>
          <textarea
            style={styles.textarea}
            value={formData.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            placeholder="Informações adicionais sobre o serviço..."
            rows={4}
          />
        </div>
      </div>
      
      <div style={styles.actionButtons}>
        <button
          style={styles.cancelBtn}
          onClick={onClose}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f3ff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
        >
          Cancelar
        </button>
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