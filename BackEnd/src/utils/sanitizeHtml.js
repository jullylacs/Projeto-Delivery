// Helper de sanitização de HTML para conteúdos vindos de editores rich text
// (ex.: TipTap na "Agenda de Delivery"). Apenas as tags/atributos abaixo
// passam — qualquer outro markup é descartado.
const sanitizeHtml = require("sanitize-html");

const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "a",
  "blockquote",
  "code",
  "pre",
  "span",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "rel"],
  span: ["style"],
};

const OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  // Restringe esquemas de URL aceitos em <a href>.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // Força rel/seguro em links.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

/**
 * Sanitiza uma string HTML. Retorna `null`/string vazia inalterados.
 * @param {string|null|undefined} html
 * @returns {string|null}
 */
function sanitizeRichHtml(html) {
  if (html === null || html === undefined) return html ?? null;
  if (typeof html !== "string") return null;
  if (html.trim() === "") return "";
  return sanitizeHtml(html, OPTIONS);
}

// ─── Sanitizador permissivo para Notas Pessoais ──────────────────────────────
//
// As Notas são conteúdo privado: cada usuário vê APENAS as próprias notas.
// Portanto o risco de XSS inter-usuário é nulo — um usuário só conseguiria
// "XSS-ar" a si mesmo. Mesmo assim, removemos tags de script/iframe/event
// handlers por boas práticas, mas permitimos tudo que o editor TipTap produz:
//
//  • <div data-callout>         → blocos de destaque (info/aviso/sucesso/erro)
//  • <div data-chart>           → gráfico de barras serializado como JSON
//  • <div data-custom-table>    → tabela customizada serializada como JSON
//  • <hr>                       → separador
//  • <img>                      → imagens (base64)
//  • <mark style="...">         → destaque de texto colorido
//  • <s>                        → texto tachado
//  • <ul data-type="taskList">  → lista de tarefas
//  • <li data-type="taskItem">  → item de tarefa com checkbox
//  • <a href>                   → links
//  • tags de texto comuns       → negrito, itálico, sublinhado, headings…

const NOTAS_ALLOWED_TAGS = [
  // Texto e formatação
  "b", "strong", "i", "em", "u", "s", "del", "strike",
  "p", "br", "span", "mark",
  // Headings
  "h1", "h2", "h3",
  // Listas (incluindo task list do TipTap)
  "ul", "ol", "li",
  // Blocos
  "blockquote", "code", "pre",
  // Estrutura — necessário para callouts, chart e tabela (nós customizados)
  "div",
  // Separador
  "hr",
  // Mídia
  "img",
  // Links
  "a",
];

const NOTAS_ALLOWED_ATTRIBUTES = {
  // Links
  a: ["href", "target", "rel"],
  // Cor de texto e destaque (TipTap usa style inline)
  span: ["style"],
  // Destaque colorido do TipTap (<mark style="background-color:...">)
  mark: ["style"],
  // Imagens em base64
  img: ["src", "alt"],
  // Nós customizados do TipTap — os dados são serializados como JSON no atributo
  div: ["data-callout", "data-callout-type", "data-chart", "data-custom-table"],
  // Task list do TipTap
  ul: ["data-type"],
  li: ["data-type", "data-checked"],
};

const NOTAS_OPTIONS = {
  allowedTags: NOTAS_ALLOWED_TAGS,
  allowedAttributes: NOTAS_ALLOWED_ATTRIBUTES,
  allowedSchemes: ["http", "https", "mailto", "tel", "data"], // data: para imagens base64
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

/**
 * Sanitizador permissivo para o conteúdo das Notas Pessoais.
 * Permite todas as tags geradas pelo editor TipTap das Notas,
 * incluindo nós customizados (callout, chart, tabela, task list, imagens).
 *
 * Diferença em relação a `sanitizeRichHtml`: esta versão é adequada apenas
 * para conteúdo privado (1 usuário → 1 nota). Para conteúdo compartilhado
 * entre usuários (ex: Mural), use `sanitizeRichHtml` que é mais restritivo.
 *
 * @param {string|null|undefined} html
 * @returns {string|null}
 */
function sanitizeNotasHtml(html) {
  if (html === null || html === undefined) return html ?? null;
  if (typeof html !== "string") return null;
  if (html.trim() === "") return "";
  return sanitizeHtml(html, NOTAS_OPTIONS);
}

module.exports = { sanitizeRichHtml, sanitizeNotasHtml, OPTIONS, NOTAS_OPTIONS };
