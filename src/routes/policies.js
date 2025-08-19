const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const DatabaseService = require('../config/database');
const SharePointService = require('../services/sharepoint');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get all policies (authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let policies;
    if (search) {
      policies = await DatabaseService.searchPolicies(search, category);
    } else {
      policies = await DatabaseService.getAllPolicies();
      if (category) {
        policies = policies.filter(p => p.category === category);
      }
    }

    res.json({
      policies: policies.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        tags: p.tags,
        last_updated: p.last_updated
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch policies:', error);
    res.status(500).json({ error: 'Failed to retrieve policies' });
  }
});

// Get specific policy content
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM policies WHERE id = $1 AND is_active = true';
    const result = await DatabaseService.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch policy:', error);
    res.status(500).json({ error: 'Failed to retrieve policy' });
  }
});

// Sync policies from SharePoint (admin only)
router.post('/sync', authenticateToken, requireAdmin, async (req, res) => {
  try {
    logger.info('Manual policy sync initiated', { userId: req.user.id });
    
    const syncedPolicies = await SharePointService.syncPolicies();
    
    res.json({
      message: 'Policy sync completed successfully',
      syncedCount: syncedPolicies.length,
      policies: syncedPolicies.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category
      }))
    });
  } catch (error) {
    logger.error('Policy sync failed:', error);
    res.status(500).json({ error: 'Policy sync failed' });
  }
});

// Create or update policy manually (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, content, category, tags, version } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const policyData = {
      title,
      content,
      category: category || 'general',
      tags: tags || [],
      version: version || '1.0',
      sharepoint_id: `manual_${Date.now()}`
    };

    const policy = await DatabaseService.createPolicy(policyData);
    
    logger.info('Policy created manually', { 
      policyId: policy.id, 
      title: policy.title, 
      userId: req.user.id 
    });

    res.status(201).json(policy);
  } catch (error) {
    logger.error('Failed to create policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// Delete policy (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'UPDATE policies SET is_active = false WHERE id = $1 RETURNING *';
    const result = await DatabaseService.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    logger.info('Policy deactivated', { 
      policyId: id, 
      title: result.rows[0].title, 
      userId: req.user.id 
    });

    res.json({ message: 'Policy deactivated successfully' });
  } catch (error) {
    logger.error('Failed to delete policy:', error);
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

// Get policy categories
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT DISTINCT category FROM policies WHERE is_active = true ORDER BY category';
    const result = await DatabaseService.query(query);
    
    res.json({
      categories: result.rows.map(row => row.category)
    });
  } catch (error) {
    logger.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

module.exports = router;
