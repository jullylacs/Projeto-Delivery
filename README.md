# NVX Networks — Plataforma Operacional

Plataforma web para gestão operacional e comercial com Kanban multi-board, Agenda, Mural, Ramais, Gráficos, Notas Pessoais e colaboração em tempo real.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-4c1d95)
![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-2563eb)
![Backend](https://img.shields.io/badge/backend-Node%20%2B%20Express%205-0f766e)
![Database](https://img.shields.io/badge/database-PostgreSQL-1d4ed8)
![Auth](https://img.shields.io/badge/auth-JWT%20%2B%20Refresh-9333ea)

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Migrations](#migrations)
- [API — Rotas principais](#api--rotas-principais)
- [Autenticação](#autenticação)
- [Perfis de acesso](#perfis-de-acesso)
- [Documentação OpenAPI](#documentação-openapi)
- [Scripts úteis](#scripts-úteis)
- [Deploy](#deploy)
- [Troubleshooting](#troubleshooting)
- [Segurança e boas práticas](#segurança-e-boas-práticas)

---

## Visão geral

Sistema que centraliza o fluxo operacional da empresa em múltiplas frentes:

- **Kanban multi-board** — ciclo de vida de cards por área (Delivery, Comercial, BKO, Compras) com transferência individual e em lote entre boards.
- **Agenda de Delivery** — calendário colaborativo com escopo individual e geral, menções, notificações.
- **Agenda Operacional** — agendamento de instalações com técnicos.
- **Dashboard** — métricas de performance, SLA, atividade por cargo.
- **Gráficos** — charts de status, colunas, cargos e usuários.
- **Mural Interno** — comunicados com editor rico TipTap (HTML), publicados exclusivamente por admins.
- **Notas Pessoais** — editor com blocos interativos (tabela, gráfico, callouts, checklists, imagens, links).
- **Ramais** — diretório de ramais e responsáveis.
- **Notificações** — sistema de alertas por menção e atividade em cards.
- **Colaboração** — comentários com formatação rica, @menções, anexos, respostas, reações e fixação.

---

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, Vite, React Router 7, Axios, DnD Kit, TipTap 2 (editor rico), Lucide React |
| Backend | Node.js, Express 5, Sequelize 6, JWT (access + refresh), Socket.io, sanitize-html |
| Banco | PostgreSQL (JSONB para comments/coords/menções/midias) |
| Persistência local | LocalStorage (preferências, tema, agenda, última rota, filtros de Kanban, permissões de board) |
| Deploy | PM2 (backend), nginx (reverse proxy + SSL), build estático (frontend) |

---

## Funcionalidades

### Autenticação e usuários
- Login e cadastro com validação completa.
- Perfis de acesso granulares (ver seção [Perfis de acesso](#perfis-de-acesso)).
- Painel administrativo com paginação server-side, busca e ordenação.
- Gerenciamento de senhas via painel admin.
- Access token (8h) + refresh token (7d) com rotação automática no frontend.
- Refresh transparente: ao receber 401, tenta renovar o token sem deslogar o usuário.

### Kanban
- **4 boards independentes:** Delivery 🛵, Comercial 💼, BKO 🗂️ e Compras 🛒 — acesso configurável por usuário via flags booleanas.
- Criação, edição, duplicação, exclusão e movimentação de cards (drag-and-drop).
- Colunas dinâmicas: adicionar, editar, excluir, reordenar via drag ou botões ←/→.
- **Transferência individual de card entre boards** — zonas de drop visíveis durante drag com seleção de coluna de destino.
- **Transferência em lote de cards entre boards** — seleciona N cards e move para outro Kanban com um clique, incluindo seleção de coluna de destino no board alvo.
- **Seleção múltipla** — botão "Selecionar vários", checkbox por card e por coluna (seleciona todos). Ações em lote: mover para coluna do mesmo board, transferir para outro board, excluir.
- **Auto-refresh de permissões de board** — ao abrir o Kanban, o frontend busca o perfil atualizado da API e atualiza o localStorage; usuários que receberam novo acesso veem a aba sem precisar de logout.
- Densidade visual configurável: mini, compacto, médio, confortável.
- Busca server-side com filtros de vendedor e status.
- Importação via JSON e Trello; exportação CSV e Excel.
- Deep-link para card por ID (URL hash e localStorage).
- Abertura automática do card correto ao clicar em notificação (mesmo em outro board).

### Lixeira de Cards
- Soft-delete: cards excluídos vão para a Lixeira (campo `deleted_at`).
- Remoção automática após 30 dias.
- Página `/lixeira` com busca, filtro por board e restauração individual (todos os perfis podem visualizar e restaurar).
- Exclusão permanente manual para gestor/admin.

### Arquivar Cards
- Campo `arquivado` na tabela `cards`; cards saem do board sem serem excluídos.
- Página `/arquivados` acessível a todos com acesso ao board.
- Busca, filtro por board e desarquivamento individual.

### Comentários e colaboração
- Formatação rica: **negrito**, *itálico*, listas, citação, código.
- @Menções com autocomplete, notificação ao mencionado e popup de perfil no hover.
- Respostas aninhadas, reações com emoji (👍❤️😂😮👏).
- **Fixar comentários** no topo da lista (accent amarelo, badge "📌 Fixado").
- Anexos em comentários: imagens, vídeos, PDFs e outros arquivos.
- Histórico de comentários de sistema (movimentos, edições) — não editáveis/excluíveis.

### Mural Interno
- **Editor rico TipTap** com toolbar completa: negrito, itálico, sublinhado, tachado, H1–H3, listas com marcador/numerada, citação, código inline/bloco, separador, desfazer/refazer — com destaque visual (active state).
- Conteúdo salvo como HTML (suporte retroativo a posts antigos em texto plano).
- **Publicação restrita a `admin`** — demais perfis apenas visualizam.
- Botão "Publicar" com estado de carregamento para evitar duplo clique.
- Upload de imagens e vídeos (limites configuráveis: 3 MB/imagem, 8 MB/vídeo).
- **Sanitização HTML no backend** via `sanitize-html` — apenas tags seguras são persistidas.
- Modal de edição com o mesmo editor rico.
- Galeria de imagens com lightbox e player de vídeo inline.

### Agenda Delivery (AgendaEvento)
- Calendário multi-escopo: **Individual** e **Geral**.
- Visualizações: mês, semana e dia.
- Menção de usuários em eventos — notificação em tempo real ao mencionado.
- Drag-and-drop e criação por duplo clique no dia.

### Agenda Operacional (Schedule)
- Agendamento de instalações vinculadas a cards e técnicos.

### Dashboard
- Métricas: total de cards, taxa de conclusão, violações/avisos de SLA.
- Gráfico de barras por coluna, filtro por board.
- Refresh automático silencioso a cada 3 minutos.

### Gráficos
- Donut de status geral e barras verticais por coluna.
- **Auto-refresh silencioso a cada 30 segundos** — indicador de horário da última atualização.

### Notas Pessoais
Editor estilo **Notion** com blocos interativos, painel de inserção e auto-save.

**Painel "➕ Inserir bloco"** — abre modal centralizado com 5 categorias:
- **Texto:** Parágrafo, H1, H2, H3
- **Listas:** Com marcador, numerada, ✅ Tarefas com checkboxes
- **Destaques:** 💡 Info, ⚠️ Aviso, ✅ Sucesso, ❌ Erro, Citação, Código
- **Inserir:** Imagem (base64), Link, Separador
- **Widgets:** ⊞ Tabela editável, 📊 Gráfico de barras

**Toolbar de formatação:**
- Negrito, Itálico, Sublinhado, Tachado
- Cor do texto (9 cores) e Destaque (5 cores)
- H1, H2, H3
- Listas: • / 1. / ☑ Tarefas
- Citação, código inline, bloco de código, separador
- Desfazer / Refazer

**Widgets interativos** (editados via modais externos para evitar conflito com o editor):
- **Tabela** — células editáveis com Tab entre células, + linha/coluna, toggle cabeçalho, remoção de linhas/colunas
- **Gráfico de barras** — título, rótulos, valores e cor personalizáveis; visualização inline, edição em modal

**Outras funcionalidades:**
- Auto-save: título em 1 s, conteúdo em 1,5 s — flush imediato ao trocar de nota (evita perda de dados).
- Atualização otimista do estado local ao trocar de nota — navegar de volta mostra conteúdo correto.
- Organização por 6 cores de fundo (rgba adaptável ao tema) e marcação de favoritas (⭐).
- Sidebar redesenhada: header com contador de notas, busca com ícone integrado, cards com data à direita e preview inline.
- Layout centralizado (max-width 740px) com linha de metadados abaixo do título (cor, favoritar, data, status de save, excluir).
- Cores dos callouts via `rgba` adaptável ao tema claro/escuro.
- Cada usuário vê e edita apenas as próprias notas.

### Temas
- **3 temas:** Claro 🌙, Cinza ⭐ e Escuro ☀️ — ciclo ao clicar no botão do header.
- **Tema cinza** — paleta cinza-azulada suave (inspirada em Mantine UI "dim"): `bg #25262b`, cards `#2c2e33`, texto `#c9cad1`. Overrides abrangentes para elementos com cores hardcoded (brancos em hex/rgb, near-whites, modais, `.mural-root`, agenda, ramais).
- Persistência em localStorage; restauração antes do primeiro render.

### Ramais
- Diretório com link SIP, avatar colorido, busca em tempo real.
- CRUD completo para gestores e admins.

### Notificações
- Painel lateral com hero em gradiente, tempo relativo e badges por tipo.
- Ações: marcar lida, marcar todas, limpar lidas, excluir individual.
- Soft-delete: `limpa: true` (nunca DELETE).

### UX geral
- Sidebar recolhível com toggle no header.
- Layout responsivo completo (overlay em mobile < 768 px).
- Skeleton loading nas telas principais.
- Toast de sucesso e feedbacks em todas as ações críticas.

---

## Estrutura do projeto

```text
Projeto-Delivery/
├── BackEnd/
│   ├── src/
│   │   ├── controllers/       # lógica de negócio
│   │   │   └── middleware/    # auth, requireAdmin, requireManagerOrAdmin
│   │   ├── models/            # Sequelize (User, Card, Column, Comment, Notification, AgendaEvento, Nota, MuralPost…)
│   │   ├── routes/            # Express routers versionados
│   │   ├── database/
│   │   │   ├── migrations/    # ALTER/CREATE TABLE (histórico completo)
│   │   │   └── seeders/
│   │   ├── utils/             # sanitizeHtml.js
│   │   ├── app.js             # Express + CORS + Helmet + Rate Limiter
│   │   └── server.js          # HTTP + Socket.io
│   ├── .env                   # variáveis locais (não versionado)
│   └── .sequelizerc
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Kanban/        # Board.jsx, CommentInput.jsx, CardModal.jsx
│   │   │   ├── Layout/        # Header.jsx (toggle 3 temas), Sidebar.jsx
│   │   │   └── UI/
│   │   ├── pages/
│   │   │   ├── Kanban.jsx     # Tabs de board + auto-refresh de permissões
│   │   │   ├── Mural.jsx      # Editor TipTap rico
│   │   │   ├── Notas.jsx      # Editor estilo Notion
│   │   │   ├── Dashboard.jsx, Graficos.jsx, Agenda.jsx, AgendaDelivery.jsx
│   │   │   ├── AdminUsers.jsx # Gerencia acesso_kanban_* por usuário
│   │   │   ├── Lixeira.jsx, Arquivados.jsx, Ramais.jsx, Profile.jsx
│   │   │   └── Login.jsx, Register.jsx
│   │   ├── hooks/             # useWindowWidth.js
│   │   ├── services/
│   │   │   └── api.js         # Axios + interceptor de refresh automático
│   │   ├── index.css          # Variáveis CSS + temas claro/cinza/escuro
│   │   └── main.jsx
│   ├── .env                   # variáveis locais (não versionado)
│   └── vite.config.js
├── docker/                    # Docker Compose de referência (staging)
├── deploy/
│   └── pm2/                   # ecosystem.config.cjs
└── package.json               # concurrently para rodar tudo junto
```

---

## Como rodar localmente

### Requisitos
- Node.js 18+
- PostgreSQL em execução
- Arquivo `BackEnd/.env` configurado (ver abaixo)

### Instalar dependências e subir tudo

```bash
# Na raiz do projeto
npm install
npm run dev          # sobe backend (nodemon) + frontend (Vite) em paralelo
```

Ou separado:
```bash
npm run dev:backend   # apenas backend
npm run dev:frontend  # apenas frontend
```

### Acesso padrão
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3003/api/v1
- **Swagger UI:** http://localhost:3003/api/v1/docs

---

## Variáveis de ambiente

### Backend — `BackEnd/.env`

```env
# ── Servidor ──────────────────────────────
NODE_ENV=development
HOST=0.0.0.0
PORT=3003

# ── Banco de dados ─────────────────────────
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=delivery_sys
DB_USER=postgres
DB_PASS=postgres
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

# ── JWT ────────────────────────────────────
JWT_SECRET=sua_chave_forte_aqui
JWT_REFRESH_SECRET=outra_chave_forte_aqui
JWT_ACCESS_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# ── API ────────────────────────────────────
API_BASE_PATH=/api/v1
ENABLE_LEGACY_ROUTES=true          # false em produção

# ── CORS ───────────────────────────────────
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://10.x.x.x:5173

# ── Upload / Rate limit ────────────────────
REQUEST_BODY_LIMIT=5mb
GLOBAL_RATE_LIMIT_WINDOW_MS=900000
GLOBAL_RATE_LIMIT_MAX=5000         # reduzir em produção (ex: 1000)

# ── Token de sistema (opcional) ────────────
# SYSTEM_API_TOKEN=token_fixo_para_integrações_máquina_a_máquina
```

| Variável | Padrão | Descrição |
|---|---|---|
| `JWT_SECRET` | — | **Obrigatório.** Chave para assinar access tokens. |
| `JWT_REFRESH_SECRET` | — | **Obrigatório.** Chave para assinar refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN` | `8h` | Duração do access token. |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Duração do refresh token. |
| `HOST` | `localhost` | IP de bind do servidor. Use `0.0.0.0` para todas interfaces. |
| `CORS_ALLOWED_ORIGINS` | — | Lista CSV de origens permitidas. |
| `ENABLE_LEGACY_ROUTES` | `true` | Expõe rotas sem prefixo `/api/v1` (desativar em produção). |
| `REQUEST_BODY_LIMIT` | `5mb` | Limite de payload; aumentar se houver uploads de avatar/mídia em base64. |
| `SYSTEM_API_TOKEN` | — | Token fixo para integrações M2M. Injeta `req.user = { id: 0, isSystem: true }`. |

### Frontend — `frontend/.env`

```env
# Opção 1: URL completa (tem precedência)
VITE_API_URL=http://localhost:3003/api/v1

# Opção 2: Composição por partes
# VITE_API_PROTOCOL=http
# VITE_API_HOST=localhost
# VITE_API_PORT=3003
# VITE_API_BASE_PATH=/api/v1
```

---

## Migrations

As migrations estão em `BackEnd/src/database/migrations/` e devem ser executadas na ordem do timestamp.

```bash
cd BackEnd
npm run db:migrate        # aplica todas as pendentes
npm run db:undo           # reverte a última
npm run db:undo:all       # reverte todas
```

**Principais migrations:**

| Arquivo | O que faz |
|---|---|
| `20240002-create-columns.js` | Cria tabela `columns` |
| `20240004-create-cards.js` | Cria tabela `cards` com JSONB para comments/coords |
| `20240007-create-notifications.js` | Cria tabela `notifications` com soft-delete |
| `20260518-alter-columns-add-board.js` | Adiciona campo `board` às colunas (multi-board) |
| `20260518-alter-users-add-kanban-access.js` | Adiciona `acesso_kanban_delivery` e `acesso_kanban_comercial` |
| `20260519-create-agenda-eventos.js` | Tabela de eventos da Agenda Delivery |
| `20260602-alter-users-add-kanban-bko.js` | Adiciona `acesso_kanban_bko` com backfill para admin/gestor |
| `20260603-alter-agenda-eventos-add-mencoes.js` | Campo `mencoes` (JSONB) nos eventos |
| `20260603-alter-cards-add-atualizado-por-nome.js` | Campo `atualizado_por_nome` nos cards |
| `20260618-add-trash-to-cards.js` | Adiciona `deleted_at` (Lixeira / soft-delete) |
| `20260618b-add-archived-to-cards.js` | Adiciona `arquivado` nos cards |
| `20260618c-create-notas.js` | Cria tabela `notas` (titulo, conteudo TEXT, cor, favorita, usuario_id) |
| `20260625-alter-users-add-kanban-compras.js` | Adiciona `acesso_kanban_compras` com backfill para admin/gestor |

> **Nota:** A migration do board Compras pode já ter sido aplicada diretamente ao banco em alguns ambientes. Verificar via `SequelizeMeta` antes de rodar.

---

## API — Rotas principais

> Todas as rotas requerem `Authorization: Bearer <token>` exceto login, register e health.

### Usuários
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/users/login` | Login; retorna `{ token, refreshToken, user }` |
| `POST` | `/api/v1/users/register` | Cadastro |
| `POST` | `/api/v1/users/refresh` | Renova access token via refreshToken |
| `POST` | `/api/v1/users/logout` | Revoga refresh token |
| `GET` | `/api/v1/users/:id` | Perfil do usuário (inclui flags `acesso_kanban_*`) |
| `PUT` | `/api/v1/users/:id` | Atualizar perfil |
| `GET` | `/api/v1/users/admin` | Listar todos (paginado, gestor/admin) |
| `PUT` | `/api/v1/users/admin/:id` | Editar qualquer usuário (inclui `acesso_kanban_compras`, `nova_senha`) |
| `PATCH` | `/api/v1/users/admin/:id/approve` | Aprovar usuário |
| `GET` | `/api/v1/users/assignable` | Usuários disponíveis para menções/atribuição |

### Cards (Kanban)
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/cards/board-summary` | Snapshot inicial do board (`?board=delivery\|comercial\|bko\|compras`) |
| `GET` | `/api/v1/cards` | Listar cards com filtros/paginação |
| `POST` | `/api/v1/cards` | Criar card |
| `GET` | `/api/v1/cards/:id` | Buscar card por ID |
| `PUT` | `/api/v1/cards/:id` | Atualizar card (mover de coluna, editar campos) |
| `DELETE` | `/api/v1/cards/:id` | Mover card para a Lixeira (soft-delete) |
| `POST` | `/api/v1/cards/:id/transfer` | **Transferir card entre boards** (usado também na transferência em lote) |
| `GET` | `/api/v1/cards/trash` | Listar cards na lixeira |
| `POST` | `/api/v1/cards/:id/restore` | Restaurar card da lixeira |
| `DELETE` | `/api/v1/cards/:id/permanent` | Excluir permanentemente (gestor/admin) |
| `POST` | `/api/v1/cards/:id/archive` | Arquivar card |
| `POST` | `/api/v1/cards/:id/unarchive` | Desarquivar card |
| `GET` | `/api/v1/cards/archived` | Listar cards arquivados |

### Comentários
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/cards/:id/comments` | Adicionar comentário (com `attachments`) |
| `PATCH` | `/api/v1/cards/:id/comments/:cid` | Editar comentário |
| `DELETE` | `/api/v1/cards/:id/comments/:cid` | Excluir comentário |
| `PATCH` | `/api/v1/cards/:id/comments/:cid/pin` | Fixar/desafixar comentário |
| `POST` | `/api/v1/cards/:id/comments/:cid/reactions` | Toggle reação (emoji) |
| `POST` | `/api/v1/cards/:id/comments/:cid/replies` | Adicionar resposta |
| `PATCH` | `/api/v1/cards/:id/comments/:cid/replies/:rid` | Editar resposta |
| `DELETE` | `/api/v1/cards/:id/comments/:cid/replies/:rid` | Excluir resposta |

### Colunas
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/columns` | Listar colunas (`?board=`) |
| `POST` | `/api/v1/columns` | Criar coluna |
| `PUT` | `/api/v1/columns/:id` | Editar coluna |
| `DELETE` | `/api/v1/columns/:id` | Excluir coluna (apenas se vazia) |
| `PUT` | `/api/v1/columns/reorder` | Reordenar colunas |
| `DELETE` | `/api/v1/columns/:id/cards` | Excluir todos os cards da coluna |

### Notificações
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/notifications/sync` | Sincronizar notificações |
| `GET` | `/api/v1/notifications` | Listar notificações do usuário logado |
| `PATCH` | `/api/v1/notifications/:id/read` | Marcar uma como lida |
| `PATCH` | `/api/v1/notifications/read-all` | Marcar todas como lidas |
| `PATCH` | `/api/v1/notifications/:id/clear` | Excluir notificação (soft-delete) |
| `PATCH` | `/api/v1/notifications/clear-read` | Limpar todas as lidas |

### Agenda Delivery
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/agenda-eventos` | Listar eventos (`?escopo=individual\|geral&inicio=&fim=`) |
| `POST` | `/api/v1/agenda-eventos` | Criar evento (com `mencoes`) |
| `PUT` | `/api/v1/agenda-eventos/:id` | Editar evento |
| `DELETE` | `/api/v1/agenda-eventos/:id` | Excluir evento |

### Mural
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/mural` | Listar posts (todos os perfis autorizados) |
| `POST` | `/api/v1/mural` | Criar post (apenas `admin`) — conteúdo HTML sanitizado |
| `PUT` | `/api/v1/mural/:id` | Editar post — conteúdo HTML sanitizado |
| `DELETE` | `/api/v1/mural/:id` | Excluir post |

### Notas Pessoais
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/notas` | Listar notas do usuário logado (favoritas primeiro) |
| `GET` | `/api/v1/notas/:id` | Buscar nota por ID |
| `POST` | `/api/v1/notas` | Criar nota |
| `PUT` | `/api/v1/notas/:id` | Atualizar nota (titulo, conteudo HTML, cor, favorita) |
| `DELETE` | `/api/v1/notas/:id` | Excluir nota |

### Dashboard e outros
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | Métricas gerais (`?board=`) |
| `GET/POST/PUT/DELETE` | `/api/v1/ramais` | CRUD de ramais |
| `GET/POST/PUT/DELETE` | `/api/v1/schedules` | CRUD de agendamentos operacionais |
| `GET` | `/api/v1/technicians` | Listar técnicos |
| `GET` | `/api/v1/health/db` | Health check do banco (sem auth) |
| `GET` | `/api/v1/openapi.json` | Especificação OpenAPI |
| `GET` | `/api/v1/docs` | Swagger UI |

---

## Autenticação

### Fluxo completo

```
1. POST /api/v1/users/login  →  { token, refreshToken, user }
2. Requests:  Authorization: Bearer <token>
3. Token expira (8h)  →  interceptor automático chama POST /users/refresh
4. POST /api/v1/users/refresh  { refreshToken }  →  { token, refreshToken }
5. Retry da request original com novo token
6. Se refresh também expirar  →  logout automático
```

O frontend gerencia o refresh **transparentemente**: o usuário não é deslogado enquanto o refresh token (7 dias) for válido.

### Tokens de sistema

Para integrações M2M, definir `SYSTEM_API_TOKEN` no `.env`. Requests com esse token recebem `req.user = { id: 0, isSystem: true }` e ignoram verificação JWT.

---

## Perfis de acesso

| Perfil | Descrição |
|---|---|
| `admin` | Acesso total; aprova usuários, publica no Mural, gerencia tudo |
| `gestor` | Acesso amplo ao Kanban e gestão de usuários |
| `gestor_delivery` | Cria/edita eventos gerais da Agenda Delivery |
| `delivery` | Acesso ao Kanban Delivery e Agenda Delivery |
| `comercial` | Acesso ao Kanban Comercial |
| `operacional` | Acesso operacional |
| `tecnico` | Acesso técnico |
| `bko` | Acesso ao board BKO |
| `noc` | Acesso ao Kanban Delivery e Agenda Delivery |
| `convidado` | Acesso mínimo |

> **Mural:** apenas `admin` pode publicar, editar e excluir comunicados.
> **Lixeira:** `gestor` e `admin` podem acessar `/lixeira` e realizar exclusões permanentes.

O acesso a cada board Kanban é configurado por flags booleanas independentes do perfil:

| Flag | Board |
|---|---|
| `acesso_kanban_delivery` | 🛵 Delivery |
| `acesso_kanban_comercial` | 💼 Comercial |
| `acesso_kanban_bko` | 🗂️ BKO |
| `acesso_kanban_compras` | 🛒 Compras |

Administradores configuram essas flags no painel **Admin → Usuários**. O frontend atualiza automaticamente as abas visíveis sem necessidade de logout.

---

## Documentação OpenAPI

Com o backend rodando:
- **JSON:** `http://localhost:3003/api/v1/openapi.json`
- **Swagger UI:** `http://localhost:3003/api/v1/docs`

---

## Scripts úteis

### Raiz (roda tudo junto)
```bash
npm run dev                  # backend + frontend
npm run dev:backend          # só backend (nodemon)
npm run dev:frontend         # só frontend (Vite)
npm run dev:frontend:host    # Vite exposto na rede
```

### Backend
```bash
cd BackEnd
npm run dev           # nodemon
npm start             # node (produção)
npm run db:migrate    # aplica migrations pendentes
npm run db:undo       # reverte última migration
npm run db:undo:all   # reverte todas
```

### Frontend
```bash
cd frontend
npm run dev           # servidor de desenvolvimento
npm run build         # gera dist/
npm run preview       # serve dist/ localmente
npm run lint          # ESLint
```

---

## Deploy

### Arquitetura de produção

```
Internet
   │
   ▼
[Nginx — SSL/TLS + reverse proxy]
   │
   ▼
[Node/Express — PM2]
   │
   ▼
[PostgreSQL]
```

### Backend com PM2

```bash
cd BackEnd
npm install --production
npm run db:migrate
pm2 start deploy/pm2/ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

### Frontend (build estático)

```bash
cd frontend
npm install
npm run build
# Servir frontend/dist/ via nginx ou Express static
```

### Checklist pré-deploy

- [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` com valores aleatórios fortes (≥ 32 chars)
- [ ] `NODE_ENV=production`
- [ ] `ENABLE_LEGACY_ROUTES=false`
- [ ] `CORS_ALLOWED_ORIGINS` com o domínio correto em HTTPS
- [ ] `FRONTEND_URL` com HTTPS
- [ ] Banco criado e **todas as migrations aplicadas** (incluindo `acesso_kanban_compras`)
- [ ] PM2 ou Docker iniciando e reiniciando automaticamente
- [ ] Nginx com SSL configurado e apontando para a porta correta
- [ ] Health check: `GET https://dominio.com/api/v1/health/db`

---

## Troubleshooting

### `EADDRINUSE: address already in use :::3003`
```powershell
Stop-Process -Name node -Force
```

### `EADDRNOTAVAIL: address not available <IP>:3003`
O IP configurado em `HOST` mudou (ex: Wi-Fi reconectado).
- Verificar IP com `ipconfig`
- Atualizar `HOST` e `CORS_ALLOWED_ORIGINS` no `BackEnd/.env`
- Atualizar `VITE_API_URL` no `frontend/.env`

### `CORS blocked for origin`
Adicionar a origem em `CORS_ALLOWED_ORIGINS`: `http://10.2.1.140:5173,http://localhost:5173`

### `Sequelize connection refused`
PostgreSQL desligado ou credenciais incorretas. Verificar `DB_*` no `.env`.

### `JWT_SECRET não configurado — servidor retorna 500`
Copiar `.env.example` para `.env` e preencher `JWT_SECRET` e `JWT_REFRESH_SECRET`.

### Cards não aparecem no Kanban / aba não aparece
- Verificar se o usuário tem as flags `acesso_kanban_*` corretas no banco.
- O Kanban busca permissões atualizadas ao montar — se a aba ainda não aparecer, verificar se a coluna `acesso_kanban_compras` existe na tabela `users` (rodar `npm run db:migrate`).
- Checar a aba Network do browser: `GET /api/v1/users/:id` deve retornar `acesso_kanban_compras: true`.

### Aba Compras não aparece mesmo com permissão
A coluna `acesso_kanban_compras` pode não existir no banco se a migration falhou silenciosamente. Verificar:
```bash
cd BackEnd
npm run db:migrate
```
Se a migration já consta no `SequelizeMeta` mas a coluna não existe, adicionar manualmente:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS acesso_kanban_compras BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET acesso_kanban_compras = TRUE WHERE perfil IN ('admin','gestor');
```

### Notas não salvam ao trocar rapidamente
O auto-save tem debounce de 1,5 s. Ao trocar de nota, as mudanças são salvas imediatamente (flush). Se mesmo assim houver perda, verificar `REQUEST_BODY_LIMIT` — notas com muitas imagens base64 podem exceder 5 MB.

### Tema cinza não aplica em algumas páginas
O tema cinza usa overrides CSS via `[style*="..."]` para cobrir cores hardcoded. Se alguma área ficar branca, verificar se a cor exata usada no componente está coberta nos overrides do `index.css` na seção `html[data-theme="gray"]`.

### Card de outro board não abre ao clicar em notificação
O sistema faz `GET /cards/:id` para descobrir o board antes de navegar. Verificar se a migration `20260603-alter-cards-add-atualizado-por-nome.js` foi aplicada.

### Migrations com erro
```bash
cd BackEnd
npm run db:undo:all
npm run db:migrate
```

---

## Segurança e boas práticas

- **JWT_SECRET** jamais deve ser commitado. Use valor aleatório forte (≥ 32 chars) em produção.
- **Refresh tokens** são persistidos em `refresh_tokens` e revogados no logout.
- **`requireAdmin`** e **`requireManagerOrAdmin`** revalidam o perfil no banco a cada request.
- **Soft-delete** em notificações: nunca `DELETE`, apenas `limpa = true`.
- **Soft-delete na Lixeira**: cards excluídos recebem `deleted_at`; removidos definitivamente após 30 dias ou manualmente.
- **Sanitização HTML**: `descricao_html` da Agenda, `conteudo` das Notas e posts do Mural são sanitizados via `sanitize-html` antes de salvar — apenas tags seguras persistem.
- **Rate limiting**: configurável via `GLOBAL_RATE_LIMIT_*`; padrão 5000 req/15min em dev, reduzir em produção.
- **Helmet**: CSP configurada para permitir apenas recursos confiáveis.
- **CORS**: configurado seletivamente por origem.
