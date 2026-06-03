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

module.exports = { sanitizeRichHtml, OPTIONS };
