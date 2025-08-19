const jwt = require('jsonwebtoken');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const DatabaseService = require('../config/database');
const { logger } = require('../utils/logger');

// JumpCloud SSO configuration
const msalConfig = {
  auth: {
    clientId: process.env.JUMPCLOUD_CLIENT_ID,
    clientSecret: process.env.JUMPCLOUD_CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${process.env.JUMPCLOUD_TENANT_ID}`
  }
};

const cca = new ConfidentialClientApplication(msalConfig);

// JWT token verification middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await DatabaseService.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Admin role verification middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// JumpCloud SSO authentication
const authenticateWithJumpCloud = async (authCode) => {
  try {
    const clientCredentialRequest = {
      scopes: ['https://graph.microsoft.com/.default'],
      skipCache: false
    };

    const response = await cca.acquireTokenByCode({
      code: authCode,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: process.env.JUMPCLOUD_REDIRECT_URI
    });

    return response;
  } catch (error) {
    logger.error('JumpCloud authentication failed:', error);
    throw new Error('Authentication failed');
  }
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  authenticateWithJumpCloud,
  generateToken
};
