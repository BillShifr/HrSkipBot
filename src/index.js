require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');

// Import services
const TelegramBot = require('./services/TelegramBot');
const HhApiService = require('./services/HhApiService');
const LlmAgent = require('./services/LlmAgent');
const EmailService = require('./services/EmailService');
const DatabaseService = require('./services/DatabaseService');

// Express app for health checks and webhooks
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize services
async function initializeServices() {
  try {
    // Connect to database
    await DatabaseService.connect(config.database.url);

    // Initialize Telegram bot
    const bot = new Telegraf(config.telegram.token);
    const telegramBot = new TelegramBot(bot, config);

    // Initialize other services
    const hhApi = new HhApiService(config);
    const llmAgent = new LlmAgent(config);
    const emailService = new EmailService(config);

    // Start Telegram bot
    await telegramBot.start();

    console.log('All services initialized successfully');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down gracefully...');
      await telegramBot.stop();
      await DatabaseService.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start the application
const PORT = config.app.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${config.app.env} mode`);
  initializeServices();
});

module.exports = app;