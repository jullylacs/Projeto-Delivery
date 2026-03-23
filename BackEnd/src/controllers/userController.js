const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user || user.senha !== req.body.senha) {
    return res.status(401).json({ message: "Credenciais inválidas" });
  }

  const token = jwt.sign({ id: user._id }, "segredo");

  // Se foi enviado um perfil específico, usa aquele. Senão, usa o perfil do usuário
  const perfil = req.body.perfil || user.perfil || "comercial";
  
  const userResponse = {
    ...user.toObject(),
    perfil: perfil
  };

  res.json({ user: userResponse, token });
};

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.user?.id;
    const user = await User.findById(userId).select("-senha");
    
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar perfil", error: err });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { nome, email, perfil, telefone, departamento, avatar } = req.body;
    const userId = req.params.id;
    
    const updateData = {
      nome,
      email,
      perfil,
      telefone,
      departamento
    };
    
    if (avatar) {
      updateData.avatar = avatar;
    }
    
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-senha");
    
    if (!updatedUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar perfil", error: err });
  }
};

exports.getAll = async (req, res) => {
  try {
    const users = await User.find().select("-senha");
    res.json(users);
  } catch (err) {
    res.status(500).json(err);
  }
};