const { sequelize } = require("../models");
const { QueryTypes } = require("sequelize");

const VALID_BOARDS = ["delivery", "comercial", "bko"];
const resolveBoard = (raw) => {
  const value = String(raw || "").trim().toLowerCase();
  return VALID_BOARDS.includes(value) ? value : null;
};

// 🔹 GET /dashboard/summary[?board=delivery|comercial]
//
// Substitui as 3 chamadas pesadas que o Dashboard fazia (/cards + /columns +
// /users/admin) — antes trazia TODOS os cards e usuários para o cliente computar
// estatísticas. Agora o backend executa 3 queries agregadas e devolve só os
// números, em alguns KB em vez de MB.
exports.getDashboardSummary = async (req, res) => {
  try {
    const board = resolveBoard(req.query?.board); // opcional
    const boardFilter = board ? `AND col.board = :board` : "";
    const repl = board ? { board } : {};

    // 1) Totais gerais (1 query, FILTER WHERE para múltiplas contagens condicionais).
    const [totalsRow] = await sequelize.query(
      `SELECT
         COUNT(c.id)::int AS total,
         COUNT(c.id) FILTER (WHERE col.nome = 'Concluído')::int AS concluido,
         COUNT(c.id) FILTER (
           WHERE c.prazo IS NOT NULL
             AND c.prazo < NOW()
             AND col.nome NOT IN ('Concluído', 'Inativo')
         )::int AS sla_violations,
         COUNT(c.id) FILTER (
           WHERE c.prazo IS NOT NULL
             AND c.prazo >= NOW()
             AND c.prazo <= NOW() + INTERVAL '3 days'
             AND col.nome NOT IN ('Concluído', 'Inativo')
         )::int AS sla_warnings
       FROM cards c
       LEFT JOIN columns col ON col.id = c.coluna_id
       WHERE 1=1 ${boardFilter}`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const total = Number(totalsRow?.total) || 0;
    const concluido = Number(totalsRow?.concluido) || 0;
    const restante = Math.max(0, total - concluido);
    const ratio = total > 0 ? (concluido / total) * 100 : 0;

    // 2) Distribuição por coluna (já ordenada).
    const breakdownRows = await sequelize.query(
      `SELECT col.id, col.nome, col.ordem, COUNT(c.id)::int AS count
         FROM columns col
         LEFT JOIN cards c ON c.coluna_id = col.id
         WHERE 1=1 ${board ? "AND col.board = :board" : ""}
         GROUP BY col.id, col.nome, col.ordem
         ORDER BY col.ordem ASC, col.id ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const columnBreakdown = breakdownRows.map((row) => ({
      id: Number(row.id),
      nome: String(row.nome),
      ordem: Number(row.ordem) || 0,
      count: Number(row.count) || 0,
    }));

    // 3) Performance por usuário/cargo — agrupa por perfil no JS depois.
    const userRows = await sequelize.query(
      `SELECT
         u.perfil,
         u.id AS user_id,
         u.nome AS user_nome,
         COUNT(c.id)::int AS total,
         COUNT(c.id) FILTER (WHERE col.nome = 'Concluído')::int AS completed
       FROM users u
       LEFT JOIN cards c ON c.vendedor_id = u.id
       LEFT JOIN columns col ON col.id = c.coluna_id
       WHERE u.aprovado = TRUE
         ${board ? "AND (col.board = :board OR col.board IS NULL)" : ""}
       GROUP BY u.perfil, u.id, u.nome
       ORDER BY u.perfil ASC, u.nome ASC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const roleMap = new Map();
    for (const row of userRows) {
      const role = row.perfil?.trim() || "Sem cargo";
      if (!roleMap.has(role)) {
        roleMap.set(role, { role, users: [], totalCards: 0, totalCompleted: 0 });
      }
      const bucket = roleMap.get(role);
      const userTotal = Number(row.total) || 0;
      const userCompleted = Number(row.completed) || 0;
      bucket.users.push({
        id: Number(row.user_id),
        nome: String(row.user_nome || `Usuário ${row.user_id}`),
        total: userTotal,
        completed: userCompleted,
        ratio: userTotal > 0 ? (userCompleted / userTotal) * 100 : 0,
      });
      bucket.totalCards += userTotal;
      bucket.totalCompleted += userCompleted;
    }

    const roleStats = Array.from(roleMap.values()).map((r) => ({
      ...r,
      ratio: r.totalCards > 0 ? (r.totalCompleted / r.totalCards) * 100 : 0,
    }));

    return res.json({
      total,
      concluido,
      restante,
      ratio,
      columnBreakdown,
      slaViolations: Number(totalsRow?.sla_violations) || 0,
      slaWarnings: Number(totalsRow?.sla_warnings) || 0,
      roleStats,
    });
  } catch (err) {
    console.error("[getDashboardSummary] Erro:", err);
    return res.status(500).json({ error: err?.message || "Erro ao gerar resumo" });
  }
};
