# Plano — Refactor de Anexos: base64-no-banco → arquivos no volume

- **Data:** 2026-07-13
- **Contexto:** ver `RELATORIO-INCIDENTE-OOM-ativacoes.md`. O OOM foi estancado com fixes de leitura (strip do base64 nas listagens/sync). Este documento é a **correção de raiz**: tirar os binários do banco.
- **Princípio:** o banco guarda **referência** (uuid + metadados); o **arquivo** vive no volume. Uploads e downloads em **streaming** (nunca base64-em-JSON, nunca binário inteiro em memória).

---

## 1. O que guarda base64 hoje (a origem do problema)

| Onde | Coluna | Conteúdo |
|---|---|---|
| `ativacoes` | `carta_pdf_base64` (TEXT) | PDF inteiro da Carta (já embute as fotos) |
| `ativacoes` | `evidencias` (JSONB) | fotos do técnico como dataURL base64 |
| `ativacoes` | `observacoes_anexos` (JSONB) | imagens/vídeos livres base64 |
| `ativacoes` | `teste_velocidade` (JSONB) | print do teste (pode ter imagem base64) |
| `cards` | `comments[].attachments[].data` (JSONB) | anexos de comentário + PDF da Carta anexado automaticamente |

---

## 2. Arquitetura alvo

- **Volume:** bind mount já criado — `/opt/docker/delivery/uploads` → `/app/uploads` (persistente, entra no backup do servidor).
- **Layout no volume:** `uploads/anexos/<aa>/<uuid>.<ext>` (subpasta pelos 2 primeiros hex do uuid, evita diretório gigante).
- **Tabela `anexos`** (nova) — referência única por arquivo:
  ```
  id (uuid, pk)
  path            (text)      -- caminho relativo dentro de /app/uploads
  filename        (text)      -- nome original
  mime            (text)
  size_bytes      (bigint)
  sha256          (char(64))  -- integridade + dedupe opcional
  owner_type      (text)      -- 'ativacao_evidencia' | 'ativacao_carta' | 'card_comment' ...
  owner_id        (text)      -- id da ativação/card
  created_at, created_by
  ```
- **Referência nos donos:** trocar os blobs por uuid(s):
  - `evidencias`/`observacoes_anexos` passam a ser arrays de `{ anexo_id, tipo, ... }` (sem `data`).
  - `carta_pdf_base64` → `carta_anexo_id` (ou gerar sob demanda, ver §4).
  - `comments[].attachments[]` passam a `{ anexo_id, name, type, size }` (sem `data`).

---

## 3. Fluxo de UPLOAD (técnico e demais)

- Trocar `PATCH /ativacoes/public/:token` e afins de **base64-em-JSON** para **`multipart/form-data`** com `multer` (`diskStorage` → grava direto no volume, streaming; nunca carrega o arquivo em memória).
- No handler: valida mime/size/quantidade → move p/ `uploads/anexos/...` → calcula `sha256` → cria linha em `anexos` → guarda o `anexo_id` no dono.
- **`REQUEST_BODY_LIMIT` cai de 600 MB para ~5–10 MB** (só JSON pequeno agora; o binário vai por multipart com limite próprio no multer, ex. 25 MB/arquivo, N arquivos).
- Frontend (`AtivacaoTecnico.jsx`, `Ativacoes.jsx`) passa a enviar `FormData` em vez de dataURL base64.

## 4. Fluxo de DOWNLOAD

- Endpoint dedicado `GET /anexos/:id` (com auth; para a carta pública, token) que faz **`fs.createReadStream`** do arquivo → `res` (streaming, memória constante). Ou `X-Accel-Redirect` no nginx servindo direto do volume.
- **PDF da Carta:** preferencialmente **gerar sob demanda** (o `pdfCartaAtivacao` já gera) e **cachear** no volume (`carta_anexo_id`), em vez de persistir base64. `GET /ativacoes/:id/carta` passa a stremar o arquivo do volume.

## 5. Migração dos dados existentes (idempotente, sem perda)

**Ordem obrigatória — nada é apagado antes de verificado:**

0. **Medir** o volume atual (nº de linhas e MB por coluna) — ver §8. Dá pra estimar tempo/espaço.
1. **Backup** dedicado das colunas base64 (dump só dessas colunas de `ativacoes` e `cards`) antes de tocar em qualquer coisa.
2. **Dual-write:** deploy do código novo que, ao criar/atualizar, **grava no volume + mantém o base64 antigo** (transição). Nada quebra.
3. **Backfill** (script idempotente, com `--dry-run`): varre linhas com base64 → escreve arquivo no volume → cria `anexos` → grava `anexo_id` → **valida `sha256`** (arquivo == base64 decodificado). Reexecutável: pula o que já tem `anexo_id` válido.
4. **Switch de leitura:** endpoints passam a servir do volume (via `anexo_id`). Verificar em produção.
5. **Parar de escrever base64** (remover o dual-write).
6. **Cleanup:** só depois de tudo verificado, `UPDATE ... SET carta_pdf_base64 = NULL` etc. e, por fim, migration que **dropa** as colunas + `VACUUM FULL`/reclaim do TOAST.

Cada etapa é reversível até a #6.

## 6. Mudanças no container / compose
- Volume: **já feito** (`/opt/docker/delivery/uploads:/app/uploads`).
- Garantir permissão de escrita do processo no diretório do volume.
- (Recomendado) `mem_limit` no container — um pico é contido pelo orquestrador em vez de OOM do Node.
- `REQUEST_BODY_LIMIT` reduzido no `.env` (após o switch de upload para multipart).

## 7. Ordem de rollout (resumo)
`schema anexos` → `código dual-write + upload multipart + download stream` (deploy) → `backfill dry-run` → `backfill real + validação sha256` → `switch de leitura` → `parar base64` → `cleanup + drop colunas`.

## 8. Passo 0 pendente — medir o volume de base64
Não consegui medir agora (o MCP do Postgres está sem conectividade nesta sessão e o banco estava saturado pelo crash-loop). Medir depois, via `psql` no servidor ou pela app:
```sql
SELECT
  (SELECT count(*) FROM ativacoes)                                   AS n_ativacoes,
  pg_size_pretty(pg_total_relation_size('ativacoes'))                AS ativacoes_total,
  pg_size_pretty(pg_total_relation_size((SELECT reltoastrelid FROM pg_class WHERE relname='ativacoes'))) AS ativacoes_toast,
  pg_size_pretty(pg_total_relation_size('cards'))                    AS cards_total;
```

## 9. Riscos & mitigações
- **Volume local não é compartilhado** entre réplicas/hosts → se escalar horizontalmente, migrar o "driver" de storage para S3/MinIO (o modelo `anexos` já abstrai isso).
- **Backup:** o volume precisa entrar na rotina de backup junto com o banco (senão perde-se o binário).
- **Perda de dados:** eliminada pela ordem acima (backup + dual-write + validação sha256 antes de qualquer delete).
