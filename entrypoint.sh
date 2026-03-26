#!/bin/sh
echo "Running Prisma migrations..."
npx prisma migrate deploy
echo "Running seed..."
node prisma/seed.js
echo "Starting payment service..."
exec node src/app.js
