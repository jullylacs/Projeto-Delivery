# NVX Networks — Plataforma Operacional

Plataforma web para gestão operacional e comercial com Kanban multi-board, Agenda, Mural, Ramais, Gráficos e colaboração em tempo real.

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

- **Kanban multi-board** — ciclo de vida de cards por área (Delivery, Comercial, BKO) com transferência entre boards.
- **Agenda de Delivery** — calendário colaborativo com escopo individual e geral, menções, notificações.
- **Agenda Operacional** — agendamento de instalações com técnicos.
- **Dashboard** — métricas de performance, SLA, atividade por cargo.
- **Gráficos** — charts de status, colunas, cargos e usuários.
- **Mural Interno** — comunicados com formatação Markdown, publicados por gestores.
- **Ramais** — diretório de ramais e responsáveis.
- **Notificações** — sistema de alertas por menção e atividade em cards.
- **Colaboração** — comentários com Markdown, @menções, anexos, respostas, reações e fixação.

---

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, Vite, React Router 7, Axios, DnD Kit, React Markdown, TipTap |
| Backend | Node.js, Express 5, Sequelize 6, JWT (access + refresh), Socket.io |
| Banco | PostgreSQL (JSONB para comments/coords/menções) |
| Persistência local | LocalStorage (preferências, tema, agenda, última rota, filtros de Kanban) |
| Deploy | PM2 (backend), nginx (reverse proxy + SSL), build estático (frontend) |

---

## Funcionalidades

### Autenticação e usuários
- Login e cadastro com validação completa.
- Perfis de acesso granulares (ver seção [Perfis de acesso](#perfis-de-acesso)).
- Painel administrativo com paginação server-side, busca e ordenação.
- Gerenciamento de senhas via painel admin (visualizar plain-text/hash, redefinir).
- Access token (8h) + refresh token (7d) com rotação automática no frontend.
- Refresh transparente: ao receber 401, tenta renovar o token sem deslogar o usuário.

### Kanban
- **3 boards independentes:** Delivery, Comercial e BKO (acesso por perfil de usuário).
- Criação, edição, duplicação, exclusão e movimentação de cards (drag-and-drop).
- Colunas dinâmicas: adicionar, editar, excluir, reordenar.
- Transferência de cards entre boards com seleção de coluna de destino.
- **Zones de drop** visíveis durante drag para transferência entre boards.
- Densidade visual configurável: compacta, média, confortável.
- "Atualizado por [nome] a X min" no rodapé de cada card.
- Status rápido inline com toast de confirmação.
- Importação via JSON e Trello; exportação CSV e Excel.
- Busca server-side com filtros de vendedor e status.
- Seleção múltipla de cards com ações em lote.
- Ação "Excluir todos os cards da coluna".
- Deep-link para card por ID (URL hash e localStorage).
- Abertura automática do card correto ao clicar em notificação (mesmo em outro board).

### Comentários e colaboração
- Formatação rica: **negrito**, *itálico*, listas, citação, código.
- @Menções com autocomplete, notificação ao mencionado e popup de perfil no hover.
- Respostas aninhadas com @menção via dropdown.
- Reações com emoji (👍❤️😂😮👏).
- **Fixar comentários** no topo da lista (accent amarelo, badge "📌 Fixado").
- Excluir comentários do sistema bloqueado (apenas comentários de usuário podem ser editados/excluídos).
- Anexos em comentários: imagens, vídeos, PDFs e outros arquivos.
  - Gerenciamento interno no `CommentInput` (sem race condition com FileReader).
  - Exclusão individual de anexos antes de enviar.
  - Preservação de anexos ao editar comentário.
- Histórico de comentários de sistema (movimentos, edições) — não editáveis/excluíveis.

### Agenda Delivery (AgendaEvento)
- Calendário multi-escopo: **Individual** e **Geral**.
- Visualizações: mês, semana e dia.
- Menção de usuários em eventos — notificação em tempo real ao mencionado.
- Drag-and-drop e criação por duplo clique no dia.
- Persistência de preferências (escopo, visão, data atual) em localStorage.

### Agenda Operacional (Schedule)
- Agendamento de instalações vinculadas a cards e técnicos.

### Dashboard
- Métricas: total de cards, taxa de conclusão, violações/avisos de SLA.
- Gráfico de barras por coluna.
- Atividade por cargo: cards atribuídos + cards atualizados (proxy de usabilidade).
- Filtro por board (Delivery / Comercial / BKO / Todos).
- Refresh automático silencioso a cada 3 minutos.

### Gráficos
- Donut de status geral (Concluído, Em andamento, Retorno B2B, Retorno Comercial, SLA alerta/vencido).
- Barras verticais por coluna.
- Filtro por board.

### Mural Interno
- Comunicados com formatação Markdown (negrito, itálico, listas, citação, código).
- Toolbar de formatação na caixa de composição.
- Apenas gestores e admins podem publicar/editar/excluir.
- Todos os perfis autorizados podem visualizar.
- Modal de edição e confirmação de exclusão.

### Ramais
- Diretório de ramais com link SIP (`sip:ramal`).
- Avatar colorido com iniciais por nome.
- Busca em tempo real por ramal ou responsável.
- CRUD completo para gestores e admins.

### Notificações
- Painel lateral com hero em gradiente, tempo relativo e badges por tipo.
- Tipos: Menção (`💬`), Urgente (`⚠️`), Info (`ℹ️`).
- Indicador de ponto com glow para não lidas.
- Ações: marcar uma lida, marcar todas lidas, limpar lidas, **excluir notificação individual**.
- Soft-delete: notificações nunca são deletadas, apenas marcadas com `limpa: true`.

### Tema escuro / claro
- Toggle 🌙/☀️ no header.
- Persistência em localStorage.
- Paleta escura elegante com tintes azul-roxo profundos, sombras corretas para fundo escuro e glow em elementos interativos.

### UX geral
- Sidebar recolhível com toggle no header.
- Skeleton loading nas telas principais.
- Toast de sucesso ao atualizar status de card.
- Toasts e feedbacks em todas as ações críticas.

---

## Estrutura do projeto

```text
Projeto-Delivery/
├── BackEnd/
│   ├── src/
│   │   ├── controllers/       # lógica de negócio
│   │   │   └── middleware/    # auth, requireAdmin, requireManagerOrAdmin
│   │   ├── models/            # Sequelize (User, Card, Column, Comment, Notification, AgendaEvento…)
│   │   ├── routes/            # Express routers versionados
│   │   ├── database/
│   │   │   ├── migrations/    # ALTER/CREATE TABLE (histórico completo)
│   │   │   └── seeders/
│   │   ├── utils/             # sanitizeHtml, etc.
│   │   ├── app.js             # Express + CORS + Helmet + Rate Limiter
│   │   └── server.js          # HTTP + Socket.io
│   ├── .env                   # variáveis locais (não versionado)
│   └── .sequelizerc
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Kanban/        # Board.jsx (~5600 linhas), CommentInput.jsx, CardModal.jsx
│   │   │   ├── Layout/        # Header.jsx, Sidebar.jsx
│   │   │   ├── Modal/
│   │   │   └── UI/            # RichTextEditor.jsx
│   │   ├── pages/             # Dashboard, Kanban, Agenda, AgendaDelivery, Graficos, Mural, Ramais, Profile, AdminUsers…
│   │   ├── services/
│   │   │   └── api.js         # Axios + interceptor de refresh automático
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
HOST=0.0.0.0          # use o IP da máquina se precisar acesso externo
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
| `CORS_ALLOWED_ORIGINS` | — | Lista CSV de origens permitidas (ex: `http://localhost:5173,https://app.exemplo.com`). |
| `ENABLE_LEGACY_ROUTES` | `true` | Expõe rotas sem prefixo `/api/v1` (desativar em produção). |
| `REQUEST_BODY_LIMIT` | `5mb` | Limite de payload; aumentar se houver uploads de avatar em base64. |
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

As migrations estão em `BackEnd/src/database/migrations/` e devem ser executadas na ordem do timestamp do nome do arquivo.

```bash
cd BackEnd
npm run db:migrate        # aplica todas as pendentes
npm run db:undo           # reverte a última
npm run db:undo:all       # reverte todas
```

**Principais migrations:**
| Arquivo | O que faz |
|---|---|
| `20240002-create-columns.js` | Cria tabela `columns` com colunas padrão |
| `20240004-create-cards.js` | Cria tabela `cards` com JSONB para comments/coords |
| `20240007-create-notifications.js` | Cria tabela `notifications` com soft-delete |
| `20260518-alter-columns-add-board.js` | Adiciona campo `board` às colunas (multi-board) |
| `20260519-create-agenda-eventos.js` | Tabela de eventos da Agenda Delivery |
| `20260603-alter-agenda-eventos-add-mencoes.js` | Campo `mencoes` (JSONB) nos eventos |
| `20260603-alter-cards-add-atualizado-por-nome.js` | Quem atualizou o card por último |

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
| `GET` | `/api/v1/users/:id` | Perfil do usuário |
| `PUT` | `/api/v1/users/:id` | Atualizar perfil (inclui `senhaAtual` + `novaSenha` para troca) |
| `GET` | `/api/v1/users/admin` | Listar todos (paginado, gestor/admin; inclui campo `senha`) |
| `PUT` | `/api/v1/users/admin/:id` | Editar qualquer usuário (inclui `nova_senha`) |
| `PATCH` | `/api/v1/users/admin/:id/approve` | Aprovar usuário |
| `GET` | `/api/v1/users/assignable` | Usuários disponíveis para menções/atribuição |

### Cards (Kanban)
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/cards/board-summary` | Snapshot inicial do board (`?board=delivery|comercial|bko`) |
| `GET` | `/api/v1/cards` | Listar cards com filtros/paginação |
| `POST` | `/api/v1/cards` | Criar card |
| `GET` | `/api/v1/cards/:id` | Buscar card por ID (incluindo board — usado para deep-link de notificação) |
| `PUT` | `/api/v1/cards/:id` | Atualizar card (grava `atualizado_por_nome`) |
| `DELETE` | `/api/v1/cards/:id` | Excluir card |
| `POST` | `/api/v1/cards/:id/transfer` | Transferir card entre boards |

### Comentários
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/cards/:id/comments` | Adicionar comentário (com `attachments`) |
| `PATCH` | `/api/v1/cards/:id/comments/:cid` | Editar comentário (com `attachments`) |
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

### Notificações
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/notifications/sync` | Sincronizar notificações geradas pelo frontend |
| `GET` | `/api/v1/notifications` | Listar notificações do usuário logado |
| `PATCH` | `/api/v1/notifications/:id/read` | Marcar uma como lida |
| `PATCH` | `/api/v1/notifications/read-all` | Marcar todas como lidas |
| `PATCH` | `/api/v1/notifications/:id/clear` | Excluir notificação individual (soft-delete) |
| `PATCH` | `/api/v1/notifications/clear-read` | Limpar todas as lidas (soft-delete) |

### Agenda Delivery (AgendaEvento)
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/agenda-eventos` | Listar eventos (`?escopo=individual|geral&inicio=&fim=`) |
| `POST` | `/api/v1/agenda-eventos` | Criar evento (com `mencoes`) |
| `PUT` | `/api/v1/agenda-eventos/:id` | Editar evento |
| `DELETE` | `/api/v1/agenda-eventos/:id` | Excluir evento |

### Dashboard e Gráficos
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | Métricas gerais (`?board=`) |

### Mural
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/mural` | Listar posts |
| `POST` | `/api/v1/mural` | Criar post (gestor/admin) |
| `PUT` | `/api/v1/mural/:id` | Editar post |
| `DELETE` | `/api/v1/mural/:id` | Excluir post |

### Ramais
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/ramais` | Listar ramais |
| `POST` | `/api/v1/ramais` | Criar ramal (gestor/admin) |
| `PUT` | `/api/v1/ramais/:id` | Editar ramal |
| `DELETE` | `/api/v1/ramais/:id` | Excluir ramal |

### Agenda Operacional e Técnicos
| Método | Rota | Descrição |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/v1/schedules` | CRUD de agendamentos |
| `GET` | `/api/v1/technicians` | Listar técnicos |

### Outros
| Método | Rota | Descrição |
|---|---|---|
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
| `admin` | Acesso total; aprova usuários, gerencia tudo |
| `gestor` | Acesso amplo ao Kanban e gestão de usuários |
| `gestor_delivery` | Cria/edita eventos gerais da Agenda Delivery |
| `delivery` | Acesso ao Kanban Delivery e Agenda Delivery |
| `comercial` | Acesso ao Kanban Comercial |
| `operacional` | Acesso operacional |
| `tecnico` | Acesso técnico |
| `bko` | Acesso ao board BKO |
| `noc` | Acesso ao Kanban Delivery e Agenda Delivery |
| `convidado` | Acesso mínimo |

O acesso a cada board Kanban é configurado por flags booleanas (`acesso_kanban_delivery`, `acesso_kanban_comercial`, `acesso_kanban_bko`) independentes do perfil.

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
- [ ] Banco criado e migrations aplicadas
- [ ] PM2 ou Docker iniciando e reiniciando automaticamente
- [ ] Nginx com SSL configurado e apontando para a porta correta
- [ ] Health check: `GET https://dominio.com/api/v1/health/db`

---

## Troubleshooting

### `EADDRINUSE: address already in use :::3003`
A porta está em uso por um processo anterior (comum após crash do nodemon).
```powershell
Stop-Process -Name node -Force   # mata todos os processos node
```

### `EADDRNOTAVAIL: address not available <IP>:3003`
O IP configurado em `HOST` não existe mais na máquina (IP de rede mudou, ex: Wi-Fi reconectado).
- Verificar IP atual com `ipconfig`
- Atualizar `HOST` e `CORS_ALLOWED_ORIGINS` no `BackEnd/.env`
- Atualizar `VITE_API_URL` no `frontend/.env`

### `CORS blocked for origin`
A origem do frontend não está na lista permitida.
- Adicionar a origem em `CORS_ALLOWED_ORIGINS` (CSV): `http://10.2.1.140:5173,http://localhost:5173`

### `Sequelize connection refused`
PostgreSQL desligado ou credenciais incorretas.
- Verificar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` no `.env`
- Confirmar que o PostgreSQL está rodando

### `JWT_SECRET não configurado — servidor retorna 500`
O arquivo `.env` não tem `JWT_SECRET` ou `JWT_REFRESH_SECRET`.
- Copiar `.env.example` para `.env` e preencher os valores.

### Cards não aparecem no Kanban
- Verificar se o usuário tem as flags `acesso_kanban_*` corretas no banco.
- Checar a aba Network do browser para ver o retorno de `/api/v1/cards/board-summary`.

### Card de outro board não abre ao clicar em notificação
- O sistema faz `GET /cards/:id` para descobrir o board antes de navegar.
- Verificar se a migration `20260603-alter-cards-add-atualizado-por-nome.js` foi aplicada (o endpoint `/cards/:id` depende do model atualizado).

### Tema escuro não persiste após recarregar
- O tema é salvo em `localStorage` com a chave `"theme"`.
- Se `localStorage` estiver bloqueado (modo privado em alguns browsers), o tema sempre começa claro.

### Migrations com erro
```bash
cd BackEnd
npm run db:undo:all   # reverte tudo
npm run db:migrate    # reaplicar do zero
```

---

## Segurança e boas práticas

- **JWT_SECRET** jamais deve ser commitado ou exposto. Use um valor aleatório forte (≥ 32 chars) em produção.
- **Refresh tokens** são persistidos na tabela `refresh_tokens` e revogados no logout.
- **`requireAdmin`** e **`requireManagerOrAdmin`** revalidam o perfil no banco a cada request (não confiam no payload do token).
- **Soft-delete** em notificações: nunca `DELETE`, apenas `limpa = true`. Histórico preservado.
- **Sanitização HTML**: `descricao_html` da Agenda é sanitizado via `sanitize-html` antes de salvar.
- **Rate limiting**: configurável via `GLOBAL_RATE_LIMIT_*`; padrão 5000 req/15min em dev, reduzir em produção.
- **Helmet**: CSP configurada para permitir apenas recursos confiáveis (`self` + `unpkg.com` para Swagger).
- **CORS**: configurado seletivamente; documentação com `*`, dados protegidos com restrição de origem.
