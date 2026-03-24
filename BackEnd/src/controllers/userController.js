const User = require("../models/User"); // Importa o model de usuário
const jwt = require("jsonwebtoken"); // Biblioteca para geração de token JWT

// 🔹 Registro de novo usuário
exports.register = async (req, res) => {
  try {
    // Cria um novo usuário com os dados enviados no body
    const user = await User.create(req.body);

    // Retorna o usuário criado
    res.json(user);
  } catch (err) {
    // Em caso de erro (ex: falha no banco)
    res.status(500).json(err);
  }
};

// 🔹 Login do usuário
exports.login = async (req, res) => {
  // Busca um usuário pelo email informado
  const user = await User.findOne({ email: req.body.email });

  // Verifica se o usuário existe e se a senha está correta
  if (!user || user.senha !== req.body.senha) {
    return res.status(401).json({ message: "Credenciais inválidas" });
  }

  // Gera um token JWT com o ID do usuário
  const token = jwt.sign({ id: user._id }, "segredo");

  // Define o perfil:
  // - Usa o perfil enviado no login (se existir)
  // - Senão usa o perfil salvo no usuário
  // - Senão define como "comercial"
  const perfil = req.body.perfil || user.perfil || "comercial";
  
  // Converte o objeto do Mongoose para objeto JS comum
  // e sobrescreve/define o perfil
  const userResponse = {
    ...user.toObject(),
    perfil: perfil
  };

  // Retorna usuário + token
  res.json({ user: userResponse, token });
};

// 🔹 Buscar perfil de um usuário
exports.getUserProfile = async (req, res) => {
  try {
    // Pega o ID da URL (req.params.id)
    // ou do usuário autenticado (req.user?.id)
    const userId = req.params.id || req.user?.id;

    // Busca o usuário pelo ID e remove o campo senha da resposta
    const user = await User.findById(userId).select("-senha");
    
    // Se não encontrar usuário, retorna 404
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    
    // Retorna os dados do usuário
    res.json(user);
  } catch (err) {
    // Em caso de erro
    res.status(500).json({ message: "Erro ao buscar perfil", error: err });
  }
};

// 🔹 Atualizar perfil do usuário
exports.updateUserProfile = async (req, res) => {
  try {
    // Extrai os campos permitidos do body
    const { nome, email, perfil, telefone, departamento, avatar } = req.body;

    // ID do usuário vindo da URL
    const userId = req.params.id;
    
    // Monta objeto de atualização
    const updateData = {
      nome,
      email,
      perfil,
      telefone,
      departamento
    };
    
    // Se houver avatar, adiciona ao update
    if (avatar) {
      updateData.avatar = avatar;
    }
    
    // Atualiza o usuário no banco e retorna o atualizado
    // remove o campo senha da resposta
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-senha");
    
    // Se não encontrar usuário
    if (!updatedUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    
    // Retorna usuário atualizado
    res.json(updatedUser);
  } catch (err) {
    // Em caso de erro
    res.status(500).json({ message: "Erro ao atualizar perfil", error: err });
  }
};

// 🔹 Listar todos os usuários
exports.getAll = async (req, res) => {
  try {
    // Busca todos os usuários e remove o campo senha
    const users = await User.find().select("-senha");

    // Retorna a lista de usuários
    res.json(users);
  } catch (err) {
    // Em caso de erro
    res.status(500).json(err);
  }
};