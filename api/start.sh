#!/bin/sh

# Script de inicialização da API
echo "Starting API initialization..."

# Aguarda o banco estar disponível
echo "Waiting for database to be ready..."
until npm run db:migrate; do
  echo "Database not ready, retrying in 5 seconds..."
  sleep 5
done

echo "Database migrations completed successfully!"

# Inicia a aplicação
echo "Starting API server..."
exec node dist/server.js
