const axios = require('axios');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { logger } = require('../utils/logger');
const DatabaseService = require('../config/database');

class SharePointService {
  constructor() {
    this.msalConfig = {
      auth: {
        clientId: process.env.SHAREPOINT_CLIENT_ID,
        clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID}`
      }
    };
    this.cca = new ConfidentialClientApplication(this.msalConfig);
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const clientCredentialRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
        skipCache: false
      };

      const response = await this.cca.acquireTokenByClientCredential(clientCredentialRequest);
      
      this.accessToken = response.accessToken;
      this.tokenExpiry = Date.now() + (response.expiresIn * 1000) - 60000; // 1 min buffer
      
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get SharePoint access token:', error);
      throw new Error('SharePoint authentication failed');
    }
  }

  async getSiteId() {
    try {
      const token = await this.getAccessToken();
      const siteUrl = process.env.SHAREPOINT_SITE_URL;
      const hostname = new URL(siteUrl).hostname;
      const sitePath = new URL(siteUrl).pathname;

      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.id;
    } catch (error) {
      logger.error('Failed to get SharePoint site ID:', error);
      throw new Error('Failed to access SharePoint site');
    }
  }

  async getPolicyDocuments() {
    try {
      const token = await this.getAccessToken();
      const siteId = await this.getSiteId();

      // Get all drives in the site
      const drivesResponse = await axios.get(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const documents = [];

      for (const drive of drivesResponse.data.value) {
        // Get items from each drive
        const itemsResponse = await axios.get(
          `https://graph.microsoft.com/v1.0/drives/${drive.id}/root/children`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        for (const item of itemsResponse.data.value) {
          if (item.file && this.isPolicyDocument(item.name)) {
            documents.push({
              id: item.id,
              name: item.name,
              downloadUrl: item['@microsoft.graph.downloadUrl'],
              lastModified: item.lastModifiedDateTime,
              size: item.size,
              driveId: drive.id
            });
          }
        }
      }

      return documents;
    } catch (error) {
      logger.error('Failed to get policy documents:', error);
      throw new Error('Failed to retrieve policy documents');
    }
  }

  isPolicyDocument(filename) {
    const policyKeywords = ['policy', 'handbook', 'guide', 'procedure', 'manual'];
    const supportedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    
    const lowerFilename = filename.toLowerCase();
    const hasKeyword = policyKeywords.some(keyword => lowerFilename.includes(keyword));
    const hasValidExtension = supportedExtensions.some(ext => lowerFilename.endsWith(ext));
    
    return hasKeyword && hasValidExtension;
  }

  async downloadDocument(downloadUrl) {
    try {
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download document:', error);
      throw new Error('Document download failed');
    }
  }

  async extractTextFromDocument(buffer, filename) {
    try {
      const extension = filename.toLowerCase().split('.').pop();
      
      switch (extension) {
        case 'pdf':
          const pdfData = await pdfParse(buffer);
          return pdfData.text;
          
        case 'docx':
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;
          
        case 'txt':
          return buffer.toString('utf8');
          
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      logger.error('Failed to extract text from document:', error);
      throw new Error('Text extraction failed');
    }
  }

  categorizePolicy(title, content) {
    const categories = {
      'leave': ['leave', 'vacation', 'pto', 'time off', 'holiday'],
      'travel': ['travel', 'expense', 'reimbursement', 'trip'],
      'benefits': ['benefit', 'insurance', 'health', 'dental', 'vision', '401k', 'retirement'],
      'conduct': ['conduct', 'behavior', 'ethics', 'harassment', 'discrimination'],
      'remote': ['remote', 'work from home', 'wfh', 'hybrid', 'flexible'],
      'compensation': ['salary', 'bonus', 'pay', 'compensation', 'raise'],
      'general': []
    };

    const text = (title + ' ' + content).toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  async syncPolicies() {
    try {
      logger.info('Starting SharePoint policy sync...');
      
      const documents = await this.getPolicyDocuments();
      const syncedPolicies = [];

      for (const doc of documents) {
        try {
          const buffer = await this.downloadDocument(doc.downloadUrl);
          const content = await this.extractTextFromDocument(buffer, doc.name);
          
          const policyData = {
            title: doc.name.replace(/\.[^/.]+$/, ''), // Remove file extension
            content,
            file_path: doc.name,
            sharepoint_id: doc.id,
            category: this.categorizePolicy(doc.name, content),
            tags: this.extractTags(content),
            version: '1.0',
            last_updated: new Date(doc.lastModified)
          };

          const policy = await DatabaseService.createPolicy(policyData);
          syncedPolicies.push(policy);
          
          logger.info(`Synced policy: ${policy.title}`);
        } catch (error) {
          logger.error(`Failed to sync document ${doc.name}:`, error);
        }
      }

      logger.info(`SharePoint sync completed. Synced ${syncedPolicies.length} policies.`);
      return syncedPolicies;
    } catch (error) {
      logger.error('SharePoint sync failed:', error);
      throw error;
    }
  }

  extractTags(content) {
    // Simple tag extraction based on common HR terms
    const tagKeywords = [
      'annual leave', 'sick leave', 'maternity', 'paternity',
      'travel allowance', 'meal allowance', 'accommodation',
      'health insurance', 'dental', 'vision', '401k',
      'remote work', 'hybrid', 'office hours',
      'performance review', 'promotion', 'disciplinary'
    ];

    const text = content.toLowerCase();
    return tagKeywords.filter(tag => text.includes(tag));
  }
}

module.exports = new SharePointService();
