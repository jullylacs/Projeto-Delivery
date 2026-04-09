#!/bin/sh
set -e

echo "🔄 Rodando migrations..."
npx sequelize db:migrate

echo "🚀 Iniciando servidor..."
exec npm start