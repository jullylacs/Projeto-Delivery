const { Nota } = require("../models");

/*
 * Usa sanitizeNotasHtml (permissivo) em vez de sanitizeRichHtml (restritivo).
 * As Notas são conteúdo privado — cada usuário vê apenas as próprias notas —
 * portanto não há risco de XSS inter-usuário. O sanitizador permissivo
 * preserva todas as tags que o editor TipTap gera: <div data-chart>,
 * <div data-custom-table>, <div data-callout>, <hr>, <img>, <mark>, <s>,
 * <ul data-type="taskList">, etc. O restritivo (usado no Mural) removeria
 * tudo isso silenciosamente, fazendo os blocos desaparecerem ao recarregar.
 */
const { sanitizeNotasHtml } = require("../utils/sanitizeHtml");

async function list(req, res) {
  try {
    const notas = await Nota.findAll({
      where: { usuario_id: req.user.id },
      order: [["favorita", "DESC"], ["updated_at", "DESC"]],
    });
    res.json(notas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function get(req, res) {
  try {
    const nota = await Nota.findOne({ where: { id: req.params.id, usuario_id: req.user.id } });
    if (!nota) return res.status(404).json({ error: "Nota não encontrada" });
    res.json(nota);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const { titulo, conteudo, cor, favorita } = req.body;
    const nota = await Nota.create({
      usuario_id: req.user.id,
      titulo:   (titulo   ?? "").slice(0, 500),
      conteudo: sanitizeNotasHtml(conteudo ?? ""),
      cor:      cor      ?? "default",
      favorita: favorita ?? false,
    });
    res.status(201).json(nota);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const nota = await Nota.findOne({ where: { id: req.params.id, usuario_id: req.user.id } });
    if (!nota) return res.status(404).json({ error: "Nota não encontrada" });

    const { titulo, conteudo, cor, favorita } = req.body;
    if (titulo   !== undefined) nota.titulo   = String(titulo).slice(0, 500);
    if (conteudo !== undefined) nota.conteudo = sanitizeNotasHtml(conteudo);
    if (cor      !== undefined) nota.cor      = cor;
    if (favorita !== undefined) nota.favorita = Boolean(favorita);

    await nota.save();
    res.json(nota);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const nota = await Nota.findOne({ where: { id: req.params.id, usuario_id: req.user.id } });
    if (!nota) return res.status(404).json({ error: "Nota não encontrada" });
    await nota.destroy();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, get, create, update, remove };
