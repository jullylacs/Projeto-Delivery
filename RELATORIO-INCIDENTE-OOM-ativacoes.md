# Relatório de Incidente — Backend em crash-loop (OOM)

- **Data:** 2026-07-13
- **Serviço:** `delivery-backend` (container Docker, host `delivery.nvxnetworks.com` → porta 13000)
- **Severidade:** 🔴 Crítica — backend indisponível (loop de reinício contínuo)
- **Status:** Causa raiz identificada, corrigida e **validada em produção**. Crash-loop resolvido. Dívida técnica conhecida em aberto (ver §8).

> ⚠️ Este relatório foi **corrigido** após a investigação completa. A primeira hipótese (endpoint `GET /ativacoes`) estava **errada** — a verificação ao vivo provou isso. A causa raiz real é o `POST /notifications/sync`. A jornada está documentada em §6 de propósito, como lição.

---

## 1. Resumo executivo

O backend subia normal e **morria ~50–90 s depois** com `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`. O heap ia a ~4 GB e o processo era abortado (`SIGABRT`); com `restart: unless-stopped`, o Docker reiniciava e o ciclo se repetia **indefinidamente**.

**Causa raiz:** o endpoint `POST /api/v1/notifications/sync` (`notificationController.syncMine`) fazia `Card.findAll` carregando a coluna `comments` (JSONB) de **todos os cards, sem limite**. Cada comentário carrega campos **base64 embutidos** — sobretudo **`authorAvatar` (~95 KB por comentário!)** e `attachment` (imagens/PDF). Somados, ~**197 MB por chamada**.

Esse endpoint é chamado **automaticamente** pelo Header global (em toda página) no load/reconnect. Quando o backend voltava, **todas as abas abertas** disparavam o sync ao mesmo tempo → *thundering herd* → N × ~197 MB (× overhead de parse do Sequelize) → 4 GB → OOM → reinício → repete.

**Correção (validada):** remover as chaves base64 (`authorAvatar`, `attachment`, `attachments`) dos comentários **e das respostas** direto no SQL, dentro do `syncMine`. Resultado medido em produção: **196.8 MB → 1.48 MB por chamada (133×)**, sem vazamento de base64 e preservando `text`/`author` (o que os builders de notificação usam).

---

## 2. Sintoma

- `docker ps`: `delivery-backend` sempre "Up" de poucos segundos (revivendo).
- `docker inspect`: `RestartCount` subindo; `Memory=0` (sem limite no container — só o teto de ~4 GB do Node o continha); `RestartPolicy=unless-stopped`.

---

## 3. Evidências

### 3.1 Watch de memória — ANTES (quebrado)
```
2.13 GiB CPU=104%  →  3.09  →  3.48  →  4.04  →  4.29 GiB (teto)  →  MORRE  →  reinicia e já sobe de novo
```
CPU cravada em ~100–130% **desde o 1º segundo**; o balão **recomeça sozinho a cada boot**.

### 3.2 Watch de memória — DEPOIS (corrigido)
```
oscila 200 MB – 1 GB, com GC reciclando; CPU cai a 0.01% ocioso; RestartCount=0
```

### 3.3 tcpdump vazio (pista decisiva)
Duas capturas no netns do container (porta 3000) **não viram requisição nova** durante o estouro. Conclusão: a requisição-gatilho chega **no 1º segundo** após o boot e o **event loop trava** processando (não aceita novas conexões) — por isso o tcpdump, anexado já com o processo travando, não via nada.

### 3.4 Medição da causa (node dentro do container)
```
nCards 553 | totalCommentsBytes 196.8MB | avatarBytes 118.0MB | attachmentBytes 65.2MB | repliesBytes 12.1MB
```
O **`authorAvatar` (118 MB)** é o maior custo, seguido de `attachment` (65 MB). A chave `attachments` (plural) é irrelevante nesse dataset — por isso os primeiros strips (que miravam `attachments`) **não reduziram nada**.

### 3.5 Validação do fix (mesma medição, com o novo strip)
```
totalCommentsBytes 1.48MB | vazamentos avatar/attachment 0/0 | preservados text/author 5302/5302
```

---

## 4. Causa raiz (cadeia)

1. **Modelagem:** comentários de card guardam base64 inline — `authorAvatar` (avatar do autor duplicado em CADA comentário, ~95 KB), `attachment` (imagem/PDF), e o PDF da Carta anexado automaticamente. Tudo dentro do JSONB `cards.comments`.
2. **Endpoint fatal:** `syncMine` faz `Card.findAll` trazendo `comments` cru de **todos** os cards → ~197 MB/chamada em memória.
3. **Gatilho automático + concorrência:** `Header.jsx` chama `POST /notifications/sync` (`refreshNotifications`) no load/reconnect, em **toda página**. No boot, todas as abas disparam junto → o somatório concorrente estoura os 4 GB.

---

## 5. Por que os endpoints de listagem NÃO eram a causa (e por que não podem ser "blindados" isolados)

`GET /cards` (~204 MB) e `GET /ativacoes` também trafegam o base64 — mas são chamados **sob ação do usuário** (abrir board/ativações), não automaticamente em toda aba. Não eram o gatilho do loop.

E, crucialmente: **os modais de detalhe do frontend renderizam a partir dos dados da LISTA**, não rebuscam o detalhe (`Ativacoes.jsx` usa `ativacao.evidencias` da lista; `Board.jsx` usa o card da lista). Logo, **strippar as listas quebra os modais** (as evidências/anexos somem). Por isso os strips de lista foram **revertidos** (ver §7) — reduzi-las com segurança exige antes uma mudança no front (modal rebuscar `getById`).

---

## 6. Investigação — por que demorou (lição)

1. 1ª hipótese: `GET /ativacoes` sem `exclude` → **errada**. Deployado, o container **ainda** dava OOM (verificado: fix presente, crash persistia).
2. 2ª rodada: strip nas listagens de card mirando a chave `attachments` (plural) → **chave errada**, não estripava nada (o base64 está em `authorAvatar`/`attachment`).
3. A **verificação ao vivo** (medir o tamanho real da resposta = 204 MB, e inspecionar as chaves) foi o que revelou a verdade: avatares como maior custo, e o `syncMine` como o auto-gatilho.
4. **Moral:** validar ao vivo (medir bytes, inspecionar estrutura real) antes de declarar vitória. Leitura de código sozinha levou a duas conclusões erradas.

---

## 7. Correção aplicada

- **`notificationController.js` (`syncMine`) — o fix real:** literal SQL que remove `authorAvatar`/`attachment`/`attachments` dos comentários e respostas antes de carregar. **Validado: 197 MB → 1.48 MB/chamada, 0 vazamentos, text/author preservados.** Mata o crash-loop de forma robusta (independente da carga).
- **`app.js` — `trust proxy`:** `app.set("trust proxy", 1)`. Limpa o `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` e conserta a identificação de IP do rate-limit (backend atrás do Nginx Proxy Manager).
- **Revertido — `ativacaoController.getAll` e `cardController` (strips de lista):** removiam base64 das listas, mas quebravam os modais (evidências/anexos sumindo — regressão live). Revertidos para restaurar os modais.

---

## 8. Dívida técnica em aberto (conhecida, não urgente)

1. **`GET /cards` (~204 MB) e `GET /ativacoes` (pesado)** ainda trafegam todo o base64 → lento + risco latente de OOM sob concorrência alta (bem menor que o `syncMine`, que era automático). **Correção correta:** front rebusca o detalhe (`getById`/`getCardById`) ao abrir o modal → aí o back strippa as listas com segurança. Mudança acoplada front+back.
2. **`authorAvatar` duplicado em cada comentário** — anti-padrão; o avatar deveria vir do registro do usuário, não do snapshot do comentário.
3. **base64-no-banco** (avatares, anexos, PDFs) — a doença de raiz. Cura = refactor de volume (ver `PLANO-REFACTOR-ANEXOS-VOLUME.md`). **Migração adiada** — deve ser feita com calma, fora de pico, backup-first.
4. **`REQUEST_BODY_LIMIT=600mb`** — reduzir após migrar upload para multipart/streaming.
5. **Fixes descommitados** no working tree — travar em commit para não perder em build limpo.

---

## 9. Prevenção

- **Nunca** `findAll` sem `limit`/projeção enxuta em tabelas com JSONB/base64 grande. Listagem ≠ detalhe.
- **Validar ao vivo** (medir bytes de resposta, inspecionar estrutura) antes de declarar um fix pronto.
- Definir `mem_limit` no container (um pico é contido pelo orquestrador em vez de OOM do Node).
- Uploads sempre em streaming (multipart), nunca base64-em-JSON.
- Corrigir `trust proxy` ao rodar atrás de proxy (já feito).
