-- HR Chatbot Database Schema

-- Users table for authentication and user management
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    jumpcloud_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'hr')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policy documents from SharePoint
CREATE TABLE policies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    file_path VARCHAR(1000),
    sharepoint_id VARCHAR(255) UNIQUE,
    category VARCHAR(100),
    tags TEXT[],
    version VARCHAR(50),
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- User queries and chatbot interactions
CREATE TABLE user_queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    query_text TEXT NOT NULL,
    intent VARCHAR(100),
    matched_policies INTEGER[],
    response_text TEXT,
    response_type VARCHAR(50) CHECK (response_type IN ('policy_match', 'clarification', 'escalation')),
    confidence_score DECIMAL(3,2),
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User feedback on chatbot responses
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES user_queries(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating IN (-1, 1)), -- -1 for thumbs down, 1 for thumbs up
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics and usage tracking
CREATE TABLE analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_queries INTEGER DEFAULT 0,
    successful_queries INTEGER DEFAULT 0,
    escalated_queries INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    avg_confidence_score DECIMAL(3,2) DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Policy gaps and suggestions
CREATE TABLE policy_suggestions (
    id SERIAL PRIMARY KEY,
    suggested_by INTEGER REFERENCES users(id),
    query_pattern TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    suggested_policy_title VARCHAR(500),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Error logs
CREATE TABLE error_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    query_id INTEGER REFERENCES user_queries(id),
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_jumpcloud_id ON users(jumpcloud_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_policies_category ON policies(category);
CREATE INDEX idx_policies_active ON policies(is_active);
CREATE INDEX idx_queries_user_id ON user_queries(user_id);
CREATE INDEX idx_queries_created_at ON user_queries(created_at);
CREATE INDEX idx_feedback_query_id ON feedback(query_id);
CREATE INDEX idx_analytics_date ON analytics(date);
CREATE INDEX idx_suggestions_status ON policy_suggestions(status);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policy_suggestions_updated_at BEFORE UPDATE ON policy_suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
