const { Op } = require("sequelize");
const { AgendaEvento, User } = require("../models");
const { sanitizeRichHtml } = require("../utils/sanitizeHtml");

// Perfis com permissão para criar/visualizar eventos de escopo "geral".
// Mantemos duas listas (read pode ser mais ampla que write) para refletir
// a regra: gestor/admin/delivery enxergam o quadro coletivo, mas só
// admin/gestor_delivery podem escrever nele.
const PERFIS_GERAL_READ = new Set([
  "delivery",
  "gestor_delivery",
  "admin",
  "gestor",
]);
const PERFIS_GERAL_WRITE = new Set(["gestor_delivery", "admin"]);

// Atributos retornados quando incluímos o autor do evento.
const USUARIO_ATTRIBUTES = ["id", "nome", "email", "perfil"];

const TIPOS_VALIDOS = new Set(["tarefa", "aviso", "programacao"]);
const ESCOPOS_VALIDOS = new Set(["individual", "geral"]);

function parseDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Revalida o perfil no banco — não confia no payload do token (mesmo padrão
// dos middlewares requireAdmin / requireManagerOrAdmin).
async function fetchPerfil(req) {
  if (!req.userId) return null;
  const user = await User.findByPk(req.userId, {
    attributes: ["id", "perfil", "aprovado"],
  });
  return user;
}

// 🔹 Cria um novo evento na agenda.
exports.create = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    const {
      titulo,
      descricao_html,
      inicio,
      fim,
      all_day,
      escopo,
      tipo,
      cor,
    } = req.body || {};

    // Validação de obrigatórios
    if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
      return res.status(400).json({ message: "Campo 'titulo' é obrigatório." });
    }
    if (!inicio) {
      return res.status(400).json({ message: "Campo 'inicio' é obrigatório." });
    }
    if (!escopo) {
      return res.status(400).json({ message: "Campo 'escopo' é obrigatório." });
    }
    if (!ESCOPOS_VALIDOS.has(escopo)) {
      return res
        .status(400)
        .json({ message: "Escopo inválido. Use 'individual' ou 'geral'." });
    }

    const inicioDate = parseDate(inicio);
    if (inicioDate === undefined) {
      return res.status(400).json({ message: "Campo 'inicio' inválido." });
    }

    const fimDate = parseDate(fim);
    if (fimDate === undefined) {
      return res.status(400).json({ message: "Campo 'fim' inválido." });
    }

    if (tipo && !TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({
        message: "Tipo inválido. Use 'tarefa', 'aviso' ou 'programacao'.",
      });
    }

    // Permissão para escopo "geral": somente admin / gestor_delivery.
    if (escopo === "geral" && !PERFIS_GERAL_WRITE.has(user.perfil)) {
      return res
        .status(403)
        .json({ message: "Apenas Gestor de Delivery ou Admin podem criar eventos gerais." });
    }

    const evento = await AgendaEvento.create({
      usuario_id: req.userId,
      titulo: titulo.trim(),
      descricao_html: sanitizeRichHtml(descricao_html ?? null),
      inicio: inicioDate,
      fim: fimDate ?? null,
      all_day: Boolean(all_day),
      escopo,
      tipo: tipo || "tarefa",
      cor: typeof cor === "string" && cor.trim() ? cor.trim() : null,
    });

    // Retorna já com o relacionamento populado para o front.
    const created = await AgendaEvento.findByPk(evento.id, {
      include: [{ model: User, as: "usuario", attributes: USUARIO_ATTRIBUTES }],
    });

    return res.status(201).json(created);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Erro ao criar evento", error: err.message });
  }
};

// 🔹 Lista eventos da agenda conforme escopo e janela temporal.
exports.list = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    const { escopo, inicio, fim } = req.query;
    const escopoFiltrado = escopo || "individual";

    if (!ESCOPOS_VALIDOS.has(escopoFiltrado)) {
      return res
        .status(400)
        .json({ message: "Escopo inválido. Use 'individual' ou 'geral'." });
    }

    const where = { escopo: escopoFiltrado };

    if (escopoFiltrado === "individual") {
      // Admin pode visualizar de outro usuário via ?usuario_id=X.
      const usuarioParam = req.query.usuario_id
        ? Number(req.query.usuario_id)
        : null;

      if (
        usuarioParam &&
        usuarioParam !== req.userId &&
        user.perfil !== "admin"
      ) {
        return res
          .status(403)
          .json({ message: "Apenas admin pode listar eventos de outro usuário." });
      }

      where.usuario_id = usuarioParam || req.userId;
    } else {
      // escopo === "geral"
      if (!PERFIS_GERAL_READ.has(user.perfil)) {
        return res
          .status(403)
          .json({ message: "Sem permissão para visualizar agenda geral." });
      }
    }

    // Filtro por janela: pega eventos cujo `inicio` cai em [inicio, fim] OU
    // cujo `fim` se sobrepõe ao intervalo (eventos longos).
    const inicioJanela = parseDate(inicio);
    const fimJanela = parseDate(fim);

    if (inicioJanela === undefined || fimJanela === undefined) {
      return res.status(400).json({ message: "Parâmetros de janela inválidos." });
    }

    if (inicioJanela && fimJanela) {
      where[Op.and] = [
        {
          [Op.or]: [
            // O evento começa dentro da janela.
            { inicio: { [Op.between]: [inicioJanela, fimJanela] } },
            // Ou o evento abre antes e termina dentro/depois da janela.
            {
              [Op.and]: [
                { inicio: { [Op.lte]: fimJanela } },
                { fim: { [Op.gte]: inicioJanela } },
              ],
            },
          ],
        },
      ];
    } else if (inicioJanela) {
      where.inicio = { [Op.gte]: inicioJanela };
    } else if (fimJanela) {
      where.inicio = { [Op.lte]: fimJanela };
    }

    const eventos = await AgendaEvento.findAll({
      where,
      include: [{ model: User, as: "usuario", attributes: USUARIO_ATTRIBUTES }],
      order: [["inicio", "ASC"]],
    });

    return res.json(eventos);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Erro ao listar eventos", error: err.message });
  }
};

// Determina se o usuário pode editar/remover um evento, conforme regras.
function podeEditar(user, evento) {
  if (!user || !evento) return false;
  if (evento.usuario_id === user.id) return true;
  if (evento.escopo === "geral" && PERFIS_GERAL_WRITE.has(user.perfil)) {
    return true;
  }
  return false;
}

// 🔹 Atualiza um evento existente.
exports.update = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    const evento = await AgendaEvento.findByPk(req.params.id);
    if (!evento) {
      return res.status(404).json({ message: "Evento não encontrado" });
    }

    if (!podeEditar(user, evento)) {
      return res.status(403).json({ message: "Sem permissão para editar este evento." });
    }

    const {
      titulo,
      descricao_html,
      inicio,
      fim,
      all_day,
      escopo,
      tipo,
      cor,
    } = req.body || {};

    const patch = {};

    if (titulo !== undefined) {
      if (typeof titulo !== "string" || !titulo.trim()) {
        return res.status(400).json({ message: "Campo 'titulo' inválido." });
      }
      patch.titulo = titulo.trim();
    }

    if (descricao_html !== undefined) {
      patch.descricao_html = sanitizeRichHtml(descricao_html);
    }

    if (inicio !== undefined) {
      const inicioDate = parseDate(inicio);
      if (inicioDate === undefined) {
        return res.status(400).json({ message: "Campo 'inicio' inválido." });
      }
      patch.inicio = inicioDate;
    }

    if (fim !== undefined) {
      const fimDate = parseDate(fim);
      if (fimDate === undefined) {
        return res.status(400).json({ message: "Campo 'fim' inválido." });
      }
      patch.fim = fimDate;
    }

    if (all_day !== undefined) patch.all_day = Boolean(all_day);

    if (escopo !== undefined) {
      if (!ESCOPOS_VALIDOS.has(escopo)) {
        return res.status(400).json({ message: "Escopo inválido." });
      }
      // Promover para "geral" exige permissão de escrita global.
      if (escopo === "geral" && !PERFIS_GERAL_WRITE.has(user.perfil)) {
        return res
          .status(403)
          .json({ message: "Sem permissão para definir escopo geral." });
      }
      patch.escopo = escopo;
    }

    if (tipo !== undefined) {
      if (!TIPOS_VALIDOS.has(tipo)) {
        return res.status(400).json({ message: "Tipo inválido." });
      }
      patch.tipo = tipo;
    }

    if (cor !== undefined) {
      patch.cor =
        typeof cor === "string" && cor.trim() ? cor.trim() : null;
    }

    await evento.update(patch);

    const atualizado = await AgendaEvento.findByPk(evento.id, {
      include: [{ model: User, as: "usuario", attributes: USUARIO_ATTRIBUTES }],
    });

    return res.json(atualizado);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Erro ao atualizar evento", error: err.message });
  }
};

// 🔹 Remove um evento existente.
exports.remove = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    const evento = await AgendaEvento.findByPk(req.params.id);
    if (!evento) {
      return res.status(404).json({ message: "Evento não encontrado" });
    }

    if (!podeEditar(user, evento)) {
      return res.status(403).json({ message: "Sem permissão para remover este evento." });
    }

    await evento.destroy();
    return res.json({ message: "Evento removido" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Erro ao remover evento", error: err.message });
  }
};
