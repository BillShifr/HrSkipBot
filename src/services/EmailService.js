const nodemailer = require('nodemailer');

class EmailService {
  constructor(config) {
    this.config = config;
    this.transporter = nodemailer.createTransporter({
      host: config?.email?.host,
      port: config?.email?.port,
      secure: config?.email?.secure,
      auth: config?.email?.auth
    });
  }

  /**
   * Send application email
   * @param {Object} applicationData - Application data
   * @param {Object} user - User data
   * @returns {Promise<Object>} Send result
   */
  async sendApplicationEmail(applicationData, user) {
    try {
      // Prepare email content
      const subject = this.prepareSubject(applicationData, user);
      const htmlContent = this.prepareHtmlContent(applicationData, user);
      const textContent = this.prepareTextContent(applicationData, user);

      // Prepare attachments if any
      const attachments = this.prepareAttachments(applicationData);

      const mailOptions = {
        from: `"${user.firstName} ${user.lastName}" <${user.email}>`,
        to: applicationData.contacts.email,
        subject: subject,
        text: textContent,
        html: htmlContent,
        attachments: attachments,
        // Add reply-to to user's email
        replyTo: user.email
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        sentAt: new Date(),
        recipient: applicationData.contacts.email,
        subject: subject
      };

    } catch (error) {
      console.error('Error sending application email:', error);
      return {
        success: false,
        error: error.message,
        recipient: applicationData.contacts?.email
      };
    }
  }

  /**
   * Prepare email subject
   * @param {Object} applicationData - Application data
   * @param {Object} user - User data
   * @returns {string} Subject line
   */
  prepareSubject(applicationData, user) {
    let subject = user.templates?.emailSubject || 'Отклик на вакансию {{position}}';

    // Replace placeholders
    subject = subject.replace(/\{\{position\}\}/g, applicationData.position?.title || 'вакансию');
    subject = subject.replace(/\{\{name\}\}/g, `${user.firstName} ${user.lastName}`);
    subject = subject.replace(/\{\{company\}\}/g, applicationData.company?.name || '');

    return subject;
  }

  /**
   * Prepare HTML email content
   * @param {Object} applicationData - Application data
   * @param {Object} user - User data
   * @returns {string} HTML content
   */
  prepareHtmlContent(applicationData, user) {
    let template = user.templates?.coverLetter || this.getDefaultTemplate();

    // Replace placeholders
    template = template.replace(/\{\{position\}\}/g, applicationData.position?.title || 'вакансию');
    template = template.replace(/\{\{name\}\}/g, `${user.firstName} ${user.lastName}`);
    template = template.replace(/\{\{company\}\}/g, applicationData.company?.name || 'компании');
    template = template.replace(/\{\{email\}\}/g, user.email);
    template = template.replace(/\{\{phone\}\}/g, user.phone || '');

    // Convert line breaks to HTML
    template = template.replace(/\n/g, '<br>');

    // Wrap in basic HTML structure
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { margin-bottom: 20px; }
        .contact-info { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <p>Уважаемый работодатель,</p>
    </div>

    <div class="content">
        ${template}
    </div>

    <div class="contact-info">
        <p><strong>Контактная информация:</strong></p>
        <p>Имя: ${user.firstName} ${user.lastName}</p>
        <p>Email: ${user.email}</p>
        ${user.phone ? `<p>Телефон: ${user.phone}</p>` : ''}
    </div>
</body>
</html>`;
  }

  /**
   * Prepare text email content
   * @param {Object} applicationData - Application data
   * @param {Object} user - User data
   * @returns {string} Text content
   */
  prepareTextContent(applicationData, user) {
    let template = user.templates?.coverLetter || this.getDefaultTemplate();

    // Replace placeholders
    template = template.replace(/\{\{position\}\}/g, applicationData.position?.title || 'вакансию');
    template = template.replace(/\{\{name\}\}/g, `${user.firstName} ${user.lastName}`);
    template = template.replace(/\{\{company\}\}/g, applicationData.company?.name || 'компании');
    template = template.replace(/\{\{email\}\}/g, user.email);
    template = template.replace(/\{\{phone\}\}/g, user.phone || '');

    return `Уважаемый работодатель,

${template}

Контактная информация:
Имя: ${user.firstName} ${user.lastName}
Email: ${user.email}${user.phone ? `\nТелефон: ${user.phone}` : ''}`;
  }

  /**
   * Prepare attachments
   * @param {Object} applicationData - Application data
   * @returns {Array} Attachments array
   */
  prepareAttachments(applicationData) {
    const attachments = [];

    // If user has resume file, attach it
    if (applicationData.resumePath) {
      attachments.push({
        filename: 'resume.pdf',
        path: applicationData.resumePath
      });
    }

    return attachments;
  }

  /**
   * Get default cover letter template
   * @returns {string} Default template
   */
  getDefaultTemplate() {
    return `Меня заинтересовала вакансия {{position}} в вашей компании.

Мои навыки и опыт позволяют мне успешно выполнять поставленные задачи.
Буду рад обсудить возможности сотрудничества и внести свой вклад в развитие компании.

Готов предоставить дополнительную информацию и ответить на все интересующие вопросы.`;
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>} Verification result
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }

  /**
   * Send test email
   * @param {string} to - Recipient email
   * @returns {Promise<Object>} Send result
   */
  async sendTestEmail(to) {
    try {
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to: to,
        subject: 'Test Email from HR Skip Bot',
        text: 'This is a test email from HR Skip Bot.',
        html: '<p>This is a <strong>test email</strong> from HR Skip Bot.</p>'
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = EmailService;