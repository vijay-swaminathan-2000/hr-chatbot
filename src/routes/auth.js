const express = require('express');
const { authenticateWithJumpCloud, generateToken } = require('../middleware/auth');
const DatabaseService = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Initiate JumpCloud SSO login
router.get('/login', (req, res) => {
  const authUrl = `https://login.microsoftonline.com/${process.env.JUMPCLOUD_TENANT_ID}/oauth2/v2.0/authorize?` +
    `client_id=${process.env.JUMPCLOUD_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(process.env.JUMPCLOUD_REDIRECT_URI)}&` +
    `scope=openid%20profile%20email&` +
    `response_mode=query`;

  res.json({ authUrl });
});

// Handle SSO callback
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Authenticate with JumpCloud
    const authResult = await authenticateWithJumpCloud(code);
    
    if (!authResult || !authResult.account) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const { account } = authResult;
    
    // Create or update user in database
    const userData = {
      jumpcloud_id: account.homeAccountId,
      email: account.username,
      name: account.name || account.username,
      role: 'user' // Default role, can be updated by admin
    };

    const user = await DatabaseService.createUser(userData);
    
    // Generate JWT token
    const token = generateToken(user);
    
    logger.info('User authenticated successfully', { userId: user.id, email: user.email });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    logger.error('Authentication callback failed:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await DatabaseService.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at
    });

  } catch (error) {
    logger.error('Profile fetch failed:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // We can log the logout event for analytics
  if (req.user) {
    logger.info('User logged out', { userId: req.user.id });
  }
  
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
