const { Nota } = require("../models");
const { sanitizeRichHtml } = require("../utils/sanitizeHtml");

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
      conteudo: sanitizeRichHtml(conteudo ?? ""),
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
    if (conteudo !== undefined) nota.conteudo = sanitizeRichHtml(conteudo);
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
