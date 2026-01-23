require('dotenv').config();

const config = {
  // Telegram Bot
  telegram: {
    token: process.env.BOT_TOKEN || '8416000759:AAHpkrcw2x34cyJxy_VznLI_6nZKtGK0XPM'
  },

  // HH.ru API
  hh: {
    clientId: process.env.HH_CLIENT_ID || 'O5C56ETU1LR3EDGEAPAUUGLOEN1VQAU3J242HD7C6GA8TMGRSIM77NNRIODFF6MU',
    clientSecret: process.env.HH_CLIENT_SECRET || 'M79JEJ6VH8NRVEKG6P5QK68490DP3S4KPGEJ1GQRDRFKGQFFM3CTNSU6E670O6VJ',
    redirectUri: process.env.HH_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    baseUrl: 'https://api.hh.ru',
    authUrl: 'https://hh.ru/oauth/authorize'
  },

  // OpenAI API
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY',
    model: 'gpt-4',
    maxTokens: 2000
  },

  // Email service
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'vladislavtatynkin01@gmail.com',
      pass: process.env.SMTP_PASS || '1245Dkfl-'
    },
    from: process.env.SMTP_USER || 'vladislavtatynkin01@gmail.com'
  },

  // Database
  database: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hhbot',
    redisUrl: process.env.REDIS_URL
  },

  // Application
  app: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
    uploadsDir: './uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },

  // Scraping
  scraper: {
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  },

  // Bot settings
  bot: {
    adminIds: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [],
    maxRetries: 3,
    retryDelay: 1000,
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
  }
};

module.exports = config;