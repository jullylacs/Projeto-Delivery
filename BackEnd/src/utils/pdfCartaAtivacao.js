const PDFDocument = require("pdfkit");
const path = require("path");

// Assinatura da Gabriele Mometti (Head of Service Delivery), aplicada em toda
// Carta de Ativação — arquivo estático versionado junto do backend.
const ASSINATURA_PATH = path.join(__dirname, "..", "assets", "assinatura-gabriele.jpg");

// Paleta reaproveitada do design system do frontend (frontend/src/index.css)
const PURPLE_900 = "#2c0b52";
const PURPLE_700 = "#4c1d95";
const PURPLE_500 = "#6f3dde";
const PURPLE_100 = "#efe8ff";
const TEXT_DARK = "#1f2b46";
const TEXT_MUTED = "#6b7280";
const BORDER_GRAY = "#b9b2c9";
const RED_DATA = "#c0392b";

const PAGE_MARGIN = 50;

const EVIDENCIA_LABELS = {
  caixa_atendimento: "Caixa de Atendimento",
  equipamento: "Equipamento Instalado",
  identificacao_circuito: "Identificação do Circuito",
  rack: "Rack",
  teste_conectividade: "Teste de Conectividade",
};

// Máscaras mais comuns -> prefixo CIDR, para marcar o checkbox de IP da carta
// (o técnico preenche a máscara em texto livre; aqui só traduzimos para exibição).
const CIDR_POR_MASCARA = {
  "255.255.255.255": 32,
  "255.255.255.254": 31,
  "255.255.255.252": 30,
  "255.255.255.248": 29,
  "255.255.255.240": 28,
};

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function contentWidth(doc) {
  return doc.page.width - PAGE_MARGIN * 2;
}

function textoCelula(label, value) {
  if (!label) return "";
  const v = value && String(value).trim() ? value : "-";
  return `${label}: ${v}`;
}

// Desenha uma "linha" de tabela com células lado a lado (bordas finas, estilo
// formulário). A altura da linha é medida a partir do texto real de cada
// célula, então valores longos quebram em vez de transbordar. Atualiza doc.y.
function desenharLinha(doc, celulas) {
  const width = contentWidth(doc);
  const x0 = PAGE_MARGIN;
  const y = doc.y;

  doc.font("Helvetica-Bold").fontSize(9);
  const larguras = celulas.map((c) => c.frac * width);
  const alturas = celulas.map((c, i) =>
    doc.heightOfString(textoCelula(c.label, c.value), { width: larguras[i] - 16 })
  );
  const altura = Math.max(...alturas) + 16;

  let cx = x0;
  celulas.forEach((c, i) => {
    const w = larguras[i];
    doc.lineWidth(0.75).strokeColor(BORDER_GRAY).rect(cx, y, w, altura).stroke();

    if (c.label) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT_DARK);
      doc.text(`${c.label}: `, cx + 8, y + 8, { continued: true, width: w - 16 });
      doc.font("Helvetica").fillColor(c.valueColor || TEXT_DARK);
      doc.text(c.value && String(c.value).trim() ? c.value : "-");
    }

    cx += w;
  });

  doc.y = y + altura;
}

function desenharTituloSecao(doc, titulo) {
  doc.moveDown(0.9);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(PURPLE_900);
  doc.text(titulo, PAGE_MARGIN, doc.y);
  doc.moveDown(0.35);
}

// Cabeçalho compacto (logo + tagline) repetido em todas as páginas.
// Placeholder textual — trocar por logo real (frontend/public ou similar) quando disponível.
function desenharCabecalho(doc) {
  doc.font("Helvetica-Bold").fontSize(22).fillColor(PURPLE_900);
  doc.text("NVX", PAGE_MARGIN, PAGE_MARGIN - 10, { continued: true });
  doc.font("Helvetica").fillColor(PURPLE_700).text(".");

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PURPLE_700);
  doc.text("NETWORKS", PAGE_MARGIN, PAGE_MARGIN + 14, { characterSpacing: 1.2 });

  doc.font("Helvetica-Oblique").fontSize(8).fillColor(TEXT_MUTED);
  doc.text("We simplify", PAGE_MARGIN + 90, PAGE_MARGIN - 10);
  doc.text("connect", PAGE_MARGIN + 90, PAGE_MARGIN + 1);
  doc.text("and scale", PAGE_MARGIN + 90, PAGE_MARGIN + 12);

  doc.y = PAGE_MARGIN + 34;
}

function desenharTituloPrincipal(doc) {
  doc.moveDown(1.4);
  doc.font("Helvetica-Bold").fontSize(18).fillColor(TEXT_DARK);
  doc.text("CARTA DE ATIVAÇÃO DE CIRCUITO", PAGE_MARGIN, doc.y, {
    width: contentWidth(doc),
    align: "center",
  });
  doc.moveDown(1);
}

function desenharResumo(doc, ativacao) {
  desenharLinha(doc, [
    { frac: 0.34, label: "ID DO CLIENTE", value: ativacao.id_cliente_nvx },
    { frac: 0.34, label: "ID DO CIRCUITO", value: ativacao.circuito },
    { frac: 0.32, label: "DATA DA ATIVAÇÃO", value: formatDate(ativacao.data_ativacao), valueColor: RED_DATA },
  ]);
  desenharLinha(doc, [
    { frac: 0.34, label: "NÚMERO DA OCORRÊNCIA", value: "-" },
    { frac: 0.34, label: "NÚMERO DO PEDIDO", value: "-" },
    { frac: 0.32, label: "", value: "" },
  ]);
  doc.moveDown(0.6);
}

function desenharDadosCliente(doc, ativacao) {
  desenharTituloSecao(doc, "DADOS DO CLIENTE:");
  desenharLinha(doc, [{ frac: 1, label: "RAZÃO SOCIAL", value: ativacao.cliente }]);
  desenharLinha(doc, [
    { frac: 0.5, label: "CNPJ", value: ativacao.cnpj },
    { frac: 0.5, label: "Insc. Est.", value: "Não se aplica" },
  ]);
  desenharLinha(doc, [
    { frac: 0.5, label: "CONTATO", value: ativacao.contato_cliente },
    { frac: 0.5, label: "GERENTE COMERCIAL DA CONTA", value: ativacao.gerente_conta },
  ]);
}

function desenharEnderecoInstalacao(doc, ativacao) {
  desenharTituloSecao(doc, "ENDEREÇO DA INSTALAÇÃO:");
  desenharLinha(doc, [{ frac: 1, label: "ENDEREÇO", value: ativacao.endereco }]);
  desenharLinha(doc, [
    { frac: 0.5, label: "CIDADE", value: ativacao.cidade },
    { frac: 0.5, label: "ESTADO", value: ativacao.estado },
  ]);
}

// Linha "ITEM / VELOCIDADE CONTRATADA / IP", com checkboxes marcados a
// partir dos dados reais (tipo_servico e máscara informados pelo técnico).
function desenharItemVelocidadeIp(doc, ativacao) {
  const width = contentWidth(doc);
  const larguras = [width * 0.28, width * 0.36, width * 0.36];
  const y = doc.y;

  const tipos = ["DIA", "SDIA", "BIA", "L2L"];
  const cidr = CIDR_POR_MASCARA[String(ativacao.mascara || "").trim()] || null;
  const opcoesIp = [
    { label: "NÃO", marcado: cidr === null },
    { label: "/29", marcado: cidr === 29 },
    { label: "/30", marcado: cidr === 30 },
    { label: "/32", marcado: cidr === 32 },
  ];
  const altura = Math.max(tipos.length, opcoesIp.length) * 13 + 26;

  let cx = PAGE_MARGIN;
  doc.lineWidth(0.75).strokeColor(BORDER_GRAY);

  doc.rect(cx, y, larguras[0], altura).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(TEXT_DARK).text("ITEM:", cx + 8, y + 8);
  tipos.forEach((t, i) => {
    doc.font("Helvetica").fontSize(9).fillColor(TEXT_DARK);
    doc.text(`(${t === ativacao.tipo_servico ? "X" : " "}) ${t}`, cx + 8, y + 22 + i * 13);
  });
  cx += larguras[0];

  doc.rect(cx, y, larguras[1], altura).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(TEXT_DARK);
  doc.text("VELOCIDADE CONTRATADA:", cx + 8, y + 8, { width: larguras[1] - 16 });
  doc.font("Helvetica-Bold").fontSize(12).fillColor(TEXT_DARK);
  doc.text(ativacao.velocidade_contratada || "-", cx, y + altura / 2 + 2, {
    width: larguras[1],
    align: "center",
  });
  cx += larguras[1];

  doc.rect(cx, y, larguras[2], altura).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(TEXT_DARK).text("IP:", cx + 8, y + 8);
  opcoesIp.forEach((op, i) => {
    doc.font("Helvetica").fontSize(9).fillColor(TEXT_DARK);
    doc.text(`(${op.marcado ? "X" : " "}) ${op.label}`, cx + 8, y + 22 + i * 13);
  });

  doc.y = y + altura;
}

function desenharInfoTecnica(doc, ativacao) {
  const width = contentWidth(doc);
  const y = doc.y;

  doc.rect(PAGE_MARGIN, y, width, 20).fillAndStroke(PURPLE_100, BORDER_GRAY);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(PURPLE_900);
  doc.text("INFORMAÇÕES TÉCNICAS DO CLIENTE", PAGE_MARGIN, y + 6, { width, align: "center" });
  doc.y = y + 20;

  const enderecoCompleto = [
    ativacao.endereco,
    ativacao.cidade && ativacao.estado ? `${ativacao.cidade}/${ativacao.estado}` : ativacao.cidade,
  ]
    .filter(Boolean)
    .join(" - ");

  desenharLinha(doc, [
    { frac: 0.24, label: "ID CLIENTE NVX", value: ativacao.id_cliente_nvx },
    { frac: 0.2, label: "CIRCUITO", value: ativacao.circuito },
    { frac: 0.16, label: "VELOCIDADE", value: ativacao.velocidade_contratada },
    { frac: 0.4, label: "ENDEREÇO", value: enderecoCompleto },
  ]);
}

function desenharDadosInstalacaoEntregue(doc, ativacao) {
  desenharTituloSecao(doc, "DADOS DA INSTALAÇÃO ENTREGUE:");
  desenharItemVelocidadeIp(doc, ativacao);
  desenharInfoTecnica(doc, ativacao);
}

function desenharAssinatura(doc) {
  doc.moveDown(1.2);
  const width = contentWidth(doc);
  const centerX = PAGE_MARGIN + width / 2;
  const y = doc.y;

  // Imagem da assinatura, centralizada, logo acima da linha.
  const imgW = 120;
  const imgH = 90;
  try {
    doc.image(ASSINATURA_PATH, centerX - imgW / 2, y, { fit: [imgW, imgH], align: "center", valign: "bottom" });
  } catch {
    // Sem a imagem, a carta ainda sai válida — só com a linha e o nome abaixo.
  }

  const lineY = y + imgH + 6;
  doc.moveTo(centerX - 110, lineY).lineTo(centerX + 110, lineY).lineWidth(0.8).strokeColor(TEXT_DARK).stroke();

  doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT_DARK);
  doc.text("GABRIELE MOMETTI", PAGE_MARGIN, lineY + 6, { width, align: "center" });
  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(TEXT_MUTED);
  doc.text("Head of Service Delivery", PAGE_MARGIN, lineY + 21, { width, align: "center" });

  doc.y = lineY + 40;
}

function desenharRodape(doc) {
  const y = doc.page.height - 70;

  // O texto do rodapé fica muito perto do limite inferior da página — sem isso,
  // o PDFKit interpreta a escrita como um estouro de margem e insere páginas
  // extras em branco antes de desenhar.
  const bottomOriginal = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  doc.moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).lineWidth(0.75).strokeColor(BORDER_GRAY).stroke();

  doc.font("Helvetica-Oblique").fontSize(8).fillColor(TEXT_MUTED);
  doc.text("www.nvxnetworks.com", PAGE_MARGIN, y + 10);
  doc.text("contato@br.nvxnetworks.com", PAGE_MARGIN, y + 22);

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(TEXT_DARK);
  doc.text("Contato", PAGE_MARGIN, y + 10, { width: contentWidth(doc), align: "right" });
  doc.font("Helvetica-Oblique").fontSize(8).fillColor(TEXT_MUTED);
  doc.text("(19) 3513-1718", PAGE_MARGIN, y + 22, { width: contentWidth(doc), align: "right" });

  doc.page.margins.bottom = bottomOriginal;
}

// Uma página por evidência: título + foto (já com overlay de logo/GPS/timestamp
// aplicado no momento da captura) emoldurada, redimensionada preservando proporção.
// `contador` numera a página quando há mais de uma evidência do mesmo tipo (ex: "(2/3)").
function desenharPaginaEvidencia(doc, evidencia, contador) {
  const width = contentWidth(doc);
  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(PURPLE_900);
  const titulo = EVIDENCIA_LABELS[evidencia.tipo] || evidencia.tipo;
  doc.text(contador && contador.total > 1 ? `${titulo} (${contador.indice}/${contador.total})` : titulo, PAGE_MARGIN, doc.y, {
    width,
    align: "center",
  });
  doc.moveDown(1);

  if (!evidencia.dataUrl) return;

  try {
    const img = doc.openImage(evidencia.dataUrl);
    const maxH = doc.page.height - doc.y - 90;
    const scale = Math.min(width / img.width, maxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = PAGE_MARGIN + (width - w) / 2;
    const y = doc.y;

    doc.image(img, x, y, { width: w, height: h });
    doc.lineWidth(1.5).strokeColor(PURPLE_500).rect(x, y, w, h).stroke();
    doc.y = y + h;
  } catch {
    doc.font("Helvetica").fontSize(9).fillColor(TEXT_MUTED);
    doc.text("Não foi possível carregar a imagem.", PAGE_MARGIN, doc.y, { width, align: "center" });
  }
}

// Lista de escalonamento fixa (política interna de suporte) — apêndice
// padrão em toda Carta de Ativação, não depende dos dados da ativação.
const ESCALONAMENTO = [
  {
    nivel: "1º Atendimento Direto – Suporte Técnico Avançado - N1",
    nome: "Cláudio",
    contato: "+55 19 3513-1718 | claudio.dona@br.nvxnetworks.com",
    condicao: "Contatar apenas quando não houver respostas no grupo VIP.",
  },
  {
    nivel: "2.º Atendimento Direto – Suporte Técnico Avançado – N2",
    nome: "Bruno",
    contato: "+55 19 92001-6039 | bruno@br.nvxnetworks.com",
    condicao: "Contatar apenas quando não houver respostas no grupo VIP.",
  },
  {
    nivel: "3º Gestor de Operações Service Delivery e NOC",
    nome: "Gabriele",
    contato: "+55 19 92006-3635 | gabriele@br.nvxnetworks.com",
    condicao:
      "Contatar apenas quando não houver respostas no grupo VIP por parte do N1 e N2 nas instalações, entregas e dificuldades com suporte técnico.",
  },
  {
    nivel: "4º Gestor Comercial",
    nome: "André",
    contato: "+55 19 99317-3838 | andre@br.nvxnetworks.com",
    condicao: "Contatar apenas quando não houver respostas nos contatos anteriores.",
  },
];

function desenharListaEscalonamento(doc) {
  const width = contentWidth(doc);
  doc.moveDown(1);

  const bandY = doc.y;
  doc.rect(PAGE_MARGIN, bandY, width, 34).fillAndStroke(PURPLE_100, BORDER_GRAY);
  doc.font("Helvetica-BoldOblique").fontSize(12).fillColor(PURPLE_900);
  doc.text("LISTA DE ESCALONAMENTO", PAGE_MARGIN, bandY + 6, { width, align: "center" });
  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(PURPLE_700);
  doc.text("Escalation List", PAGE_MARGIN, bandY + 20, { width, align: "center" });
  doc.y = bandY + 34;
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(10).fillColor(TEXT_DARK);
  doc.text("ATENDIMENTO INICIAL (SLA/MTTR 6 HORAS):", PAGE_MARGIN, doc.y, { width, align: "center" });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(9.5).fillColor(TEXT_DARK);
  doc.text(
    "O primeiro contato deve ser feito sempre pelo grupo VIP criado no WhatsApp com toda a equipe do NOC responsável pelo seu contrato.",
    PAGE_MARGIN,
    doc.y,
    { width, align: "center" }
  );
  doc.moveDown(1.2);

  const avisoY = doc.y;
  doc.font("Helvetica-Bold").fontSize(9);
  const avisoTexto = "APÓS CONTATO SEM SUCESSO NESTA ALTERNATIVA, PROSSEGUIR ABAIXO NA ORDEM APRESENTADA:";
  const avisoAltura = doc.heightOfString(avisoTexto, { width: width - 20 }) + 14;
  doc.rect(PAGE_MARGIN, avisoY, width, avisoAltura).fillAndStroke(PURPLE_100, BORDER_GRAY);
  doc.fillColor(TEXT_DARK).text(avisoTexto, PAGE_MARGIN + 10, avisoY + 7, { width: width - 20, align: "center" });
  doc.y = avisoY + avisoAltura;
  doc.moveDown(1.2);

  ESCALONAMENTO.forEach((nivel) => {
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(TEXT_DARK);
    doc.text(`${nivel.nivel.toUpperCase()}:`, PAGE_MARGIN, doc.y, { width, align: "center" });
    doc.moveDown(0.25);
    doc.font("Helvetica-Bold").fontSize(9.5);
    doc.text(`${nivel.nome}: ${nivel.contato}`, PAGE_MARGIN, doc.y, { width, align: "center" });
    doc.moveDown(0.25);
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(TEXT_MUTED);
    doc.text(nivel.condicao, PAGE_MARGIN, doc.y, { width, align: "center" });
    doc.moveDown(1);
  });
}

// Gera o PDF da Carta de Ativação a partir de uma instância de Ativacao (com
// tecnico e evidencias incluídos). Retorna um Buffer — sem headless browser.
// Layout inspirado no modelo real atual da NVX (formulário com tabelas
// bordadas), com páginas adicionais para as evidências fotográficas e a
// lista de escalonamento padrão.
function gerarCartaAtivacaoPdf(ativacao) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      desenharCabecalho(doc);
      desenharTituloPrincipal(doc);
      desenharResumo(doc, ativacao);
      desenharDadosCliente(doc, ativacao);
      desenharEnderecoInstalacao(doc, ativacao);
      desenharDadosInstalacaoEntregue(doc, ativacao);
      desenharAssinatura(doc);
      desenharRodape(doc);

      const evidencias = Array.isArray(ativacao.evidencias) ? ativacao.evidencias : [];
      const totalPorTipo = {};
      evidencias.forEach((e) => { totalPorTipo[e.tipo] = (totalPorTipo[e.tipo] || 0) + 1; });
      const indicePorTipo = {};
      evidencias.forEach((evidencia) => {
        indicePorTipo[evidencia.tipo] = (indicePorTipo[evidencia.tipo] || 0) + 1;
        doc.addPage();
        desenharCabecalho(doc);
        desenharPaginaEvidencia(doc, evidencia, { indice: indicePorTipo[evidencia.tipo], total: totalPorTipo[evidencia.tipo] });
        desenharRodape(doc);
      });

      doc.addPage();
      desenharCabecalho(doc);
      desenharListaEscalonamento(doc);
      desenharRodape(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { gerarCartaAtivacaoPdf };
