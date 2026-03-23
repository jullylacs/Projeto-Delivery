import React, { useEffect, useState } from 'react';
import api from '../../services/api';

// Componente que exibe o histórico de atividades de um card específico
const ActivityHistory = ({ cardId }) => {
  const [activities, setActivities] = useState([]); // Lista de atividades do card
  const [loading, setLoading] = useState(false); // Estado de carregamento

  // Hook que busca o histórico de atividades quando o cardId muda
  useEffect(() => {
    if (!cardId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/activity-logs/card/${cardId}`);
        setActivities(response.data);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [cardId]);

  // Função que retorna o estilo e label do badge baseado no tipo de ação
  const getActionBadge = (action) => {
    const badges = {
      CREATED: { color: '#4caf50', label: '✅ Criado' },
      UPDATED: { color: '#2196f3', label: '✏️ Atualizado' },
      DELETED: { color: '#d32f2f', label: '🗑️ Deletado' },
      MOVED: { color: '#ff9800', label: '↔️ Movido' },
      COMMENTED: { color: '#9c27b0', label: '💬 Comentado' }
    };
    return badges[action] || { color: '#999', label: action };
  };

  // Função que formata uma data para o formato brasileiro
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Renderiza mensagem de carregamento enquanto busca dados
  if (loading) {
    return <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>Carregando histórico...</div>;
  }

  // Renderiza mensagem quando não há atividades
  if (!activities || activities.length === 0) {
    return <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>Sem histórico de atividades</div>;
  }

  // Renderiza a lista de atividades em formato de timeline
  return (
    <div style={{
      padding: '16px',
      maxHeight: '400px',
      overflowY: 'auto',
      borderTop: '1px solid #e0e0e0'
    }}>
      <h4 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '14px', fontWeight: '600' }}>
        📋 Histórico de Atividades
      </h4>

      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        {/* Linha vertical da timeline */}
        <div style={{
          position: 'absolute',
          left: '8px',
          top: '0',
          bottom: '0',
          width: '2px',
          backgroundColor: '#e0e0e0'
        }} />

        {/* Mapeia cada atividade para um item da timeline */}
        {activities.map((activity, index) => {
          const badge = getActionBadge(activity.action);
          return (
            <div key={activity._id} style={{
              marginBottom: '16px',
              position: 'relative'
            }}>
              {/* Ponto na timeline */}
              <div style={{
                position: 'absolute',
                left: '-16px',
                top: '4px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: badge.color,
                border: '3px solid #fff',
                boxShadow: `0 0 0 2px ${badge.color}`
              }} />

              {/* Conteúdo da atividade */}
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                borderLeft: `3px solid ${badge.color}`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: badge.color,
                    color: '#fff',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {badge.label}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    {formatDate(activity.timestamp)}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#333', marginBottom: '4px' }}>
                  {activity.description}
                </div>

                {activity.userName && (
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    Por: <strong>{activity.userName}</strong>
                  </div>
                )}

                {/* Mostra mudanças se existirem */}
                {activity.changes && Object.keys(activity.changes).length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#666',
                    fontFamily: 'monospace',
                    backgroundColor: '#fff',
                    padding: '6px',
                    borderRadius: '3px',
                    maxHeight: '80px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}>
                    {JSON.stringify(activity.changes, null, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityHistory;
