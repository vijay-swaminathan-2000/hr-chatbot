# HR Chatbot

AI-powered HR chatbot with Microsoft Teams integration, JumpCloud SSO, and SharePoint policy management.

## Features

- **Policy Q&A**: Natural language queries about company policies
- **Smart Escalation**: Automatically routes complex queries to HR
- **Teams Integration**: Native Microsoft Teams bot experience
- **Admin Dashboard**: Analytics, reports, and policy management
- **SSO Authentication**: JumpCloud single sign-on integration
- **SharePoint Sync**: Automatic policy document synchronization

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- JumpCloud SSO setup
- SharePoint site with policy documents
- OpenAI API key

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up database:
```bash
# Create PostgreSQL database
createdb hr_chatbot

# Run migrations
npm run migrate
```

4. Start development server:
```bash
npm run dev
```

### Environment Configuration

Required environment variables:

- **Database**: `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **JumpCloud SSO**: `JUMPCLOUD_CLIENT_ID`, `JUMPCLOUD_CLIENT_SECRET`, `JUMPCLOUD_TENANT_ID`
- **SharePoint**: `SHAREPOINT_TENANT_ID`, `SHAREPOINT_CLIENT_ID`, `SHAREPOINT_CLIENT_SECRET`, `SHAREPOINT_SITE_URL`
- **OpenAI**: `OPENAI_API_KEY`
- **Teams Bot**: `MICROSOFT_APP_ID`, `MICROSOFT_APP_PASSWORD`

## API Endpoints

### Authentication
- `GET /api/auth/login` - Initiate SSO login
- `POST /api/auth/callback` - Handle SSO callback
- `GET /api/auth/profile` - Get user profile

### Chat
- `POST /api/chat` - Send message to chatbot
- `POST /api/chat/feedback` - Submit feedback
- `GET /api/chat/history` - Get chat history

### Policies
- `GET /api/policies` - List all policies
- `GET /api/policies/:id` - Get specific policy
- `POST /api/policies/sync` - Sync from SharePoint (admin)

### Admin
- `GET /api/admin/analytics` - Dashboard analytics
- `GET /api/admin/reports/*` - Various reports
- `GET /api/admin/suggestions` - Policy gap suggestions

## Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Database migration
npm run migrate
```

## Deployment

1. Set production environment variables
2. Run database migrations
3. Build and deploy to your preferred platform
4. Configure Teams bot endpoint

## Architecture

- **Backend**: Express.js API server
- **Database**: PostgreSQL with analytics tables
- **AI**: OpenAI GPT-4 for conversational responses
- **Authentication**: JumpCloud SSO via MSAL
- **Document Processing**: SharePoint Graph API integration
- **Logging**: Winston with structured logging
