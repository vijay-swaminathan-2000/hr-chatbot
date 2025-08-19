const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const policyRoutes = require('./routes/policies');
const teamsRoutes = require('./routes/teams');
const testAuthRoutes = require('./routes/test-auth');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourcompany.sharepoint.com', 'https://teams.microsoft.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/test-auth', testAuthRoutes);

// Redirect /admin to login page if not authenticated
app.get('/admin', (req, res) => {
  res.redirect('/admin/login.html');
});

// Serve static files for admin dashboard and test interface
app.use('/admin', express.static('public/admin'));
app.use(express.static('public'));

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'HR Chatbot API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      chat: '/api/chat',
      admin: '/api/admin',
      policies: '/api/policies',
      testAuth: '/api/test-auth'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`HR Chatbot server running on port ${PORT}`);
  console.log(`Server running at http://localhost:${PORT}`);
});
