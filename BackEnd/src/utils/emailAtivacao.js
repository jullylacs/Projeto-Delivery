const nodemailer = require("nodemailer");

let cachedTransporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  return cachedTransporter;
}

// Envia a Carta de Ativação por e-mail ao cliente. Se SMTP não estiver configurado
// (ambiente de dev sem credenciais), apenas loga um aviso e não lança erro —
// a aprovação não deve falhar por falta de SMTP.
async function enviarCartaPorEmail(ativacao, pdfBuffer) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      `[emailAtivacao] SMTP_HOST não configurado — pulando envio da carta da ativação #${ativacao.id} para ${ativacao.email_cliente}`
    );
    return { sent: false };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: ativacao.email_cliente,
      subject: `Carta de Ativação — ${ativacao.cliente} (${ativacao.circuito})`,
      text: `Olá,\n\nSegue em anexo a Carta de Ativação referente ao circuito ${ativacao.circuito}.\n\nAtenciosamente,\nNVX Networks`,
      attachments: [
        {
          filename: `carta-ativacao-${ativacao.id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
    return { sent: true };
  } catch (err) {
    // Falha de SMTP (credenciais inválidas, host inacessível, etc.) não deve
    // derrubar a aprovação — a carta já foi gerada e fica salva no histórico.
    console.error(`[emailAtivacao] Falha ao enviar carta da ativação #${ativacao.id}:`, err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { enviarCartaPorEmail };
