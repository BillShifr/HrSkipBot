const User = require('../models/User');
const JobApplication = require('../models/JobApplication');
const HhApiService = require('./HhApiService');
const LlmAgent = require('./LlmAgent');
const EmailService = require('./EmailService');

class TelegramBot {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.hhApi = new HhApiService(config);
    this.llmAgent = new LlmAgent(config);
    this.emailService = new EmailService(config);

    this.setupCommands();
    this.setupActions();
  }

  /**
   * Setup bot commands
   */
  setupCommands() {
    // Start command
    this.bot.start(async (ctx) => {
      await this.handleStart(ctx);
    });

    // Help command
    this.bot.help(async (ctx) => {
      await this.handleHelp(ctx);
    });

    // Settings command
    this.bot.command('settings', async (ctx) => {
      await this.handleSettings(ctx);
    });

    // Search command
    this.bot.command('search', async (ctx) => {
      await this.handleSearch(ctx);
    });

    // Status command
    this.bot.command('status', async (ctx) => {
      await this.handleStatus(ctx);
    });

    // Resume command
    this.bot.command('resume', async (ctx) => {
      await this.handleResume(ctx);
    });
  }

  /**
   * Setup inline actions
   */
  setupActions() {
    // Settings actions
    this.bot.action('settings_keywords', async (ctx) => {
      await ctx.reply('Введите ключевые слова для поиска (через запятую):');
      ctx.session.awaitingInput = 'keywords';
    });

    this.bot.action('settings_location', async (ctx) => {
      await ctx.reply('Введите город или регион:');
      ctx.session.awaitingInput = 'location';
    });

    this.bot.action('settings_salary', async (ctx) => {
      await ctx.reply('Введите желаемую зарплату (мин-макс):');
      ctx.session.awaitingInput = 'salary';
    });

    this.bot.action('settings_email', async (ctx) => {
      await ctx.reply('Введите ваш email для отправки резюме:');
      ctx.session.awaitingInput = 'email';
    });

    this.bot.action('settings_template', async (ctx) => {
      await ctx.reply('Введите шаблон сопроводительного письма:');
      ctx.session.awaitingInput = 'template';
    });

    // Auth action
    this.bot.action('auth_hh', async (ctx) => {
      await this.handleAuthHH(ctx);
    });

    // Search actions
    this.bot.action(/^apply_(.+)$/, async (ctx) => {
      const jobId = ctx.match[1];
      await this.handleApply(ctx, jobId);
    });

    this.bot.action(/^view_(.+)$/, async (ctx) => {
      const jobId = ctx.match[1];
      await this.handleViewJob(ctx, jobId);
    });

    // Handle text input for settings
    this.bot.on('text', async (ctx) => {
      if (ctx.session?.awaitingInput) {
        await this.handleInput(ctx, ctx.session.awaitingInput, ctx.message.text);
        ctx.session.awaitingInput = null;
      }
    });
  }

  /**
   * Handle start command
   */
  async handleStart(ctx) {
    const telegramId = ctx.from.id.toString();

    try {
      // Check if user exists
      let user = await User.findByTelegramId(telegramId);

      if (!user) {
        // Create new user
        user = new User({
          telegramId,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name
        });
        await user.save();

        await ctx.reply(
          `👋 Добро пожаловать в HR Skip Bot!\n\n` +
          `Я помогу вам автоматизировать поиск работы и отправку резюме.\n\n` +
          `Для начала настройте ваш профиль:`
        );
      } else {
        await ctx.reply(`С возвращением, ${user.firstName}! 👋`);
      }

      // Show main menu
      await this.showMainMenu(ctx);

    } catch (error) {
      console.error('Error in handleStart:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  /**
   * Show main menu
   */
  async showMainMenu(ctx) {
    const user = await User.findByTelegramId(ctx.from.id.toString());
    const hasAuth = user && user.hh_access_token;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔍 Поиск вакансий', callback_data: 'search' },
          { text: '⚙️ Настройки', callback_data: 'settings' }
        ],
        [
          { text: hasAuth ? '✅ HH.ru авторизован' : '🔑 Авторизоваться на HH.ru', callback_data: 'auth_hh' },
          { text: '📄 Резюме', callback_data: 'resume' }
        ],
        [
          { text: '📊 Статистика', callback_data: 'status' },
          { text: '❓ Помощь', callback_data: 'help' }
        ]
      ]
    };

    await ctx.reply('Выберите действие:', {
      reply_markup: keyboard
    });
  }

  /**
   * Handle help command
   */
  async handleHelp(ctx) {
    const helpText = `
🤖 *HR Skip Bot* - ваш помощник в поиске работы

*Основные функции:*
• Автоматический поиск вакансий на HH.ru
• Анализ сайтов компаний с помощью ИИ
• Автоматическая отправка резюме на email работодателя

*Команды:*
/start - Запуск бота
/search - Поиск вакансий
/settings - Настройки профиля
/status - Статистика отправленных резюме
/resume - Управление резюме
/help - Эта справка

*Настройка:*
1. Укажите email для отправки резюме
2. Настройте ключевые слова поиска
3. Создайте шаблон сопроводительного письма

*Принцип работы:*
1. Бот находит подходящие вакансии
2. ИИ анализирует сайт компании
3. Находит контакты для связи
4. Отправляет ваше резюме автоматически

Для вопросов: @your_support
`;

    await ctx.replyWithMarkdown(helpText);
  }

  /**
   * Handle settings
   */
  async handleSettings(ctx) {
    const user = await User.findByTelegramId(ctx.from.id.toString());

    if (!user) {
      await ctx.reply('Сначала выполните /start');
      return;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔑 Ключевые слова', callback_data: 'settings_keywords' },
          { text: '📍 Локация', callback_data: 'settings_location' }
        ],
        [
          { text: '💰 Зарплата', callback_data: 'settings_salary' },
          { text: '📧 Email', callback_data: 'settings_email' }
        ],
        [
          { text: '📝 Шаблон письма', callback_data: 'settings_template' }
        ],
        [
          { text: '⬅️ Назад', callback_data: 'back_to_main' }
        ]
      ]
    };

    const settingsText = `
*Ваши настройки:*

🔑 *Ключевые слова:* ${user.preferences?.keywords?.join(', ') || 'не заданы'}
📍 *Локация:* ${user.preferences?.location || 'не задана'}
💰 *Зарплата:* ${user.preferences?.salary ? `${user.preferences.salary.min}-${user.preferences.salary.max}` : 'не задана'}
📧 *Email:* ${user.email || 'не задан'}
📝 *Шаблон:* ${user.templates?.coverLetter ? 'настроен' : 'по умолчанию'}
`;

    await ctx.replyWithMarkdown(settingsText, {
      reply_markup: keyboard
    });
  }

  /**
   * Handle search command
   */
  async handleSearch(ctx) {
    const user = await User.findByTelegramId(ctx.from.id.toString());

    if (!user) {
      await ctx.reply('Сначала выполните /start');
      return;
    }

    if (!user.email) {
      await ctx.reply('Сначала настройте email в настройках (/settings)');
      return;
    }

    await ctx.reply('🔍 Ищу подходящие вакансии...');

    try {
      // Get recommended vacancies
      let vacancies = [];

      // Check if user has HH.ru authorization
      if (!user.hh_access_token) {
        await ctx.reply(
          '⚠️ Для получения рекомендованных вакансий необходимо авторизоваться на HH.ru.\n\n' +
          'Используйте кнопку "🔑 Авторизоваться на HH.ru" в главном меню.'
        );
        return;
      }

      // Parse resume data
      const resumeData = user.resume ? (typeof user.resume === 'string' ? JSON.parse(user.resume) : user.resume) : null;

      if (resumeData?.hhId && user.hh_access_token) {
        // Get recommendations based on resume
        const recommendations = await this.hhApi.getRecommendedVacancies(resumeData.hhId, {
          accessToken: user.hh_access_token,
          limit: 20
        });
        vacancies = recommendations.items;
      } else {
        // Search by preferences
        const searchParams = {
          keywords: user.preferences?.keywords?.join(' ') || 'программист',
          area: user.preferences?.location || '1', // Moscow
          salary: user.preferences?.salary?.min,
          currency: user.preferences?.salary?.currency || 'RUR'
        };

        const searchResults = await this.hhApi.searchVacancies(searchParams);
        vacancies = searchResults.items;
      }

      if (vacancies.length === 0) {
        await ctx.reply('Вакансий не найдено. Попробуйте изменить настройки поиска.');
        return;
      }

      // Show first 5 vacancies
      for (let i = 0; i < Math.min(5, vacancies.length); i++) {
        const vacancy = vacancies[i];
        const keyboard = {
          inline_keyboard: [
            [
              { text: '📋 Подробнее', callback_data: `view_${vacancy.id}` },
              { text: '📤 Отправить', callback_data: `apply_${vacancy.id}` }
            ]
          ]
        };

        const vacancyText = `
🏢 *${vacancy.employer.name}*
💼 *${vacancy.name}*

💰 ${vacancy.salary ? `${vacancy.salary.from || 0} - ${vacancy.salary.to || 0} ${vacancy.salary.currency}` : 'з/п не указана'}
📍 ${vacancy.address?.city || 'Город не указан'}

📅 Опубликовано: ${new Date(vacancy.published_at).toLocaleDateString('ru-RU')}
🔗 [Посмотреть на HH.ru](${vacancy.url})
`;

        await ctx.replyWithMarkdown(vacancyText, {
          reply_markup: keyboard,
          disable_web_page_preview: true
        });
      }

      if (vacancies.length > 5) {
        await ctx.reply(`Показаны первые 5 из ${vacancies.length} вакансий.`);
      }

    } catch (error) {
      console.error('Error in search:', error);
      await ctx.reply('Произошла ошибка при поиске вакансий. Попробуйте позже.');
    }
  }

  /**
   * Handle status command
   */
  async handleStatus(ctx) {
    const user = await User.findByTelegramId(ctx.from.id.toString());

    if (!user) {
      await ctx.reply('Сначала выполните /start');
      return;
    }

    const applications = await JobApplication.find({ userId: user._id });

    const stats = {
      total: applications.length,
      applied: applications.filter(a => a.status === 'applied').length,
      responded: applications.filter(a => a.status === 'responded').length,
      pending: applications.filter(a => a.status === 'pending').length,
      error: applications.filter(a => a.status === 'error').length
    };

    const statusText = `
📊 *Ваша статистика:*

📤 *Всего отправлено:* ${stats.total}
✅ *Успешно отправлено:* ${stats.applied}
💬 *Получено ответов:* ${stats.responded}
⏳ *В обработке:* ${stats.pending}
❌ *Ошибки:* ${stats.error}

*Последняя активность:* ${user.statistics?.lastActivity ? new Date(user.statistics.lastActivity).toLocaleDateString('ru-RU') : 'нет'}
`;

    await ctx.replyWithMarkdown(statusText);
  }

  /**
   * Handle apply action
   */
  async handleApply(ctx, jobId) {
    const user = await User.findByTelegramId(ctx.from.id.toString());

    if (!user) {
      await ctx.reply('Пользователь не найден');
      return;
    }

    await ctx.reply('🔄 Обрабатываю вакансию...');

    try {
      // Get vacancy details
      const vacancy = await this.hhApi.getVacancyDetails(jobId);

      // Check if already applied
      const existingApplications = await JobApplication.findByUserId(user.id, { limit: 100 });
      const existingApplication = existingApplications.find(app => app.jobId === jobId);

      if (existingApplication) {
        await ctx.reply('Вы уже отправляли резюме на эту вакансию.');
        return;
      }

      // Create job application record
      const applicationData = await JobApplication.create({
        userId: user.id,
        jobId: jobId,
        company: {
          name: vacancy.employer.name,
          website: vacancy.employer.site_url,
          hhId: vacancy.employer.id
        },
        position: {
          title: vacancy.name,
          url: vacancy.alternate_url,
          salary: vacancy.salary,
          location: vacancy.address?.city,
          description: vacancy.description
        }
      });

      const application = await JobApplication.findById(applicationData.id);

      // Search for job on company website
      await ctx.reply('🔍 Ищу контакты компании...');
      const searchResults = await this.llmAgent.searchJobOnCompanyWebsite(vacancy);

      application.searchResults = {
        companyWebsite: vacancy.employer.site_url,
        contactMethod: searchResults.contactMethod,
        confidence: searchResults.confidence,
        searchLogs: searchResults.logs
      };

      if (searchResults.found && searchResults.contacts?.email) {
        // Send application email
        await ctx.reply('📧 Отправляю резюме...');

        // Get resume file path if exists
        const resumePath = user.resume?.filePath || null;

        const emailResult = await this.emailService.sendApplicationEmail({
          ...application.toJSON(),
          contacts: searchResults.contacts,
          resumePath: resumePath
        }, user);

        if (emailResult.success) {
          application.status = 'applied';
          application.applicationDetails = {
            emailSent: true,
            emailSubject: emailResult.subject,
            emailContent: user.templates?.coverLetter || '',
            sentAt: emailResult.sentAt
          };

          // Update user statistics
          const stats = user.statistics || {};
          stats.totalApplications = (stats.totalApplications || 0) + 1;
          stats.lastActivity = new Date().toISOString();
          user.statistics = stats;

          await application.save();
          await user.save();

          await ctx.reply('✅ Резюме успешно отправлено!');
        } else {
          application.status = 'error';
          application.applicationDetails = {
            emailSent: false,
            error: emailResult.error
          };
          await application.save();
          await ctx.reply('❌ Ошибка при отправке резюме: ' + emailResult.error);
        }
      } else {
        application.status = 'contact_found';
        await application.save();
        await ctx.reply('❓ Не удалось найти контакты для отправки. Вакансия сохранена для ручной обработки.');
      }

    } catch (error) {
      console.error('Error in apply:', error);
      await ctx.reply('Произошла ошибка при обработке вакансии.');
    }
  }

  /**
   * Handle view job action
   */
  async handleViewJob(ctx, jobId) {
    try {
      const vacancy = await this.hhApi.getVacancyDetails(jobId);

      const detailsText = `
🏢 *${vacancy.employer.name}*
💼 *${vacancy.name}*

💰 *Зарплата:* ${vacancy.salary ? `${vacancy.salary.from || 0} - ${vacancy.salary.to || 0} ${vacancy.salary.currency}` : 'не указана'}

📍 *Адрес:* ${vacancy.address ? `${vacancy.address.city}, ${vacancy.address.street}, ${vacancy.address.building}` : 'не указан'}

🕒 *График:* ${vacancy.schedule?.name || 'не указан'}
💼 *Тип занятости:* ${vacancy.employment?.name || 'не указан'}
👨‍💼 *Опыт:* ${vacancy.experience?.name || 'не указан'}

📋 *Описание:*
${vacancy.description ? vacancy.description.substring(0, 500) + '...' : 'Описание отсутствует'}

🔗 [Посмотреть полное описание](${vacancy.alternate_url})
`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📤 Отправить резюме', callback_data: `apply_${jobId}` }
          ],
          [
            { text: '⬅️ Назад', callback_data: 'back_to_search' }
          ]
        ]
      };

      await ctx.replyWithMarkdown(detailsText, {
        reply_markup: keyboard,
        disable_web_page_preview: true
      });

    } catch (error) {
      console.error('Error viewing job:', error);
      await ctx.reply('Ошибка при загрузке деталей вакансии.');
    }
  }

  /**
   * Handle input for settings
   */
  async handleInput(ctx, inputType, value) {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });

    if (!user) return;

    try {
      switch (inputType) {
        case 'keywords':
          user.preferences.keywords = value.split(',').map(k => k.trim());
          await ctx.reply('✅ Ключевые слова обновлены');
          break;

        case 'location':
          user.preferences.location = value;
          await ctx.reply('✅ Локация обновлена');
          break;

        case 'salary':
          const [min, max] = value.split('-').map(s => parseInt(s.trim()));
          user.preferences.salary = { min, max, currency: 'RUR' };
          await ctx.reply('✅ Зарплата обновлена');
          break;

        case 'email':
          user.email = value;
          await ctx.reply('✅ Email обновлен');
          break;

        case 'template':
          user.templates.coverLetter = value;
          await ctx.reply('✅ Шаблон письма обновлен');
          break;
      }

      await user.save();
      await this.handleSettings(ctx);

    } catch (error) {
      console.error('Error updating settings:', error);
      await ctx.reply('Ошибка при сохранении настроек');
    }
  }

  /**
   * Handle resume command
   */
  async handleResume(ctx) {
    const user = await User.findByTelegramId(ctx.from.id.toString());
    
    if (!user) {
      await ctx.reply('Сначала выполните /start');
      return;
    }

    if (user.resume) {
      const resumeData = typeof user.resume === 'string' ? JSON.parse(user.resume) : user.resume;
      await ctx.reply(
        `📄 Ваше резюме:\n\n` +
        `Название: ${resumeData.title || 'Не указано'}\n` +
        `ID на HH.ru: ${resumeData.hhId || 'Не указано'}\n\n` +
        `Для загрузки файла резюме отправьте файл PDF или DOCX.`
      );
    } else {
      await ctx.reply(
        '📄 Резюме не найдено.\n\n' +
        'Вы можете:\n' +
        '1. Авторизоваться на HH.ru для автоматической загрузки резюме\n' +
        '2. Отправить файл резюме (PDF или DOCX)'
      );
    }
  }

  /**
   * Start the bot
   */
  async start() {
    await this.bot.launch();
    console.log('Telegram bot started');
  }

  /**
   * Stop the bot
   */
  async stop() {
    await this.bot.stop();
    await this.llmAgent.closeBrowser();
    console.log('Telegram bot stopped');
  }
}

module.exports = TelegramBot;