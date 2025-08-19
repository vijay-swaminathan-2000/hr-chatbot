const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const DatabaseService = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get dashboard analytics
router.get('/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get overall analytics
    let analyticsQuery = 'SELECT * FROM analytics';
    const params = [];
    
    if (startDate && endDate) {
      analyticsQuery += ' WHERE date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }
    
    analyticsQuery += ' ORDER BY date DESC LIMIT 30';
    
    const analyticsResult = await DatabaseService.query(analyticsQuery, params);
    
    // Get total counts
    const totalQueriesResult = await DatabaseService.query(
      'SELECT COUNT(*) as total FROM user_queries'
    );
    
    const totalUsersResult = await DatabaseService.query(
      'SELECT COUNT(*) as total FROM users'
    );
    
    const totalPoliciesResult = await DatabaseService.query(
      'SELECT COUNT(*) as total FROM policies WHERE is_active = true'
    );

    res.json({
      analytics: analyticsResult.rows,
      totals: {
        queries: parseInt(totalQueriesResult.rows[0].total),
        users: parseInt(totalUsersResult.rows[0].total),
        policies: parseInt(totalPoliciesResult.rows[0].total)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

// Get top answered queries report
router.get('/reports/top-answered', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topAnswered = await DatabaseService.getTopAnsweredQueries(parseInt(limit));
    
    res.json({
      title: 'Top Answered Questions',
      data: topAnswered
    });
  } catch (error) {
    logger.error('Failed to fetch top answered queries:', error);
    res.status(500).json({ error: 'Failed to retrieve report' });
  }
});

// Get top unanswered queries report
router.get('/reports/top-unanswered', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topUnanswered = await DatabaseService.getTopUnansweredQueries(parseInt(limit));
    
    res.json({
      title: 'Top Unanswered Questions',
      data: topUnanswered
    });
  } catch (error) {
    logger.error('Failed to fetch top unanswered queries:', error);
    res.status(500).json({ error: 'Failed to retrieve report' });
  }
});

// Get top rated queries report
router.get('/reports/top-rated', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topRated = await DatabaseService.getTopRatedQueries(parseInt(limit));
    
    res.json({
      title: 'Top Rated Responses',
      data: topRated
    });
  } catch (error) {
    logger.error('Failed to fetch top rated queries:', error);
    res.status(500).json({ error: 'Failed to retrieve report' });
  }
});

// Get low rated queries report
router.get('/reports/low-rated', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const lowRated = await DatabaseService.getLowRatedQueries(parseInt(limit));
    
    res.json({
      title: 'Low Rated Responses',
      data: lowRated
    });
  } catch (error) {
    logger.error('Failed to fetch low rated queries:', error);
    res.status(500).json({ error: 'Failed to retrieve report' });
  }
});

// Get policy gap suggestions
router.get('/suggestions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT ps.*, u.name as suggested_by_name
      FROM policy_suggestions ps
      LEFT JOIN users u ON ps.suggested_by = u.id
      ORDER BY ps.frequency DESC, ps.created_at DESC
    `;
    
    const result = await DatabaseService.query(query);
    
    res.json({
      suggestions: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch policy suggestions:', error);
    res.status(500).json({ error: 'Failed to retrieve suggestions' });
  }
});

// Update policy suggestion status
router.patch('/suggestions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const query = `
      UPDATE policy_suggestions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await DatabaseService.query(query, [status, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    logger.info('Policy suggestion updated', { 
      suggestionId: id, 
      status, 
      userId: req.user.id 
    });

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update suggestion:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT u.*, 
             COUNT(uq.id) as total_queries,
             AVG(f.rating) as avg_rating
      FROM users u
      LEFT JOIN user_queries uq ON u.id = uq.user_id
      LEFT JOIN feedback f ON uq.id = f.query_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    
    const result = await DatabaseService.query(query);
    
    res.json({
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        totalQueries: parseInt(user.total_queries) || 0,
        avgRating: user.avg_rating ? parseFloat(user.avg_rating) : null,
        createdAt: user.created_at
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Update user role
router.patch('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin', 'hr'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const query = 'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const result = await DatabaseService.query(query, [role, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('User role updated', { 
      targetUserId: id, 
      newRole: role, 
      adminUserId: req.user.id 
    });

    res.json({
      message: 'User role updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get error logs
router.get('/errors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT el.*, u.email as user_email, u.name as user_name
      FROM error_logs el
      LEFT JOIN users u ON el.user_id = u.id
      ORDER BY el.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await DatabaseService.query(query, [limit, offset]);
    
    res.json({
      errors: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch error logs:', error);
    res.status(500).json({ error: 'Failed to retrieve error logs' });
  }
});

module.exports = router;
