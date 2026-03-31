const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Model de agendamentos de instalações
const Schedule = sequelize.define("Schedule", {

  // Referência ao card (demanda) vinculada ao agendamento
  // Equivalente ao: card: { type: ObjectId, ref: "Card" } do Mongoose
  card_id: {
    type: DataTypes.INTEGER,
    references: { model: "cards", key: "id" },
    onDelete: "CASCADE",
    allowNull: false
  },

  // Referência ao técnico responsável pela execução
  // Equivalente ao: tecnico: { type: ObjectId, ref: "Technician" } do Mongoose
  tecnico_id: {
    type: DataTypes.INTEGER,
    references: { model: "technicians", key: "id" },
    onDelete: "SET NULL",
    allowNull: true
  },

  // Data da instalação
  data: DataTypes.DATE,

  // Horário específico (ex: "08:00")
  horario: DataTypes.STRING,

  // Janela de atendimento (ex: "08h–12h")
  janela: DataTypes.STRING,

  // Status do agendamento com valores controlados
  status: {
    type: DataTypes.ENUM("pendente", "confirmado", "reagendado", "em_execucao", "finalizado"),
    defaultValue: "pendente"
  },

  // Motivo do reagendamento (usado quando status = reagendado)
  motivoReagendamento: DataTypes.TEXT

}, {
  tableName: "schedules",
  timestamps: true // createdAt e updatedAt automáticos
});

module.exports = Schedule;