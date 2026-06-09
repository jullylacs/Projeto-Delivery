const MuralPost = require("../models/MuralPost");

// Lista todos os posts do mural (mais recentes primeiro)
exports.getPosts = async (req, res) => {
  try {
    const posts = await MuralPost.findAll({ order: [["createdAt", "DESC"]] });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Erro ao buscar posts do mural" });
  }
};

// Cria um novo post no mural
exports.createPost = async (req, res) => {
  try {
    const { autor, conteudo, midias } = req.body;
    if (!autor || !conteudo) {
      return res.status(400).json({ error: "Autor e conteúdo são obrigatórios" });
    }
    const data = new Date().toISOString().slice(0, 10);
    const post = await MuralPost.create({ autor, conteudo, data, midias: midias || [] });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Erro ao criar post" });
  }
};

// Edita um post existente
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { conteudo, midias } = req.body;
    const post = await MuralPost.findByPk(id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });
    post.conteudo = conteudo;
    if (midias !== undefined) post.midias = midias;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Erro ao editar post" });
  }
};

// Remove um post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await MuralPost.findByPk(id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });
    await post.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Erro ao remover post" });
  }
};
