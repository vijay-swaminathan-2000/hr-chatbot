const express = require('express');
const TeamsBot = require('../services/teams');
const { logger } = require('../utils/logger');

const router = express.Router();
const teamsBot = new TeamsBot();

// Teams bot endpoint
router.post('/messages', async (req, res) => {
  try {
    await teamsBot.processActivity(req, res);
  } catch (error) {
    logger.error('Teams bot message processing failed:', error);
    res.status(500).json({ error: 'Bot processing failed' });
  }
});

// Bot health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    botId: process.env.MICROSOFT_APP_ID,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
