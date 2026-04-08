require("dotenv").config();
const sequelize = require("../src/config/db");

async function run() {
  await sequelize.query(
    'UPDATE "users" SET "aprovado" = true, "aprovado_em" = COALESCE("aprovado_em", NOW()) WHERE "aprovado" = false;'
  );
  console.log("USERS_APPROVED_BACKFILL_OK");
  process.exit(0);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
