const OpenAI = require('openai');
const puppeteer = require('puppeteer');

class LlmAgent {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config?.openai?.apiKey
    });
    this.browser = null;
  }

  /**
   * Initialize browser instance
   */
  async initializeBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Search for job posting on company website
   * @param {Object} jobData - Job data from HH.ru
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchJobOnCompanyWebsite(jobData, searchParams = {}) {
    try {
      await this.initializeBrowser();

      const page = await this.browser.newPage();
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const results = {
        found: false,
        url: null,
        contactMethod: null,
        confidence: 0,
        contacts: null,
        logs: []
      };

      // Try company website first
      if (jobData.employer?.site_url) {
        results.logs.push({
          timestamp: new Date(),
          action: 'visiting_company_website',
          result: `Visiting ${jobData.employer.site_url}`
        });

        try {
          await page.goto(jobData.employer.site_url, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });

          // Search for careers/jobs section
          const jobSearchResult = await this.searchForJobSection(page, jobData);
          if (jobSearchResult.found) {
            Object.assign(results, jobSearchResult);
          }
        } catch (error) {
          results.logs.push({
            timestamp: new Date(),
            action: 'error_visiting_website',
            error: error.message
          });
        }
      }

      // If not found, try general search
      if (!results.found) {
        const generalSearchResult = await this.performGeneralJobSearch(jobData, searchParams);
        if (generalSearchResult.found) {
          Object.assign(results, generalSearchResult);
        }
      }

      await page.close();
      return results;

    } catch (error) {
      console.error('Error in job search:', error);
      return {
        found: false,
        error: error.message,
        logs: [{
          timestamp: new Date(),
          action: 'error',
          error: error.message
        }]
      };
    }
  }

  /**
   * Search for job section on company page
   * @param {Page} page - Puppeteer page
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Search results
   */
  async searchForJobSection(page, jobData) {
    try {
      // Get page content
      const content = await page.evaluate(() => {
        const getTextContent = (element) => {
          return element.textContent || element.innerText || '';
        };

        return {
          title: document.title,
          body: getTextContent(document.body),
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: getTextContent(a),
            href: a.href
          }))
        };
      });

      // Use LLM to analyze page and find job-related links
      const analysis = await this.analyzePageContent(content, jobData);

      if (analysis.jobSectionFound) {
        // Visit job section
        const jobPage = await this.browser.newPage();
        await jobPage.goto(analysis.jobSectionUrl, { waitUntil: 'networkidle2' });

        // Analyze job page for contacts
        const contactAnalysis = await this.analyzeJobPage(jobPage, jobData);

        await jobPage.close();

        return {
          found: true,
          url: analysis.jobSectionUrl,
          contactMethod: contactAnalysis.contactMethod,
          confidence: contactAnalysis.confidence,
          contacts: contactAnalysis.contacts,
          logs: [{
            timestamp: new Date(),
            action: 'job_section_found',
            result: `Found job section at ${analysis.jobSectionUrl}`
          }]
        };
      }

      return { found: false };

    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze page content with LLM
   * @param {Object} content - Page content
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Analysis results
   */
  async analyzePageContent(content, jobData) {
    try {
      const prompt = `
Анализируй содержимое веб-страницы компании и найди раздел с вакансиями.

Компания: ${jobData.employer?.name || 'Unknown'}
Вакансия: ${jobData.name || 'Unknown'}

Содержимое страницы:
Заголовок: ${content.title}

Ссылки на странице:
${content.links.slice(0, 50).map(link => `- ${link.text}: ${link.href}`).join('\n')}

Текст страницы (первые 2000 символов):
${content.body.substring(0, 2000)}

Задачи:
1. Найди ссылки на раздел "Карьера", "Вакансии", "Работа", "Jobs", "Careers"
2. Определи, есть ли на странице информация о вакансиях
3. Если найден раздел вакансий, верни URL

Ответь в формате JSON:
{
  "jobSectionFound": boolean,
  "jobSectionUrl": "string или null",
  "confidence": number (0-100),
  "reasoning": "string"
}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;

    } catch (error) {
      console.error('Error analyzing page content:', error);
      return {
        jobSectionFound: false,
        jobSectionUrl: null,
        confidence: 0,
        reasoning: error.message
      };
    }
  }

  /**
   * Analyze job page for contact information
   * @param {Page} page - Puppeteer page
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Contact analysis
   */
  async analyzeJobPage(page, jobData) {
    try {
      // Get page content
      const content = await page.evaluate(() => {
        const getTextContent = (element) => {
          return element.textContent || element.innerText || '';
        };

        // Find forms
        const forms = Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
            name: input.name,
            type: input.type,
            placeholder: input.placeholder,
            value: input.value
          }))
        }));

        // Find contact information
        const text = getTextContent(document.body);
        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const phones = text.match(/\+?\d[\d\s\-\(\)]{7,}/g) || [];

        return {
          title: document.title,
          text: text,
          forms: forms,
          emails: [...new Set(emails)],
          phones: [...new Set(phones)],
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: getTextContent(a),
            href: a.href
          }))
        };
      });

      // Use LLM to analyze contact information
      const contactAnalysis = await this.analyzeContactInfo(content, jobData);

      return contactAnalysis;

    } catch (error) {
      return {
        contactMethod: null,
        confidence: 0,
        contacts: null,
        error: error.message
      };
    }
  }

  /**
   * Analyze contact information with LLM
   * @param {Object} content - Page content
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Contact analysis
   */
  async analyzeContactInfo(content, jobData) {
    try {
      const prompt = `
Анализируй страницу вакансий и найди способы связи для подачи резюме.

Вакансия: ${jobData.name || 'Unknown'}
Компания: ${jobData.employer?.name || 'Unknown'}

Содержимое страницы:
Заголовок: ${content.title}

Формы на странице:
${content.forms.map((form, i) => `
Форма ${i + 1}:
- Action: ${form.action}
- Method: ${form.method}
- Поля: ${form.inputs.map(input => `${input.name} (${input.type})`).join(', ')}
`).join('\n')}

Найденные email: ${content.emails.join(', ')}
Найденные телефоны: ${content.phones.join(', ')}

Ссылки (первые 30):
${content.links.slice(0, 30).map(link => `- ${link.text}: ${link.href}`).join('\n')}

Текст страницы (первые 1500 символов):
${content.text.substring(0, 1500)}

Определи:
1. Предпочтительный способ подачи резюме (email, форма, телефон)
2. Контактную информацию
3. Уверенность в правильности определения (0-100)

Ответь в формате JSON:
{
  "contactMethod": "email|form|phone|unknown",
  "confidence": number,
  "contacts": {
    "email": "string или null",
    "phone": "string или null",
    "formUrl": "string или null"
  },
  "reasoning": "string"
}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 800
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;

    } catch (error) {
      console.error('Error analyzing contact info:', error);
      return {
        contactMethod: 'unknown',
        confidence: 0,
        contacts: null,
        reasoning: error.message
      };
    }
  }

  /**
   * Perform general job search
   * @param {Object} jobData - Job data
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async performGeneralJobSearch(jobData, searchParams) {
    // This would implement search across multiple job boards
    // For now, return not found
    return {
      found: false,
      logs: [{
        timestamp: new Date(),
        action: 'general_search',
        result: 'General search not implemented yet'
      }]
    };
  }

  /**
   * Extract and validate contact information
   * @param {string} text - Text to analyze
   * @returns {Object} Extracted contacts
   */
  extractContacts(text) {
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const phones = text.match(/\+?\d[\d\s\-\(\)]{7,}/g) || [];

    return {
      emails: [...new Set(emails)],
      phones: [...new Set(phones)]
    };
  }
}

module.exports = LlmAgent;