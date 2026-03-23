import React from 'react';

// Componente que exibe um indicador visual do status SLA baseado no prazo e status do card
const SLAIndicator = ({ prazo, sla, status }) => {
  // Função que calcula o status SLA baseado na data do prazo e status atual
  const getSLAStatus = () => {
    if (!prazo) return { color: '#999', symbol: '⚪', label: 'Sem prazo' };

    const now = new Date();
    const deadline = new Date(prazo);
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    // Se já venceu e não está concluído/inativo
    if (daysUntil < 0 && status !== 'Concluído' && status !== 'Inativo') {
      return { color: '#d32f2f', symbol: '🔴', label: 'Vencido' };
    }

    // Se está vencido mas status é Concluído/Inativo
    if (daysUntil < 0 && (status === 'Concluído' || status === 'Inativo')) {
      return { color: '#00b050', symbol: '🟢', label: 'Ok' };
    }

    // Se vence nos próximos 3 dias
    if (daysUntil >= 0 && daysUntil <= 3) {
      return { color: '#ff9800', symbol: '🟠', label: 'Próximo' };
    }

    // Se vence em 4-7 dias
    if (daysUntil > 3 && daysUntil <= 7) {
      return { color: '#ffc107', symbol: '🟡', label: 'Atenção' };
    }

    // Se vence em mais de 7 dias
    return { color: '#4caf50', symbol: '🟢', label: 'Ok' };
  };

  const slaStatus = getSLAStatus();

  // Renderiza o indicador visual com cor, símbolo e label apropriados
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: `${slaStatus.color}22`,
      border: `1px solid ${slaStatus.color}`,
      cursor: 'default'
    }} title={slaStatus.label}>
      <span style={{ fontSize: '14px' }}>{slaStatus.symbol}</span>
      <span style={{ fontSize: '11px', fontWeight: '500', color: slaStatus.color }}>
        {slaStatus.label}
      </span>
    </div>
  );
};

export default SLAIndicator;
