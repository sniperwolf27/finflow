#!/usr/bin/env bash
# FinFlow — One-command local setup
set -e

echo "🚀 Setting up FinFlow..."

# 1. Copy env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
  echo "⚠️  Edit .env and fill in your API keys before continuing!"
  echo ""
  echo "   Required:"
  echo "   - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (console.cloud.google.com)"
  echo "   - ANTHROPIC_API_KEY (console.anthropic.com)"
  echo "   - SESSION_SECRET (run: openssl rand -hex 32)"
  echo "   - TOKEN_ENCRYPTION_KEY (run: openssl rand -hex 32)"
  echo ""
  exit 0
fi

# 2. Install backend deps
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# 3. Install frontend deps
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# 4. Run DB migrations
echo "🗄️  Running database migrations..."
cd backend
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start development servers:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Or use Docker:"
echo "  docker compose up --build"
