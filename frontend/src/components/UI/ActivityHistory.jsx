import React, { useEffect, useState } from 'react';
import api from '../../services/api'; 
// Importa o serviço de API para fazer requisições HTTP

// Componente que exibe o histórico de atividades de um card específico
const ActivityHistory = ({ cardId }) => {
  const [activities, setActivities] = useState([]); // Estado para armazenar atividades do card
  const [loading, setLoading] = useState(false); // Estado para controlar carregamento

  // useEffect para buscar o histórico sempre que o cardId mudar
  useEffect(() => {
    if (!cardId) return; // Se não houver cardId, não faz nada

    const fetchHistory = async () => {
      setLoading(true); // Ativa indicador de carregamento
      try {
        // Requisição GET para buscar atividades relacionadas ao cardId
        const response = await api.get(`/activity-logs/card/${cardId}`);
        setActivities(response.data); // Atualiza estado com os dados recebidos
      } catch (err) {
        console.error('Erro ao buscar histórico:', err); // Loga erro caso ocorra
      }
      setLoading(false); // Desativa indicador de carregamento
    };

    fetchHistory(); // Chama a função assíncrona
  }, [cardId]);

  // Função que retorna estilo e label do badge baseado na ação da atividade
  const getActionBadge = (action) => {
    const badges = {
      CREATED: { color: '#4caf50', label: '✅ Criado' },
      UPDATED: { color: '#2196f3', label: '✏️ Atualizado' },
      DELETED: { color: '#d32f2f', label: '🗑️ Deletado' },
      MOVED: { color: '#ff9800', label: '↔️ Movido' },
      COMMENTED: { color: '#9c27b0', label: '💬 Comentado' }
    };
    return badges[action] || { color: '#999', label: action }; // Caso a ação não exista
  };

  // Função que formata data para o padrão brasileiro com hora
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mostra mensagem de carregamento enquanto busca os dados
  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
        Carregando histórico...
      </div>
    );
  }

  // Mostra mensagem caso não existam atividades
  if (!activities || activities.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
        Sem histórico de atividades
      </div>
    );
  }

  // Renderiza a lista de atividades como uma timeline
  return (
    <div style={{
      padding: '16px',
      maxHeight: '400px', // Limita altura do container
      overflowY: 'auto', // Permite rolagem vertical
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

        {/* Mapeia cada atividade do histórico */}
        {activities.map((activity, index) => {
          const badge = getActionBadge(activity.action); // Obtém cor e label do badge
          return (
            <div key={activity._id} style={{ marginBottom: '16px', position: 'relative' }}>
              
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
                {/* Cabeçalho do item com badge e data */}
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
                    {badge.label} {/* Label da ação */}
                  </span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {formatDate(activity.timestamp)} {/* Data da atividade */}
                  </span>
                </div>

                {/* Descrição da atividade */}
                <div style={{ fontSize: '13px', color: '#333', marginBottom: '4px' }}>
                  {activity.description}
                </div>

                {/* Nome do usuário que realizou a atividade */}
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
                    {JSON.stringify(activity.changes, null, 2)} {/* Exibe mudanças formatadas */}
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