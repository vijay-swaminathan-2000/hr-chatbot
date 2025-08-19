const { BotFrameworkAdapter, MessageFactory, CardFactory } = require('botbuilder');
const ChatService = require('./chat');
const DatabaseService = require('../config/database');
const { logger } = require('../utils/logger');

class TeamsBot {
  constructor() {
    this.adapter = new BotFrameworkAdapter({
      appId: process.env.MICROSOFT_APP_ID,
      appPassword: process.env.MICROSOFT_APP_PASSWORD
    });

    this.adapter.onTurnError = async (context, error) => {
      logger.error('Teams bot error:', error);
      await context.sendActivity('Sorry, I encountered an error. Please try again or contact HR directly.');
    };
  }

  async processActivity(req, res) {
    await this.adapter.processActivity(req, res, async (context) => {
      if (context.activity.type === 'message') {
        await this.handleMessage(context);
      } else if (context.activity.type === 'membersAdded') {
        await this.handleMembersAdded(context);
      }
    });
  }

  async handleMessage(context) {
    try {
      const userMessage = context.activity.text?.trim();
      if (!userMessage) return;

      // Get or create user from Teams profile
      const user = await this.getOrCreateUser(context);
      const sessionId = `teams_${user.id}_${context.activity.conversation.id}`;

      // Check for feedback commands
      if (this.isFeedbackCommand(userMessage)) {
        await this.handleFeedback(context, user, userMessage);
        return;
      }

      // Process message through chat service
      const chatResponse = await ChatService.processMessage(userMessage, user.id, sessionId);

      // Create response with feedback buttons
      const response = this.createResponseWithFeedback(chatResponse, user.id);
      await context.sendActivity(response);

    } catch (error) {
      logger.error('Teams message handling failed:', error);
      await context.sendActivity('I apologize, but I encountered an issue. Please try again or contact HR directly.');
    }
  }

  async handleMembersAdded(context) {
    const welcomeText = `
👋 Hello! I'm your HR assistant bot. I'm here to help you with:

• **Policy Questions**: Ask about company policies (e.g., "What's the travel policy?")
• **Leave Inquiries**: Questions about time off, vacation days, etc.
• **Benefits Info**: Health insurance, 401k, and other benefits
• **General HR**: Any other HR-related questions

Just type your question naturally, and I'll do my best to help! If I can't find the answer, I'll connect you with our HR team.

How can I assist you today?
    `;

    for (const member of context.activity.membersAdded) {
      if (member.id !== context.activity.recipient.id) {
        await context.sendActivity(MessageFactory.text(welcomeText));
      }
    }
  }

  async getOrCreateUser(context) {
    try {
      const teamsUser = context.activity.from;
      const email = teamsUser.aadObjectId ? `${teamsUser.aadObjectId}@company.com` : `${teamsUser.id}@teams.local`;
      
      // Try to find existing user
      let user = await DatabaseService.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        const userData = {
          jumpcloud_id: teamsUser.aadObjectId || teamsUser.id,
          email: email,
          name: teamsUser.name || 'Teams User',
          role: 'user'
        };
        user = await DatabaseService.createUser(userData);
      }

      return user;
    } catch (error) {
      logger.error('Failed to get/create Teams user:', error);
      throw error;
    }
  }

  createResponseWithFeedback(chatResponse, userId) {
    const card = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: chatResponse.response,
          wrap: true,
          size: 'Medium'
        },
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'TextBlock',
                  text: 'Was this helpful?',
                  size: 'Small',
                  color: 'Accent'
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '👍 Yes',
          data: {
            action: 'feedback',
            rating: 1,
            queryId: chatResponse.queryId,
            userId: userId
          }
        },
        {
          type: 'Action.Submit',
          title: '👎 No',
          data: {
            action: 'feedback',
            rating: -1,
            queryId: chatResponse.queryId,
            userId: userId
          }
        }
      ]
    });

    return MessageFactory.attachment(card);
  }

  isFeedbackCommand(message) {
    const feedbackPatterns = ['👍', '👎', 'thumbs up', 'thumbs down', 'helpful', 'not helpful'];
    return feedbackPatterns.some(pattern => message.toLowerCase().includes(pattern));
  }

  async handleFeedback(context, user, message) {
    try {
      const isPositive = message.includes('👍') || message.toLowerCase().includes('helpful') || message.toLowerCase().includes('thumbs up');
      const rating = isPositive ? 1 : -1;

      // For simplicity, we'll associate feedback with the last query from this user
      const lastQueryResult = await DatabaseService.query(
        'SELECT id FROM user_queries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [user.id]
      );

      if (lastQueryResult.rows.length > 0) {
        await DatabaseService.saveFeedback({
          query_id: lastQueryResult.rows[0].id,
          user_id: user.id,
          rating,
          comment: message
        });

        await context.sendActivity('Thank you for your feedback! 🙏');
      } else {
        await context.sendActivity('I don\'t have a recent query to associate your feedback with. Please ask a question first!');
      }
    } catch (error) {
      logger.error('Feedback handling failed:', error);
      await context.sendActivity('Sorry, I couldn\'t process your feedback. Please try again.');
    }
  }
}

module.exports = TeamsBot;
