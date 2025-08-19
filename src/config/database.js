const db = require('../database/connection');

class DatabaseService {
  // User operations
  async createUser(userData) {
    const { jumpcloud_id, email, name, role = 'user' } = userData;
    const query = `
      INSERT INTO users (jumpcloud_id, email, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        jumpcloud_id = EXCLUDED.jumpcloud_id,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await db.query(query, [jumpcloud_id, email, name, role]);
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  async getUserById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Policy operations
  async createPolicy(policyData) {
    const { title, content, file_path, sharepoint_id, category, tags, version } = policyData;
    const query = `
      INSERT INTO policies (title, content, file_path, sharepoint_id, category, tags, version, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (sharepoint_id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        file_path = EXCLUDED.file_path,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        version = EXCLUDED.version,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await db.query(query, [title, content, file_path, sharepoint_id, category, tags, version]);
    return result.rows[0];
  }

  async getAllPolicies() {
    const query = 'SELECT * FROM policies WHERE is_active = true ORDER BY category, title';
    const result = await db.query(query);
    return result.rows;
  }

  async searchPolicies(searchTerm, category = null) {
    let query = `
      SELECT * FROM policies 
      WHERE is_active = true 
      AND (title ILIKE $1 OR content ILIKE $1 OR $1 = ANY(tags))
    `;
    const params = [`%${searchTerm}%`];
    
    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }
    
    query += ' ORDER BY title';
    const result = await db.query(query, params);
    return result.rows;
  }

  // Query logging
  async logUserQuery(queryData) {
    const { user_id, session_id, query_text, intent, matched_policies, response_text, response_type, confidence_score, response_time_ms } = queryData;
    const query = `
      INSERT INTO user_queries (user_id, session_id, query_text, intent, matched_policies, response_text, response_type, confidence_score, response_time_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await db.query(query, [user_id, session_id, query_text, intent, matched_policies, response_text, response_type, confidence_score, response_time_ms]);
    return result.rows[0];
  }

  // Feedback operations
  async saveFeedback(feedbackData) {
    const { query_id, user_id, rating, comment } = feedbackData;
    const query = `
      INSERT INTO feedback (query_id, user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (query_id, user_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment
      RETURNING *
    `;
    const result = await db.query(query, [query_id, user_id, rating, comment]);
    return result.rows[0];
  }

  // Analytics operations
  async updateDailyAnalytics(date, metrics) {
    const { total_queries, successful_queries, escalated_queries, avg_response_time_ms, avg_confidence_score, unique_users } = metrics;
    const query = `
      INSERT INTO analytics (date, total_queries, successful_queries, escalated_queries, avg_response_time_ms, avg_confidence_score, unique_users)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (date) DO UPDATE SET
        total_queries = analytics.total_queries + EXCLUDED.total_queries,
        successful_queries = analytics.successful_queries + EXCLUDED.successful_queries,
        escalated_queries = analytics.escalated_queries + EXCLUDED.escalated_queries,
        avg_response_time_ms = (analytics.avg_response_time_ms + EXCLUDED.avg_response_time_ms) / 2,
        avg_confidence_score = (analytics.avg_confidence_score + EXCLUDED.avg_confidence_score) / 2,
        unique_users = GREATEST(analytics.unique_users, EXCLUDED.unique_users)
      RETURNING *
    `;
    const result = await db.query(query, [date, total_queries, successful_queries, escalated_queries, avg_response_time_ms, avg_confidence_score, unique_users]);
    return result.rows[0];
  }

  // Admin reports
  async getTopAnsweredQueries(limit = 10) {
    const query = `
      SELECT query_text, COUNT(*) as frequency, AVG(confidence_score) as avg_confidence
      FROM user_queries 
      WHERE response_type = 'policy_match'
      GROUP BY query_text
      ORDER BY frequency DESC, avg_confidence DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  async getTopUnansweredQueries(limit = 10) {
    const query = `
      SELECT query_text, COUNT(*) as frequency
      FROM user_queries 
      WHERE response_type = 'escalation'
      GROUP BY query_text
      ORDER BY frequency DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  async getTopRatedQueries(limit = 10) {
    const query = `
      SELECT uq.query_text, uq.response_text, AVG(f.rating) as avg_rating, COUNT(f.rating) as rating_count
      FROM user_queries uq
      JOIN feedback f ON uq.id = f.query_id
      GROUP BY uq.id, uq.query_text, uq.response_text
      ORDER BY avg_rating DESC, rating_count DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  async getLowRatedQueries(limit = 10) {
    const query = `
      SELECT uq.query_text, uq.response_text, AVG(f.rating) as avg_rating, COUNT(f.rating) as rating_count
      FROM user_queries uq
      JOIN feedback f ON uq.id = f.query_id
      GROUP BY uq.id, uq.query_text, uq.response_text
      HAVING AVG(f.rating) < 0
      ORDER BY avg_rating ASC, rating_count DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  }
}

module.exports = new DatabaseService();
