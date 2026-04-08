const { Op } = require("sequelize");
const { Card, Column, Notification, Schedule, Technician, User } = require("../models");

let cachedNotificationTypes = null;

const loadAllowedNotificationTypes = async () => {
  if (Array.isArray(cachedNotificationTypes) && cachedNotificationTypes.length > 0) {
    return cachedNotificationTypes;
  }

  try {
    const [rows] = await Notification.sequelize.query(
      "SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'enum_notifications_tipo' ORDER BY e.enumsortorder"
    );
    const values = Array.isArray(rows)
      ? rows.map((row) => String(row.enumlabel || "").trim()).filter(Boolean)
      : [];
    cachedNotificationTypes = values;
    return values;
  } catch {
    return [];
  }
};

const resolveSafeTipo = (requestedKind, allowedTypes) => {
  const normalized = String(requestedKind || "").trim().toLowerCase();
  if (allowedTypes.includes(normalized)) return normalized;
  if (allowedTypes.includes("info")) return "info";
  if (allowedTypes.length > 0) return allowedTypes[0];
  return "info";
};

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const commentMentionsUser = (commentText, userName) => {
  const safeText = normalizeName(commentText);
  const safeUser = normalizeName(userName);
  if (!safeText || !safeUser) return false;
  return safeText.includes(`@${safeUser}`);
};

const toIdentityKey = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("@")) {
    const localPart = raw.split("@")[0]?.trim();
    return localPart || "";
  }
  return raw.replace(/\s+/g, " ");
};

const buildCommentInteractionNotifications = (cards, currentUser) => {
  const meNameKey = toIdentityKey(currentUser?.nome);
  const meEmailKey = toIdentityKey(currentUser?.email);
  const myKeys = new Set([meNameKey, meEmailKey].filter(Boolean));
  if (myKeys.size === 0) return [];

  return cards.flatMap((card) => {
    const cardId = getCardKey(card);
    if (!cardId) return [];

    const title = resolveCardTitle(card);
    const comments = Array.isArray(card?.comments) ? card.comments : [];
    const events = [];

    comments.forEach((comment, commentIndex) => {
      const commentId = comment?.id || commentIndex;
      const commentAuthorKey = toIdentityKey(comment?.author);
      const commentBelongsToMe = commentAuthorKey && myKeys.has(commentAuthorKey);

      if (commentBelongsToMe) {
        const reactions = comment?.reactions && typeof comment.reactions === "object" ? comment.reactions : {};
        Object.entries(reactions).forEach(([emoji, users]) => {
          const reactorList = Array.isArray(users) ? users : [];
          reactorList.forEach((reactorRaw, reactorIndex) => {
            const reactorKey = toIdentityKey(reactorRaw);
            if (!reactorKey || myKeys.has(reactorKey)) return;

            const reactorName = String(reactorRaw || "Alguém").trim() || "Alguém";
            events.push({
              kind: "reaction",
              source_key: `reaction-${cardId}-${commentId}-${emoji}-${reactorKey}-${reactorIndex}`,
              card_id: cardId,
              title,
              message: `${reactorName} reagiu ${emoji} no seu comentário.`,
              when_at: new Date(),
              priority: "medium",
              metadata: {
                type: "comment-reaction",
                commentId,
                emoji,
                reactor: reactorName,
              },
            });
          });
        });

        const replies = Array.isArray(comment?.replies) ? comment.replies : [];
        replies.forEach((reply, replyIndex) => {
          const replierKey = toIdentityKey(reply?.author);
          if (!replierKey || myKeys.has(replierKey)) return;

          const replyId = reply?.id || `${commentId}-${replyIndex}`;
          const when = reply?.createdAt ? new Date(reply.createdAt) : new Date();
          const safeWhen = Number.isNaN(when.getTime()) ? new Date() : when;
          const author = String(reply?.author || "Alguém").trim() || "Alguém";
          const snippet = String(reply?.text || "").replace(/\s+/g, " ").trim().slice(0, 140);

          events.push({
            kind: "reply",
            source_key: `reply-${cardId}-${commentId}-${replyId}`,
            card_id: cardId,
            title,
            message: `${author} respondeu seu comentário${snippet ? `: ${snippet}` : "."}`,
            when_at: safeWhen,
            priority: "high",
            metadata: {
              type: "comment-reply",
              commentId,
              replyId,
              author,
            },
          });
        });
      }
    });

    return events;
  });
};

const resolveCardTitle = (card) =>
  String(card?.titulo || card?.cliente || card?.nome || card?.empresa || card?.title || "").trim() ||
  `Card #${card?.id ?? "?"}`;

const getCardKey = (card) => card?.id;

const buildSlaNotifications = (cards) => {
  const now = new Date();

  return cards
    .filter((card) => {
      if (!card?.prazo) return false;
      const status = String(card?.column?.nome || "").toLowerCase();
      return status !== "concluído" && status !== "concluido" && status !== "inativo";
    })
    .map((card) => {
      const deadline = new Date(card.prazo);
      if (Number.isNaN(deadline.getTime())) return null;

      const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      const cardId = getCardKey(card);
      if (!cardId) return null;

      if (deadline < now) {
        return {
          kind: "sla",
          source_key: `sla-late-${cardId}-${deadline.toISOString()}`,
          card_id: cardId,
          title: resolveCardTitle(card),
          message: "Prazo vencido. Requer atenção imediata.",
          when_at: deadline,
          priority: "high",
          metadata: { status: "late" },
        };
      }

      if (diffDays >= 0 && diffDays <= 3) {
        return {
          kind: "sla",
          source_key: `sla-due-${cardId}-${deadline.toISOString()}`,
          card_id: cardId,
          title: resolveCardTitle(card),
          message: `Prazo vence em ${diffDays} dia(s).`,
          when_at: deadline,
          priority: "medium",
          metadata: { status: "due", diffDays },
        };
      }

      return null;
    })
    .filter(Boolean);
};

const buildMentionNotifications = (cards, currentUserName) => {
  if (!currentUserName) return [];

  return cards.flatMap((card) => {
    const cardId = getCardKey(card);
    if (!cardId) return [];

    const title = resolveCardTitle(card);
    const comments = Array.isArray(card?.comments) ? card.comments : [];

    return comments
      .filter((comment) => {
        if (!comment?.text) return false;
        const author = normalizeName(comment.author);
        const me = normalizeName(currentUserName);
        if (author && me && author === me) return false;
        return commentMentionsUser(comment.text, currentUserName);
      })
      .map((comment, index) => {
        const when = comment?.createdAt ? new Date(comment.createdAt) : new Date();
        const safeWhen = Number.isNaN(when.getTime()) ? new Date() : when;
        const commentId = comment?.id || `${safeWhen.toISOString()}-${index}`;
        const snippet = String(comment.text || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 160);

        return {
          kind: "mention",
          source_key: `mention-${cardId}-${commentId}`,
          card_id: cardId,
          title,
          message: `${comment.author || "Alguém"} mencionou você${snippet ? `: ${snippet}` : "."}`,
          when_at: safeWhen,
          priority: "high",
          metadata: { author: comment.author || null },
        };
      });
  });
};

const getLocalDateKey = (date) => {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mapScheduleStatusLabel = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "pendente") return "Pendente";
  if (normalized === "confirmado") return "Confirmado";
  if (normalized === "reagendado") return "Reagendado";
  if (normalized === "em_execucao") return "Em execução";
  if (normalized === "finalizado") return "Finalizado";
  return "Pendente";
};

const buildTodayScheduleNotifications = (schedules) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = 8 * 60 + 10; // 08:10
  if (currentMinutes < startMinutes) return [];

  const todayKey = getLocalDateKey(new Date());
  if (!todayKey) return [];

  return schedules
    .filter((schedule) => getLocalDateKey(schedule?.data) === todayKey)
    .map((schedule) => {
      const scheduleDate = new Date(schedule.data);
      const safeWhen = Number.isNaN(scheduleDate.getTime()) ? new Date() : scheduleDate;
      const scheduleId = Number(schedule?.id);
      const cardId = Number(schedule?.card_id);

      if (!Number.isFinite(scheduleId)) return null;

      const title = String(schedule?.titulo || schedule?.card?.titulo || schedule?.card?.cliente || "Tarefa agendada").trim() || "Tarefa agendada";
      const timeLabel = String(schedule?.horario || "").trim();
      const technicianName = String(schedule?.tecnico?.nome || "").trim();
      const statusLabel = mapScheduleStatusLabel(schedule?.status);
      const parts = [];

      if (timeLabel) parts.push(`Horário: ${timeLabel}`);
      if (technicianName) parts.push(`Técnico: ${technicianName}`);
      parts.push(`Status: ${statusLabel}`);

      return {
        kind: "agenda",
        source_key: `agenda-today-${todayKey}-${scheduleId}`,
        card_id: Number.isFinite(cardId) ? cardId : null,
        title,
        message: `Você tem um agendamento para hoje. ${parts.join(" | ")}`,
        when_at: safeWhen,
        priority: "medium",
        metadata: {
          type: "today-schedule",
          scheduleId,
          scheduleDate: todayKey,
          status: String(schedule?.status || "pendente"),
        },
      };
    })
    .filter(Boolean);
};

const toResponse = (notification) => ({
  id: notification.id,
  kind: notification.tipo,
  cardId: notification.card_id,
  title: notification.titulo,
  message: notification.mensagem,
  priority: notification.metadata?.priority || "medium",
  when: notification.metadata?.when || notification.createdAt,
  readAt: notification.lida ? (notification.lidaEm || notification.updatedAt) : null,
  metadata: notification.metadata || {},
});

exports.syncMine = async (req, res) => {
  try {
    const userId = Number(req.userId);
    const user = await User.findByPk(userId, { attributes: ["id", "nome", "email"] });
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    const cards = await Card.findAll({
      attributes: ["id", "titulo", "cliente", "prazo", "comments"],
      include: [{ model: Column, as: "column", attributes: ["id", "nome"] }],
    });

    const schedules = await Schedule.findAll({
      attributes: ["id", "titulo", "data", "horario", "status", "card_id", "tecnico_id"],
      include: [
        { model: Card, as: "card", attributes: ["id", "titulo", "cliente"] },
        { model: Technician, as: "tecnico", attributes: ["id", "nome"] },
      ],
      order: [["data", "ASC"], ["id", "ASC"]],
      limit: 500,
    });

    const generated = [
      ...buildMentionNotifications(cards, user.nome || user.email),
      ...buildCommentInteractionNotifications(cards, user),
      ...buildSlaNotifications(cards),
      ...buildTodayScheduleNotifications(schedules),
    ];

    const allowedTypes = await loadAllowedNotificationTypes();

    const existingRows = await Notification.findAll({
      where: { usuario_id: userId },
      attributes: ["id", "metadata"],
      order: [["id", "DESC"]],
      limit: 500,
    });

    const existingBySourceKey = new Map();
    for (const row of existingRows) {
      const sourceKey = row?.metadata?.sourceKey;
      if (sourceKey && !existingBySourceKey.has(sourceKey)) {
        existingBySourceKey.set(sourceKey, row.id);
      }
    }

    for (const item of generated) {
      const existingId = existingBySourceKey.get(item.source_key);
      const existing = existingId
        ? await Notification.findOne({ where: { id: existingId, usuario_id: userId } })
        : null;

      if (existing) {
        const safeTipo = resolveSafeTipo(item.kind, allowedTypes);
        await existing.update({
          card_id: item.card_id,
          tipo: safeTipo,
          titulo: item.title,
          mensagem: item.message,
          metadata: {
            ...item.metadata,
            sourceKey: item.source_key,
            priority: item.priority,
            when: item.when_at,
            originalKind: item.kind,
          },
        });
      } else {
        const safeTipo = resolveSafeTipo(item.kind, allowedTypes);
        await Notification.create({
          usuario_id: userId,
          card_id: item.card_id,
          tipo: safeTipo,
          titulo: item.title,
          mensagem: item.message,
          lida: false,
          metadata: {
            ...item.metadata,
            sourceKey: item.source_key,
            priority: item.priority,
            when: item.when_at,
            originalKind: item.kind,
          },
        });
      }
    }

    return res.json({ synced: generated.length });
  } catch (err) {
    console.error("Erro ao sincronizar notificações:", err);
    return res.status(500).json({ message: "Erro ao sincronizar notificações" });
  }
};

exports.listMine = async (req, res) => {
  try {
    const userId = Number(req.userId);
    const limitRaw = Number.parseInt(req.query.limit || "80", 10);
    const limit = Number.isNaN(limitRaw) ? 80 : Math.min(Math.max(limitRaw, 1), 200);

    const rows = await Notification.findAll({
      where: { usuario_id: userId },
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit,
    });

    return res.json(rows.map(toResponse));
  } catch (err) {
    console.error("Erro ao listar notificações:", err);
    return res.status(500).json({ message: "Erro ao listar notificações" });
  }
};

exports.markOneAsRead = async (req, res) => {
  try {
    const userId = Number(req.userId);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });

    const row = await Notification.findOne({ where: { id, usuario_id: userId } });
    if (!row) return res.status(404).json({ message: "Notificação não encontrada" });

    if (!row.lida) {
      await row.update({ lida: true, lidaEm: new Date() });
    }

    return res.json(toResponse(row));
  } catch (err) {
    console.error("Erro ao marcar notificação como lida:", err);
    return res.status(500).json({ message: "Erro ao atualizar notificação" });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = Number(req.userId);
    const now = new Date();

    const [updatedCount] = await Notification.update(
      { lida: true, lidaEm: now },
      { where: { usuario_id: userId, lida: false } }
    );

    return res.json({ updated: updatedCount });
  } catch (err) {
    console.error("Erro ao marcar todas como lidas:", err);
    return res.status(500).json({ message: "Erro ao atualizar notificações" });
  }
};

exports.clearRead = async (req, res) => {
  try {
    const userId = Number(req.userId);
    const deleted = await Notification.destroy({
      where: { usuario_id: userId, lida: true },
    });

    return res.json({ deleted });
  } catch (err) {
    console.error("Erro ao limpar notificações lidas:", err);
    return res.status(500).json({ message: "Erro ao limpar notificações" });
  }
};
