const DatabaseService = require('../config/database');
const { logger } = require('../utils/logger');

const samplePolicies = [
  {
    title: "Travel Policy - India Operations",
    content: `
# Travel Policy for India Operations

## Domestic Travel
- Employees are entitled to economy class flights for domestic travel within India
- Hotel accommodation up to ₹5,000 per night in metro cities, ₹3,000 in other cities
- Daily allowance of ₹1,500 for meals and incidentals
- Local transportation via company-approved cab services or public transport

## International Travel
- Business class for flights over 8 hours, economy for shorter flights
- Hotel accommodation up to $200 per night
- Daily allowance of $75 for meals and incidentals
- Travel insurance is mandatory and covered by company

## Approval Process
- Domestic travel: Manager approval required
- International travel: Manager + HR approval required
- All travel must be booked through approved travel agency

## Expense Reimbursement
- Submit expenses within 30 days of travel completion
- Original receipts required for all expenses above ₹500
- Reimbursement processed within 15 business days
    `,
    category: "travel",
    tags: ["travel", "india", "domestic", "international", "expenses", "reimbursement"],
    version: "2.1",
    sharepoint_id: "sample_travel_india_001"
  },
  {
    title: "Annual Leave Policy",
    content: `
# Annual Leave Policy

## Leave Entitlement
- New employees: 15 days annual leave in first year
- 1-3 years service: 20 days annual leave
- 3+ years service: 25 days annual leave
- Maximum carry forward: 5 days to next year

## Leave Types
- **Annual Leave**: Vacation and personal time off
- **Sick Leave**: 12 days per year, no carry forward
- **Maternity Leave**: 26 weeks paid leave
- **Paternity Leave**: 2 weeks paid leave
- **Bereavement Leave**: 3 days for immediate family

## Application Process
- Apply for leave at least 2 weeks in advance
- Manager approval required
- HR notification for leaves over 5 consecutive days
- Emergency leave can be applied retroactively with manager approval

## Public Holidays
- All national and regional public holidays are observed
- Floating holidays: 2 days per year for personal/religious observances

## Leave Without Pay
- Available after exhausting annual leave
- Manager and HR approval required
- Maximum 30 days per year
    `,
    category: "leave",
    tags: ["annual leave", "vacation", "sick leave", "maternity", "paternity", "holidays"],
    version: "3.0",
    sharepoint_id: "sample_leave_policy_001"
  },
  {
    title: "Remote Work Policy",
    content: `
# Remote Work Policy

## Eligibility
- Employees with 6+ months tenure
- Role must be suitable for remote work
- Manager approval required
- Performance rating of "Meets Expectations" or above

## Work Arrangements
- **Fully Remote**: Work from home full-time
- **Hybrid**: 2-3 days in office, remainder remote
- **Flexible**: Ad-hoc remote work as needed

## Requirements
- Dedicated workspace with reliable internet (minimum 25 Mbps)
- Company-provided laptop and necessary equipment
- Availability during core business hours (10 AM - 4 PM local time)
- Regular check-ins with manager (weekly minimum)

## Equipment and Expenses
- Company provides laptop, monitor, keyboard, mouse
- Internet allowance: ₹2,000 per month for fully remote employees
- Ergonomic chair and desk setup allowance: ₹15,000 one-time

## Performance and Communication
- Daily standup meetings via Teams
- Weekly one-on-ones with manager
- Monthly team meetings in-person or virtual
- Quarterly performance reviews

## Security Requirements
- VPN connection for accessing company systems
- Two-factor authentication mandatory
- Regular security training completion
- Confidential information handling protocols
    `,
    category: "remote",
    tags: ["remote work", "hybrid", "work from home", "equipment", "security"],
    version: "1.5",
    sharepoint_id: "sample_remote_policy_001"
  },
  {
    title: "Health Benefits Policy",
    content: `
# Health Benefits Policy

## Medical Insurance
- Comprehensive health insurance for employee and family
- Coverage includes hospitalization, outpatient, dental, vision
- Annual limit: ₹10,00,000 per family
- Cashless treatment at 5000+ network hospitals

## Wellness Programs
- Annual health checkup (fully covered)
- Gym membership reimbursement up to ₹3,000 per month
- Mental health counseling sessions (12 sessions per year)
- Yoga and meditation classes

## Maternity Benefits
- Pre and post-natal care coverage
- Delivery expenses fully covered
- Newborn coverage from day one
- Lactation support and counseling

## Emergency Medical
- Emergency medical evacuation coverage
- 24/7 medical helpline
- Ambulance services covered
- Critical illness coverage up to ₹50,00,000

## Claims Process
- Cashless: Use insurance card at network hospitals
- Reimbursement: Submit claims within 30 days
- Pre-authorization required for planned treatments over ₹50,000
- Claims processed within 15 business days

## Dependents Coverage
- Spouse and up to 2 children covered
- Parents coverage available (additional premium)
- Coverage continues during leave periods
    `,
    category: "benefits",
    tags: ["health insurance", "medical", "wellness", "maternity", "emergency", "claims"],
    version: "2.3",
    sharepoint_id: "sample_health_benefits_001"
  },
  {
    title: "Code of Conduct",
    content: `
# Employee Code of Conduct

## Professional Behavior
- Treat all colleagues with respect and dignity
- Maintain professional demeanor in all interactions
- Dress code: Business casual in office, appropriate attire for video calls
- Punctuality and reliability in meetings and commitments

## Diversity and Inclusion
- Zero tolerance for discrimination based on race, gender, religion, age, or sexual orientation
- Inclusive language and behavior expected at all times
- Report any incidents of harassment or discrimination immediately
- Participate in diversity and inclusion training programs

## Confidentiality
- Protect company confidential information and trade secrets
- Do not share client information outside authorized personnel
- Use company devices and systems responsibly
- Report security incidents immediately

## Conflict of Interest
- Disclose any potential conflicts of interest to manager and HR
- No outside employment that conflicts with company interests
- Gifts and entertainment must comply with company policy
- Financial interests in competitors must be disclosed

## Social Media
- Do not represent company views on personal social media
- Maintain professional image online
- Respect confidentiality even on social platforms
- Report any negative publicity or issues to PR team

## Reporting Violations
- Report violations to manager, HR, or ethics hotline
- Anonymous reporting available
- No retaliation against good faith reporters
- Investigation process is confidential and fair
    `,
    category: "conduct",
    tags: ["code of conduct", "behavior", "diversity", "inclusion", "confidentiality", "ethics"],
    version: "4.0",
    sharepoint_id: "sample_conduct_policy_001"
  }
];

async function insertSampleData() {
  try {
    logger.info('Inserting sample policy data...');
    
    for (const policyData of samplePolicies) {
      const policy = await DatabaseService.createPolicy(policyData);
      logger.info(`Created sample policy: ${policy.title}`);
    }
    
    // Create a sample admin user
    const adminUser = await DatabaseService.createUser({
      jumpcloud_id: 'admin_001',
      email: 'admin@company.com',
      name: 'Admin User',
      role: 'admin'
    });
    
    logger.info('Created sample admin user');
    
    // Create a sample regular user
    const regularUser = await DatabaseService.createUser({
      jumpcloud_id: 'user_001',
      email: 'user@company.com',
      name: 'Regular User',
      role: 'user'
    });
    
    logger.info('Created sample regular user');
    
    console.log('✅ Sample data inserted successfully!');
    console.log(`📊 Created ${samplePolicies.length} sample policies`);
    console.log('👥 Created 2 sample users (admin and regular)');
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to insert sample data:', error);
    console.error('❌ Sample data insertion failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  insertSampleData();
}

module.exports = { insertSampleData, samplePolicies };
