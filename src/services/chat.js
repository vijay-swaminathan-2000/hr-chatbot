const OpenAI = require('openai');
const DatabaseService = require('../config/database');
const { logger } = require('../utils/logger');

class ChatService {
  constructor() {
    this.hasOpenAI = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
    if (this.hasOpenAI) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    this.hrEmail = process.env.HR_EMAIL || 'hr@yourcompany.com';
  }

  async processMessage(message, userId, sessionId) {
    try {
      // Step 1: Search for relevant policies (skip intent classification for now)
      const relevantPolicies = await this.findRelevantPolicies(message);
      console.log('Found policies:', relevantPolicies.length);
      
      // Step 2: Generate response based on findings
      let response, responseType, confidence, matchedPolicies = [];
      
      if (relevantPolicies.length > 0) {
        // Simple fallback response without OpenAI
        const topPolicy = relevantPolicies[0];
        response = `Based on our **${topPolicy.title}** policy:\n\n${topPolicy.content.substring(0, 500)}...`;
        responseType = 'policy_match';
        confidence = topPolicy.relevanceScore || 0.8;
        matchedPolicies = relevantPolicies.map(p => p.id);
      } else {
        // No matching policies found - escalate to HR
        response = `I understand you're looking for information about "${message}". 

I wasn't able to find a specific policy that addresses your question in our current knowledge base. For the most accurate and up-to-date information, I'd recommend reaching out to our HR team directly.

You can contact HR at: ${this.hrEmail}

They'll be happy to provide you with detailed guidance and ensure you get the specific information you need.

Is there anything else I can help you with regarding our existing policies?`;
        responseType = 'escalation';
        confidence = 0;
      }

      return {
        response,
        type: responseType,
        confidence,
        intent: 'policy_explanation',
        matchedPolicies,
        suggestions: []
      };

    } catch (error) {
      logger.error('Chat processing error:', error);
      throw error;
    }
  }

  async classifyIntent(message) {
    try {
      if (!this.hasOpenAI) {
        // Fallback classification without OpenAI
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('policy') || lowerMessage.includes('rule') || lowerMessage.includes('guideline')) {
          return 'policy_explanation';
        }
        return 'general_inquiry';
      }

      const prompt = `
        Classify the following HR-related query into one of these categories:
        - policy_explanation: User wants to understand a specific policy
        - policy_clarification: User needs clarification on policy details
        - general_inquiry: General HR questions
        - complaint: User has a complaint or concern
        - request: User is requesting something specific

        Query: "${message}"
        
        Respond with only the category name.
      `;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.1
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      logger.error('Intent classification failed:', error);
      return 'general_inquiry';
    }
  }

  async findRelevantPolicies(message) {
    try {
      console.log('Searching for policies with message:', message);
      
      // Extract keywords from the message
      const keywords = message.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !['what', 'how', 'can', 'the', 'for', 'and', 'are', 'is'].includes(word));
      
      console.log('Extracted keywords:', keywords);
      
      // Search for each keyword and combine results
      let allPolicies = [];
      for (const keyword of keywords) {
        const policies = await DatabaseService.searchPolicies(keyword);
        allPolicies = allPolicies.concat(policies);
      }
      
      // Remove duplicates
      const uniquePolicies = allPolicies.filter((policy, index, self) => 
        index === self.findIndex(p => p.id === policy.id)
      );
      
      console.log('Raw policies found:', uniquePolicies.length);
      
      // Score policies based on relevance
      const scoredPolicies = uniquePolicies.map(policy => {
        const score = this.calculateRelevanceScore(message, policy);
        console.log(`Policy "${policy.title}" scored: ${score}`);
        return { ...policy, relevanceScore: score };
      });

      // Filter and sort by relevance
      const filteredPolicies = scoredPolicies
        .filter(policy => policy.relevanceScore > 0.1)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3); // Top 3 most relevant policies
      
      console.log('Filtered policies:', filteredPolicies.length);
      return filteredPolicies;
    } catch (error) {
      logger.error('Policy search failed:', error);
      console.error('Policy search error:', error);
      return [];
    }
  }

  calculateRelevanceScore(query, policy) {
    const queryLower = query.toLowerCase();
    const titleLower = policy.title.toLowerCase();
    const contentLower = policy.content.toLowerCase();
    
    let score = 0;
    
    // Title match (highest weight)
    if (titleLower.includes(queryLower)) score += 0.8;
    
    // Tag match
    if (policy.tags && policy.tags.some(tag => queryLower.includes(tag.toLowerCase()))) {
      score += 0.6;
    }
    
    // Content match (lower weight)
    const queryWords = queryLower.split(' ').filter(word => word.length > 3);
    const contentMatches = queryWords.filter(word => contentLower.includes(word)).length;
    score += (contentMatches / queryWords.length) * 0.4;
    
    return Math.min(score, 1.0);
  }

  async generatePolicyResponse(message, policies) {
    try {
      console.log('hasOpenAI:', this.hasOpenAI, 'OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
      
      if (!this.hasOpenAI) {
        // Fallback response without OpenAI
        console.log('Using fallback response for policies:', policies.length);
        const topPolicy = policies[0];
        const response = `Based on our **${topPolicy.title}** policy:\n\n${topPolicy.content.substring(0, 500)}...`;
        const avgRelevance = policies.reduce((sum, p) => sum + p.relevanceScore, 0) / policies.length;
        const confidence = Math.min(avgRelevance * 1.2, 1.0);
        return { response, confidence };
      }

      const policyContext = policies.map(p => 
        `Policy: ${p.title}\nContent: ${p.content}\nCategory: ${p.category}`
      ).join('\n\n---\n\n');

      const prompt = `
        You are an HR chatbot assistant. Based on the following company policies, answer the user's question in a helpful and professional manner.

        User Question: "${message}"

        Relevant Policies:
        ${policyContext}

        Instructions:
        - Use a warm, professional, and empathetic tone
        - Provide specific policy details when relevant
        - If the policies don't fully answer the question, acknowledge this
        - Keep responses concise but comprehensive
        - Always cite which policy you're referencing
        - If multiple policies apply, explain how they work together

        Response:
      `;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      });

      const response = completion.choices[0].message.content.trim();
      
      // Calculate confidence based on policy relevance
      const avgRelevance = policies.reduce((sum, p) => sum + p.relevanceScore, 0) / policies.length;
      const confidence = Math.min(avgRelevance * 1.2, 1.0);

      return { response, confidence };
    } catch (error) {
      logger.error('Policy response generation failed:', error);
      throw error;
    }
  }

  async generateEscalationResponse(message) {
    const response = `
I understand you're looking for information about "${message}". 

I wasn't able to find a specific policy that addresses your question in our current knowledge base. For the most accurate and up-to-date information, I'd recommend reaching out to our HR team directly.

You can contact HR at: ${this.hrEmail}

They'll be happy to provide you with detailed guidance and ensure you get the specific information you need.

Is there anything else I can help you with regarding our existing policies?
    `.trim();

    return response;
  }

  async generateSuggestions(message) {
    // Generate suggestions for policy gaps based on unanswered queries
    try {
      const query = `
        SELECT query_text, COUNT(*) as frequency
        FROM user_queries 
        WHERE response_type = 'escalation' 
        AND query_text ILIKE $1
        GROUP BY query_text
        ORDER BY frequency DESC
        LIMIT 3
      `;
      
      const result = await DatabaseService.query(query, [`%${message}%`]);
      
      return result.rows.map(row => ({
        query: row.query_text,
        frequency: row.frequency,
        suggestedPolicy: `Policy needed for: ${row.query_text}`
      }));
    } catch (error) {
      logger.error('Failed to generate suggestions:', error);
      return [];
    }
  }
}

module.exports = ChatService;
