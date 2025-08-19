# HR Chatbot Setup Instructions

## ✅ Completed Steps
- PostgreSQL installed and running
- Database `hr_chatbot` created
- Database schema migrated successfully
- Sample policy data inserted (5 policies, 2 users)

## 🔧 Next Steps to Complete Setup

### 1. Configure API Keys in .env file

Edit the `.env` file and add your actual API keys:

```bash
# Required for OpenAI integration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Required for JumpCloud SSO (get from JumpCloud admin console)
JUMPCLOUD_CLIENT_ID=your_jumpcloud_client_id
JUMPCLOUD_CLIENT_SECRET=your_jumpcloud_client_secret
JUMPCLOUD_TENANT_ID=your_jumpcloud_tenant_id

# Required for SharePoint integration (get from Azure app registration)
SHAREPOINT_TENANT_ID=your_sharepoint_tenant_id
SHAREPOINT_CLIENT_ID=your_sharepoint_client_id
SHAREPOINT_CLIENT_SECRET=your_sharepoint_client_secret
SHAREPOINT_SITE_URL=https://yourcompany.sharepoint.com/sites/hr-policies

# Required for Teams bot (get from Azure Bot Service)
MICROSOFT_APP_ID=your_teams_bot_app_id
MICROSOFT_APP_PASSWORD=your_teams_bot_password

# Generate a secure JWT secret
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlZpamF5IFN3YW1pbmF0aGFuIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.RPSFQXLHUmK-_qHDLgmUsDOi4-3OvYTzpt-XRka02K4

# Your company HR email
HR_EMAIL=vijayswaminathan.0@gmail.com
```

### 2. Test the System

**Start the server:**
```bash
npm run dev
```

**Test API endpoints:**
```bash
# Health check
curl http://localhost:3000/health

# Get policies (will need authentication in production)
curl http://localhost:3000/api/policies

# Admin dashboard
open http://localhost:3000/admin
```

### 3. Teams Bot Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Create new "Azure Bot" resource
3. Set messaging endpoint: `https://yourdomain.com/api/teams/messages`
4. Get App ID and Password from the bot configuration
5. Add to Teams app manifest

### 4. JumpCloud SSO Setup

1. Login to JumpCloud admin console
2. Create new SAML/OIDC application
3. Set redirect URI: `http://localhost:3000/auth/callback`
4. Get client credentials and tenant ID

### 5. SharePoint Setup

1. Register app in Azure AD
2. Grant SharePoint permissions
3. Create HR policies folder in SharePoint
4. Upload policy documents

## 🧪 Testing the Chatbot

**Sample queries to test:**
- "What's the travel policy for India?"
- "How many leave days can I take?"
- "Can I work from home?"
- "What are the health benefits?"
- "Tell me about the code of conduct"

## 📊 Admin Features

Access admin dashboard at `http://localhost:3000/admin` to:
- View usage analytics
- See top answered/unanswered questions
- Manage policies and users
- Monitor system health

## 🚀 Production Deployment

When ready for production:
1. Deploy to cloud platform (Azure/AWS/GCP)
2. Set up SSL certificates
3. Configure production environment variables
4. Set up monitoring and alerting
5. Register Teams bot with production endpoint
