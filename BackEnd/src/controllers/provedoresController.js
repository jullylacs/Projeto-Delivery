const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_INSTRUCTION = `Você é um assistente especializado em encontrar provedores de internet no Brasil com seus dados de contato completos.

PROCESSO OBRIGATÓRIO — siga todas as etapas:
1. Busque "provedores de internet [bairro ou cidade do endereço]" para encontrar os ISPs da região.
2. Para cada provedor encontrado, faça uma busca adicional e específica: "[nome do provedor] telefone contato [cidade]".
3. Se ainda não encontrar telefone, busque: "[nome do provedor] whatsapp atendimento" ou "[nome do provedor] site oficial".
4. Tente também: "provedor internet [cidade] telefone" ou "internet fibra [cidade] contato" para descobrir provedores menores regionais.

REGRAS OBRIGATÓRIAS:
- Só inclua um provedor na lista se tiver encontrado pelo menos TELEFONE ou SITE. Se não tiver nenhum dos dois, não liste.
- Nunca escreva "telefone não disponível" ou "site não encontrado" — se não achou, busque mais. Se mesmo assim não encontrar, omita o provedor.
- Prefira telefones de atendimento comercial, WhatsApp ou 0800.
- Liste no mínimo 3 provedores com contato confirmado, ou informe que a região tem poucos provedores cadastrados.

FORMATO DE RESPOSTA para cada provedor:
📡 **[Nome do Provedor]**
📞 [Telefone / WhatsApp]
🌐 [Site]
📍 [Área de atendimento]

Responda sempre em português do Brasil.`;

async function buscarProvedores(req, res) {
  const { mensagem, historico = [] } = req.body;

  if (!mensagem?.trim()) {
    return res.status(400).json({ message: "Mensagem é obrigatória." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      message: "Serviço de IA não configurado. Adicione GEMINI_API_KEY no arquivo .env do backend.",
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }],
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const geminiHistory = historico.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(mensagem.trim());
    const resposta = result.response.text();

    return res.json({
      resposta,
      historico: [
        ...historico,
        { role: "user", content: mensagem.trim() },
        { role: "assistant", content: resposta },
      ],
    });
  } catch (error) {
    console.error("Erro ao consultar Gemini:", error);

    if (error.status === 400) {
      return res.status(400).json({ message: "Requisição inválida. Verifique o endereço informado." });
    }
    if (error.status === 401 || error.status === 403) {
      return res.status(503).json({ message: "Chave de API inválida. Verifique GEMINI_API_KEY no .env." });
    }
    if (error.status === 429) {
      return res.status(429).json({ message: "Limite temporário atingido. Aguarde um momento e tente novamente." });
    }

    return res.status(500).json({ message: "Erro ao buscar provedores de internet. Tente novamente." });
  }
}

module.exports = { buscarProvedores };
