const MuralPost = require("../models/MuralPost");
const { sanitizeRichHtml } = require("../utils/sanitizeHtml");

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
    const { autor, midias } = req.body;

    /*
     * O conteúdo vem do editor TipTap (rich text), que gera HTML completo com
     * tags como <p>, <strong>, <ul>, etc. A sanitização remove tags perigosas
     * (scripts, event handlers) preservando apenas as tags inofensivas definidas
     * em sanitizeHtml.js. Sem essa etapa, um admin mal-intencionado poderia
     * injetar XSS que afetaria todos os usuários que visualizassem o mural.
     *
     * O resultado pode ser string vazia ("") quando o editor estava vazio —
     * isso é intencional para permitir posts que contenham apenas mídia.
     */
    const conteudo = sanitizeRichHtml(req.body.conteudo) || "";

    /*
     * `temMidia` sinaliza se o post carrega pelo menos uma imagem ou vídeo.
     * A validação aceita post com conteúdo vazio desde que haja mídia, pois
     * posts só-imagem são um caso de uso legítimo no mural.
     */
    const temMidia = Array.isArray(midias) && midias.length > 0;
    if (!autor || (!conteudo && !temMidia)) {
      return res.status(400).json({ error: "Informe conteúdo ou pelo menos uma mídia" });
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
    const { midias } = req.body;

    /*
     * Mesma sanitização da criação: o frontend envia o HTML gerado pelo TipTap
     * e precisamos garantir que edições também passem pelo filtro de XSS.
     * Usa `?? ""` (nullish coalescing) em vez de `|| ""` para preservar
     * string vazia legítima quando `sanitizeRichHtml` retorna "".
     */
    const conteudo = sanitizeRichHtml(req.body.conteudo) ?? "";
    const post = await MuralPost.findByPk(id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });
    post.conteudo = conteudo;
    // `midias` pode ser omitido na requisição (editar só o texto), por isso
    // só sobrescreve o campo se ele vier explicitamente no body.
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
