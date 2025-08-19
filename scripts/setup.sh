#!/bin/bash

echo "🚀 Setting up HR Chatbot..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration values"
fi

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Set up PostgreSQL database: createdb hr_chatbot"
echo "3. Run migrations: npm run migrate"
echo "4. Start development server: npm run dev"
