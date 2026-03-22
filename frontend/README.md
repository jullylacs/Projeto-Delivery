# 📌 Requisitos da Plataforma Kanban – Delivery

A plataforma deverá ser um sistema web baseado em metodologia Kanban, com foco em gestão de demandas operacionais, comerciais e agendamento de instalações, garantindo rastreabilidade, organização e atualização em tempo real.

---

## 🧩 Funcionalidades Principais

### 📋 Gestão de Cards

- Criação de cards pelo time comercial contendo:
  - Cliente
  - Telefone para contato
  - Endereço completo
  - Coordenadas geográficas
  - Vendedor responsável (automático via login)
  - Tipo de serviço (DIA, BIA, L2L, etc.)
  - IP
  - SLA acordado
  - Prazo contratual
  - Observações adicionais
- Edição, duplicação, arquivamento e exclusão de cards
- Templates de cards para padronização

---

## 🔄 Fluxo Kanban (Colunas)

- Colunas personalizáveis (exemplo):
  - Novo
  - Em análise
  - Agendamento
  - Agendado
  - Em execução
  - Concluído
  - Inativo
- Movimentação via **drag-and-drop**
- Regras de transição entre etapas
- Limite de cards por coluna (WIP)

---

## 📅 Agendamento de Instalações

### 📆 Gestão de Agenda

- Agenda integrada por:
  - Dia
  - Semana
  - Técnico/equipe
- Visualização em formato:
  - Calendário
  - Lista
  - Timeline

---

### 👷‍♂️ Alocação de Técnicos

- Cadastro de técnicos/equipes
- Atribuição de instalação diretamente no card
- Controle de disponibilidade por técnico
- Evitar conflitos de horário (duplo agendamento)

---

### ⏰ Informações de Agendamento

Cada card poderá conter:

- Data da instalação
- Horário agendado
- Técnico responsável
- Janela de atendimento (ex: 08h–12h)
- Status do agendamento:
  - Pendente
  - Confirmado
  - Reagendado
  - Em execução
  - Finalizado

---

### 🔁 Reagendamento

- Alteração rápida de data/horário via drag no calendário
- Histórico de reagendamentos
- Motivo do reagendamento

---

### 🔔 Notificações de Agenda

- Alertas para:
  - Instalações próximas
  - Atrasos
  - Reagendamentos
- Notificação para:
  - Técnico
  - Comercial
  - Gestor

---

### 📍 Localização e Rota

- Integração com coordenadas do card
- Visualização de localização da instalação
- Possibilidade futura de otimização de rotas

---

### 📊 Indicadores de Instalação

- Instalações por dia/semana/mês
- Taxa de sucesso (concluído vs reagendado)
- Tempo médio de execução
- Produtividade por técnico

---

## 💬 Comunicação e Colaboração

- Comentários nos cards
- Menções (@usuário)
- Anexos (contratos, fotos, prints)
- Histórico completo de atividades

---

## 👥 Gestão de Usuários e Permissões

- Perfis:
  - Comercial
  - Operacional
  - Técnico
  - Gestor
  - Administrador
- Controle de permissões por ação
- Auditoria completa

---

## 📊 Dashboard (Tempo Real)

- Demandas:
  - Criadas
  - Em andamento
  - Concluídas
  - Inativas
- Instalações:
  - Agendadas
  - Em execução
  - Finalizadas
  - Reagendadas
- SLA:
  - Cumpridos vs violados

---

## ⏱️ SLA e Alertas

- Controle automático por card
- Alertas visuais (cores/status)
- Priorização por urgência

---

## 🔍 Busca e Filtros

- Por cliente, técnico, vendedor, status, data
- Filtros por período de instalação
- Busca rápida

---

## 🔔 Notificações

- Tempo real (WebSocket / Socket.io)
- Eventos:
  - Mudança de status
  - Novo comentário
  - Agendamento/criação

---

## ⚙️ Arquitetura Técnica

### 🎨 Front-end

- React, Vue ou Angular
- Drag-and-drop (ex: Angular CDK)
- Biblioteca de calendário (FullCalendar recomendado)
- RxJS + WebSocket

---

### 🖥️ Back-end

- Node.js
- Express ou NestJS
- Socket.io
- JWT (autenticação)
- API REST

---

### 🗄️ Banco de Dados

- MongoDB

#### Coleções sugeridas:

- Users
- Cards
- Columns
- Comments
- ActivityLogs
- Schedules (Agendamentos)
- Technicians (Técnicos)

---

## 🚀 Diferenciais

- Kanban + Agenda integrados (estilo CRM completo)
- Drag-and-drop tanto no quadro quanto no calendário
- Histórico completo de agendamentos
- Visão operacional + comercial no mesmo sistema
- Escalável para múltiplas equipes/regiões

---

## 🎯 Objetivo Final

Criar uma plataforma centralizada que permita:

- Controle total das demandas
- Organização eficiente das instalações
- Redução de atrasos e retrabalho
- Visibilidade em tempo real para todos os envolvidos