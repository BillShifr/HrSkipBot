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

// HH.ru OAuth callback endpoint
app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const telegramId = state;

    if (!code || !telegramId) {
      return res.status(400).send('Missing authorization code or state');
    }

    const AuthController = require('./controllers/AuthController');
    const authController = new AuthController(config);

    await authController.exchangeCodeForToken(code, telegramId);

    res.send(`
      <html>
        <head>
          <title>Авторизация успешна</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: green; font-size: 24px; margin-bottom: 20px; }
            .info { color: #666; }
          </style>
        </head>
        <body>
          <div class="success">✅ Авторизация успешна!</div>
          <div class="info">Вы можете закрыть это окно и вернуться в Telegram бота.</div>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <head>
          <title>Ошибка авторизации</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: red; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="error">❌ Ошибка авторизации</div>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
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