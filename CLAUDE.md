# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout do repositório

Monorepo simples com três `package.json`:

- raiz — orquestra dev/start via `concurrently` (deps `sequelize` e `pg` aqui são usadas pelo `sequelize-cli` no fluxo de migrations).
- `BackEnd/` — API Express 5 + Sequelize + Socket.io.
- `frontend/` — SPA React 19 + Vite + DnD Kit + React Router 7.

Idioma do código é **português** (comentários, identificadores de domínio como `cliente`, `vendedor`, `coluna_id`). Mantenha o padrão ao editar.

## Comandos

Rodar a stack inteira em dev (recomendado):
```bash
npm run dev                  # concurrently: backend + frontend (--host)
npm run dev:backend          # somente backend (nodemon)
npm run dev:frontend         # somente frontend (Vite)
npm run dev:frontend:host    # Vite expondo na rede
```

Backend (`cd BackEnd`):
```bash
npm run dev                  # nodemon server.js
npm start                    # node server.js
npm run db:migrate           # npx sequelize db:migrate
npm run db:undo              # reverte a última migration
npm run db:undo:all          # reverte tudo
```

Frontend (`cd frontend`):
```bash
npm run dev
npm run build
npm run lint                 # eslint .
npm run preview              # serve dist/
```

**Não há testes configurados** — backend `npm test` falha de propósito; frontend não tem script de teste. Não invente comandos para rodar testes.

Docker (`docker/`):
```bash
./build.docker.sh                                  # wizard interativo
make -f docker/Makefile build TAG=<v> TAG_LATEST=true
make -f docker/Makefile push  TAG=<v>
```

## Arquitetura — pontos não óbvios

### Estrutura de middleware (cuidado com o path)

Existem **duas pastas de middleware** no backend:

- `BackEnd/src/middleware/` — apenas `rateLimiter.js` (limiters globais e de login).
- `BackEnd/src/controllers/middleware/` — auth (`auth.js`, `requireAdmin.js`, `requireManagerOrAdmin.js`).

As rotas importam `../controllers/middleware/auth` e não `../middleware/auth`. Ao adicionar nova proteção, siga essa convenção (ou refatore a pasta — não há razão funcional para a divisão).

### Autenticação

- JWT em `Authorization: Bearer <token>`. `JWT_SECRET` é **obrigatório** no `.env`; sem ele o servidor retorna 500.
- Há um **token fixo de sistema** opcional via `SYSTEM_API_TOKEN`. Quando recebido, o `auth.js` injeta `req.user = { id: 0, isSystem: true }` e pula a verificação JWT. Use só para integrações máquina-a-máquina.
- Refresh-tokens são persistidos na tabela `refresh_tokens` (model `RefreshToken`). Endpoints: `POST /api/v1/users/refresh` e `POST /api/v1/users/logout`.
- `requireAdmin` e `requireManagerOrAdmin` **revalidam o perfil no banco** (não confiam no payload do token).

### Rotas — versionadas + legadas

`app.js` registra tudo sob `process.env.API_BASE_PATH` (default `/api/v1`). Se `ENABLE_LEGACY_ROUTES=true` (default em dev via `.env.example`), as mesmas rotas são expostas também sem prefixo (`/cards`, `/users`, etc.). Em produção (`ecosystem.config.cjs`) o legado vem desligado.

`OpenAPI` é gerado em runtime por `BackEnd/src/docs/openapi.js` e servido em `GET /api/v1/openapi.json`. Swagger UI em `GET /api/v1/docs` (carrega de unpkg.com — a CSP do helmet já libera esse domínio).

### Modelos e associações

Todas as associações Sequelize ficam centralizadas em `BackEnd/src/models/index.js`. Para adicionar um novo model, **inclua a associação ali** — os models individuais não se conhecem.

Convenções de FK importantes (o frontend depende delas):
- Snake-case nos FKs: `vendedor_id`, `coluna_id`, `card_id`, `usuario_id`, `tecnico_id`.
- Aliases das associações usam nomes em português: `as: "vendedor"`, `as: "column"`, `as: "comentarios"`, `as: "schedules"`.
- `Card.coordenadas` é `JSONB` (`{ lat, lng }`) — preserve a forma quando manipular.
- `Card.comments` também é `JSONB` (array embutido) **e** existe uma tabela `comments` separada (model `Comment`). Trate isso como dual-stack: o controller que tocar uma forma deve manter coerência com a outra se relevante para o fluxo.
- `User.perfil` é um ENUM: `convidado | comercial | operacional | tecnico | delivery | gestor | gestor_delivery | admin`. `User.aprovado` controla acesso (gestor/admin aprovam). `gestor_delivery` ("Gestora de Delivery") tem permissões específicas sobre a Agenda Geral de Delivery (criar/editar/excluir avisos compartilhados).
- Card.coluna_id usa `onDelete: "SET NULL"`; comments usam `CASCADE`. Notifications usam `SET NULL` (ver `20260504-alter-notifications-cardid-ondelete-setnull.js`).
- Notifications são **soft-delete** via flag `limpa` — nunca use `DELETE`. Limpar = `PATCH /api/v1/notifications/clear-read`.

### Agenda de Delivery (não confundir com `Schedule`)

Existem **duas agendas distintas**:
- `Schedule` (tabela `schedules`) — agenda OPERACIONAL de instalações, amarrada a `card_id` + `tecnico_id`. UI em `frontend/src/pages/Agenda.jsx`.
- `AgendaEvento` (tabela `agenda_eventos`) — agenda PESSOAL/GERAL estilo Google Calendar, dono = `usuario_id`. Campos: `titulo`, `descricao_html` (HTML sanitizado via `sanitize-html`, salvo pelo TipTap no front), `inicio`, `fim`, `all_day`, `escopo` (`individual`|`geral`), `tipo` (`tarefa`|`aviso`|`programacao`), `cor`. Rotas em `/api/v1/agenda-eventos`. UI em `frontend/src/pages/AgendaDelivery.jsx`.

Permissões da `AgendaEvento`:
- `escopo='individual'`: cada usuário só vê/edita os próprios; `admin` vê todos.
- `escopo='geral'`: criar/editar/excluir restrito a `{gestor_delivery, admin}`; visualizar liberado para `{delivery, gestor_delivery, gestor, admin}`.

HTML de `descricao_html` é sanitizado por `BackEnd/src/utils/sanitizeHtml.js` (tags: `b/strong, i/em, u, ul/ol/li, p, br, h1-3, a, blockquote, code, pre, span`). No frontend, renderize com `dangerouslySetInnerHTML` — é seguro porque a sanitização é no back.

### Sequelize CLI

`.sequelizerc` aponta o CLI para `src/database/config.js`, `src/models`, `src/database/migrations`, `src/database/seeders`. Rode `npm run db:migrate` **de dentro de `BackEnd/`** (o config lê variáveis do `BackEnd/.env`).

### Há um `config/config.json` na raiz com credenciais hardcoded

`config/config.json` na raiz do projeto contém credenciais de banco em texto plano. **Esse arquivo não é lido pelo Sequelize CLI** (o `.sequelizerc` aponta para `BackEnd/src/database/config.js`, que é dirigido por variáveis de ambiente). Se for tocar credenciais reais, ajuste o `.env`, não esse JSON. Considere remover do controle de versão.

### Socket.io

Inicializado em `BackEnd/server.js` (não em `app.js`). Compartilha lista de origens com CORS via `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL`. Handshake exige `socket.handshake.auth.token` — mas o middleware atualmente **só checa presença**, não valida o JWT. Se for usar socket para dados sensíveis, refaça essa validação.

### Frontend

- Bootstrap em `src/main.jsx` → `ErrorBoundary` → `App.jsx`. `App.jsx` define `<MainLayout>` com sidebar/header e roteia as páginas. Login/Register ficam fora do layout.
- **Toda a autenticação vive em `localStorage`**: chaves `token`, `user`. O interceptor de resposta em `src/services/api.js` faz logout automático em 401 (`localStorage.removeItem` + `window.location.href = "/login"`).
- A `baseURL` da API é composta em `src/services/api.js` a partir de `VITE_API_PROTOCOL`, `VITE_API_HOST`, `VITE_API_PORT`, `VITE_API_BASE_PATH` — ou de `VITE_API_URL` se definido (tem precedência).
- Padrão de proteção de rota: `AdminRoute` em `App.jsx` lê `user.perfil` do `localStorage` e libera só `admin`/`gestor`. Não há contexto global de auth; cada página consulta `localStorage` direto.
- Persistência local pesada: muitas preferências de UI (Kanban prefs, sidebar, Agenda, última rota privada, Trello import config) ficam em `localStorage`. Quando criar nova feature stateful, siga o mesmo padrão (e use chaves prefixadas como `kanbanPrefs`, `lastPrivateRoute`, etc.).
- Vite tem alias `@ -> src` (`vite.config.js`) — use `@/components/...` quando o caminho relativo ficar feio.
- **`Board.jsx` tem ~5000 linhas** e concentra a UI de Kanban inteira (DnD, import Trello, CSV/Excel export, comentários, modais). Antes de adicionar algo grande, considere extrair sub-componentes — mas mantenha as chaves de `localStorage` e o contrato com `coluna_id`/`vendedor_id` snake-case.

### Variáveis de ambiente críticas

Backend (`BackEnd/.env`, ver `.env.example`):
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — obrigatórios.
- `DB_HOST/PORT/NAME/USER/PASS` + `DB_SSL` / `DB_SSL_REJECT_UNAUTHORIZED`.
- `API_BASE_PATH` (default `/api/v1`), `ENABLE_LEGACY_ROUTES`.
- `REQUEST_BODY_LIMIT` (default `5mb`) — upload de avatar/anexo em base64 pode estourar isso.
- `GLOBAL_RATE_LIMIT_WINDOW_MS` / `GLOBAL_RATE_LIMIT_MAX` — em dev o default é 5000 reqs/15min; em prod cai para 1000.
- `CORS_ALLOWED_ORIGINS` — lista CSV; fallback é `FRONTEND_URL`. Normalizadas (lowercase, sem `/` final).
- `SYSTEM_API_TOKEN` — opcional, autentica como `id: 0` (ver acima).

Frontend (`frontend/.env`):
- `VITE_API_PROTOCOL`, `VITE_API_HOST`, `VITE_API_PORT`, opcionalmente `VITE_API_BASE_PATH`.
- Ou `VITE_API_URL` cheio (sobrescreve os demais).

### Deploy

- PM2 espera o backend em `/var/www/delivery/BackEnd` (`deploy/pm2/ecosystem.config.cjs`).
- Frontend assume reverse proxy externo (nginx) cuidando de TLS e roteamento. Build estático em `frontend/dist`.
- Docker Compose de referência em `docker/docker-compose.yml` usa imagens do `ghcr.io/jullylacs/`. Containerfile do frontend roda `vite --host` (dev server), **não** um build estático — útil para staging, não use em produção.
