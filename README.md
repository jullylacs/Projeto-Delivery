# NVX Fibra LTDA - Plataforma Operacional

Plataforma web para operacao de campo com Kanban, Agenda e colaboracao em cards.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-4c1d95)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-2563eb)
![Backend](https://img.shields.io/badge/backend-Node%20%2B%20Express-0f766e)
![Database](https://img.shields.io/badge/database-PostgreSQL-1d4ed8)
![Auth](https://img.shields.io/badge/auth-JWT-9333ea)

---

## Sumario

- [Visao geral](#visao-geral)
- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Funcionalidades entregues](#funcionalidades-entregues)
- [Melhorias recentes](#melhorias-recentes)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como rodar localmente](#como-rodar-localmente)
- [Scripts uteis](#scripts-uteis)
- [Roadmap tecnico](#roadmap-tecnico)
- [Observacoes](#observacoes)

---

## Visao geral

O sistema centraliza o fluxo operacional da empresa em tres frentes:

1. Kanban para ciclo de vida de cards operacionais/comerciais.
2. Agenda para organizacao de tarefas por dia, semana e mes.
3. Colaboracao em comentarios com mencoes, anexos e historico.

Objetivo pratico: reduzir retrabalho, acelerar resposta operacional e melhorar a visibilidade da execucao.

---

## Arquitetura

```mermaid
flowchart LR
	U[Usuario] --> F[Frontend React/Vite]
	F --> A[API Node/Express]
	A --> D[(PostgreSQL)]
	F --> L[(LocalStorage)]
	A --> S[Socket.io Infra]
```

---

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React, Vite, React Router, Axios, DnD Kit, React Markdown, remark-gfm |
| Backend | Node.js, Express, Sequelize, JWT, Socket.io |
| Banco | PostgreSQL |
| Persistencia local | LocalStorage (preferencias, estado de tela, agenda e configuracoes) |

---

## Funcionalidades entregues

### Autenticacao e usuarios
- Login e cadastro com validacoes alinhadas entre frontend e backend.
- Perfis de acesso aplicados (comercial, operacional, tecnico, gestor, admin).
- Painel administrativo com paginacao server-side.
- Persistencia de filtros/ordenacao/paginacao da tela administrativa.

### Kanban
- Criacao, edicao, duplicacao, exclusao e movimentacao de cards.
- Colunas dinamicas (adicionar, editar, excluir).
- Acao de excluir todos os cards de uma coluna.
- Promocao visual de card atualizado para topo da coluna.
- Densidade visual configuravel (compacto, medio, confortavel).
- Importacao via JSON e importacao direta do Trello.
- Exportacao CSV e Excel.

### Comentarios e colaboracao
- Mencoes com notificacao e navegação ate o card mencionado.
- Hover em mencao com cartao de usuario (foto, nome, cargo).
- Comentarios com formatacao rica:
	- negrito
	- italico
	- listas
	- citacao
	- codigo
- Anexos com fluxo pendente (so envia ao clicar em Enviar).
- Imagens sem forcar nome como texto.
- PDF com abrir, baixar e imprimir.

### Agenda
- Modos de visualizacao: mes, semana e dia.
- Criacao de tarefa por clique direito no dia.
- Entrada rapida no dia por duplo clique.
- Modo dia com mini-cards de tarefa (titulo, horario, observacoes).
- Drag-and-drop entre status (planejado, andamento, concluido).
- Persistencia robusta de tarefas e preferencias.

### UX geral
- Skeleton loading nas telas principais.
- Melhorias de microinteracao e animacao.
- Ajustes de camadas e sobreposicao de menus.
- Branding atualizado para NVX Fibra LTDA no cabecalho.

---

## Melhorias recentes

### Backend
- Limite de payload configuravel para uploads maiores.
- Tratamento amigavel de erro 413.
- Correcao de persistencia de comentarios nos cards.
- Ajuste de associacao Sequelize para evitar conflito de nomes.
- Rate limiting global parametrizavel para evitar bloqueios indevidos em dev.

### Frontend
- Menus de dados agrupados em popover.
- Importacao Trello com persistencia local de configuracoes.
- Melhorias de drag-and-drop na Agenda para arraste mais confortavel.

---

## Estrutura do projeto

```text
Projeto-Delivery/
	BackEnd/
		src/
			controllers/
			models/
			routes/
			middleware/
			database/
	frontend/
		src/
			components/
			pages/
			services/
```

---

## Como rodar localmente

### Requisitos
- Node.js 18+
- PostgreSQL em execucao

### Backend
```bash
cd BackEnd
npm install
# configurar .env com base no .env.example
npm run dev
```

API padrao: http://localhost:3000

### Frontend
```bash
cd frontend
npm install
npm run dev
```

App padrao: http://localhost:5173

---

## Scripts uteis

### Backend
- npm run dev
- npm run db:migrate
- npm run db:undo

### Frontend
- npm run dev
- npm run build

---

## Roadmap tecnico

- Persistencia completa em banco para Agenda (hoje parte local).
- WebSocket em producao para atualizacao em tempo real ponta a ponta.
- Auditoria de eventos por card e por usuario.
- Testes automatizados de fluxo principal (frontend e backend).

---

## Observacoes

- Este README descreve o estado atual implementado.
- Algumas funcionalidades originalmente planejadas foram adaptadas para entregas iterativas.
- Para importacao Trello, use credenciais validas com permissao de leitura do board.
