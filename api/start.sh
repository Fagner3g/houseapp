#!/bin/sh

# API startup script
echo "Starting API initialization..."

# Wait for database to be ready
echo "Waiting for database to be ready..."
until npm run db:migrate; do
  echo "Database not ready, retrying in 5 seconds..."
  sleep 5
done

echo "Database migrations completed successfully!"

# Start the application
echo "Starting API server..."
exec node dist/server.js
