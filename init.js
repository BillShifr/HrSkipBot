#!/usr/bin/env node

/**
 * Initialization script for HR Skip Bot
 * Sets up basic configuration and tests connections
 */

require('dotenv').config();
const config = require('./src/config');
const DatabaseService = require('./src/services/DatabaseService');
const EmailService = require('./src/services/EmailService');

async function initialize() {
  console.log('🚀 Initializing HR Skip Bot...\n');

  // Check environment variables
  console.log('📋 Checking environment variables...');
  const requiredEnvVars = [
    'BOT_TOKEN',
    'MONGODB_URI',
    'OPENAI_API_KEY',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.log('\n📝 Please copy env.example to .env and fill in the values');
    process.exit(1);
  }

  console.log('✅ Environment variables OK\n');

  // Test database connection
  console.log('🗄️  Testing database connection...');
  try {
    await DatabaseService.connect(config.database.mongoUri);
    console.log('✅ Database connection OK\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Make sure MongoDB is running and MONGODB_URI is correct\n');
    process.exit(1);
  }

  // Test email configuration
  console.log('📧 Testing email configuration...');
  try {
    const emailService = new EmailService(config);
    const emailVerified = await emailService.verifyConnection();
    if (emailVerified) {
      console.log('✅ Email configuration OK\n');
    } else {
      console.error('❌ Email configuration failed');
      console.log('💡 Check your SMTP settings\n');
    }
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    console.log('💡 Check your SMTP settings\n');
  }

  // Close database connection
  await DatabaseService.disconnect();

  console.log('🎉 Initialization complete!');
  console.log('\n📚 Next steps:');
  console.log('1. Start the bot: npm start');
  console.log('2. Open Telegram and search for your bot');
  console.log('3. Send /start to begin');
  console.log('\n📖 For more information, see README.md');
}

initialize().catch(console.error);