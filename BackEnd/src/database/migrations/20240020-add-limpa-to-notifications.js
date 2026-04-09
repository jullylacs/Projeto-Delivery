"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("notifications").catch(() => null);
    if (!tableDescription) return;

    if (!tableDescription.limpa) {
      await queryInterface.addColumn("notifications", "limpa", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    if (!tableDescription.limpaEm) {
      await queryInterface.addColumn("notifications", "limpaEm", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable("notifications").catch(() => null);
    if (!tableDescription) return;

    if (tableDescription.limpaEm) {
      await queryInterface.removeColumn("notifications", "limpaEm");
    }
    if (tableDescription.limpa) {
      await queryInterface.removeColumn("notifications", "limpa");
    }
  },
};
