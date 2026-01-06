#!/bin/sh
set -e

# Run database push (creates tables if they don't exist)
echo "Running database migrations..."
npx drizzle-kit push

# Run seed
echo "Running seed..."
npx tsx lib/db/seed.ts

# Start the application
echo "Starting application..."
exec npm run start
