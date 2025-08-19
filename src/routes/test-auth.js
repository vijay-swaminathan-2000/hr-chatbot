const express = require('express');
const { generateToken } = require('../middleware/auth');
const DatabaseService = require('../config/database');

const router = express.Router();

// Test login endpoint - generates token for existing users
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find user by email
    const user = await DatabaseService.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate token
    const token = generateToken(user);
    
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
    console.error('Test login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get available test users
router.get('/users', async (req, res) => {
  try {
    const db = require('../database/connection');
    const result = await db.query('SELECT email, name, role FROM users ORDER BY role DESC');
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Failed to get users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router;
