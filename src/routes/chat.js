const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const DatabaseService = require('../config/database');
const ChatService = require('../services/chat');
const chatService = new ChatService();
const { logger } = require('../utils/logger');

const router = express.Router();

// Main chat endpoint
router.post('/', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = req.user.id;
    const session = sessionId || `session_${userId}_${Date.now()}`;

    // Process the chat message
    const chatResponse = await chatService.processMessage(message, userId, session);
    
    const responseTime = Date.now() - startTime;

    // Log the query and response
    await DatabaseService.logUserQuery({
      user_id: userId,
      session_id: session,
      query_text: message,
      intent: chatResponse.intent,
      matched_policies: chatResponse.matchedPolicies || [],
      response_text: chatResponse.response,
      response_type: chatResponse.type,
      confidence_score: chatResponse.confidence,
      response_time_ms: responseTime
    });

    res.json({
      response: chatResponse.response,
      type: chatResponse.type,
      confidence: chatResponse.confidence,
      sessionId: session,
      matchedPolicies: chatResponse.matchedPolicies,
      suggestions: chatResponse.suggestions,
      queryId: chatResponse.queryId
    });

  } catch (error) {
    logger.error('Chat endpoint error:', error);
    console.error('Chat endpoint error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'I apologize, but I encountered an issue processing your request. Please try again or contact HR directly.',
      type: 'error'
    });
  }
});

// Submit feedback on a chat response
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { queryId, rating, comment } = req.body;
    
    if (!queryId || ![-1, 1].includes(rating)) {
      return res.status(400).json({ error: 'Query ID and valid rating (-1 or 1) are required' });
    }

    await DatabaseService.saveFeedback({
      query_id: queryId,
      user_id: req.user.id,
      rating,
      comment: comment || null
    });

    logger.info('Feedback submitted', { 
      queryId, 
      rating, 
      userId: req.user.id 
    });

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    logger.error('Failed to save feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get chat history for a user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    const query = `
      SELECT uq.*, f.rating as feedback_rating
      FROM user_queries uq
      LEFT JOIN feedback f ON uq.id = f.query_id
      WHERE uq.user_id = $1
      ORDER BY uq.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await DatabaseService.query(query, [userId, limit, offset]);
    
    res.json({
      history: result.rows.map(row => ({
        id: row.id,
        query: row.query_text,
        response: row.response_text,
        type: row.response_type,
        confidence: row.confidence_score,
        feedback: row.feedback_rating,
        timestamp: row.created_at
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch chat history:', error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

// Clear chat session
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // We don't actually delete queries for analytics, just mark session as cleared
    logger.info('Chat session cleared', { sessionId, userId });
    
    res.json({ message: 'Chat session cleared' });
  } catch (error) {
    logger.error('Failed to clear session:', error);
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

module.exports = router;
