"use strict";

module.exports = {
	async up(queryInterface, Sequelize) {
		const table = await queryInterface.describeTable("users");

		if (!table.aprovado) {
			await queryInterface.addColumn("users", "aprovado", {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			});
		}

		if (!table.aprovado_por) {
			await queryInterface.addColumn("users", "aprovado_por", {
				type: Sequelize.INTEGER,
				allowNull: true,
			});
		}

		if (!table.aprovado_em) {
			await queryInterface.addColumn("users", "aprovado_em", {
				type: Sequelize.DATE,
				allowNull: true,
			});
		}

		// Usuários existentes são considerados aprovados para evitar bloqueio após o deploy.
		await queryInterface.sequelize.query(`
			UPDATE "users"
			SET "aprovado" = true
			WHERE "aprovado" IS NULL;
		`);

		await queryInterface.changeColumn("users", "aprovado", {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		});

		// Garante que o enum de perfil aceite o novo papel "convidado".
		await queryInterface.sequelize.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1
					FROM pg_enum e
					JOIN pg_type t ON e.enumtypid = t.oid
					WHERE t.typname = 'enum_users_perfil'
						AND e.enumlabel = 'convidado'
				) THEN
					ALTER TYPE "enum_users_perfil" ADD VALUE 'convidado';
				END IF;
			END $$;
		`);

		await queryInterface.changeColumn("users", "perfil", {
			type: Sequelize.ENUM("convidado", "comercial", "operacional", "tecnico", "gestor", "admin"),
			allowNull: false,
			defaultValue: "convidado",
		});
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.changeColumn("users", "perfil", {
			type: Sequelize.ENUM("convidado", "comercial", "operacional", "tecnico", "gestor", "admin"),
			allowNull: false,
			defaultValue: "comercial",
		});

		const table = await queryInterface.describeTable("users");

		if (table.aprovado_em) {
			await queryInterface.removeColumn("users", "aprovado_em");
		}

		if (table.aprovado_por) {
			await queryInterface.removeColumn("users", "aprovado_por");
		}

		if (table.aprovado) {
			await queryInterface.removeColumn("users", "aprovado");
		}
	},
};
