const DatabaseService = require('../services/DatabaseService');

class User {
  constructor(data) {
    this.id = data.id;
    this.telegramId = data.telegram_id;
    this.username = data.username;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.email = data.email;
    this.phone = data.phone;
    this.resume = data.resume ? JSON.parse(data.resume) : null;
    this.preferences = data.preferences ? JSON.parse(data.preferences) : {};
    this.templates = data.templates ? JSON.parse(data.templates) : {};
    this.settings = data.settings ? JSON.parse(data.settings) : {};
    this.statistics = data.statistics ? JSON.parse(data.statistics) : {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async findByTelegramId(telegramId) {
    return new Promise((resolve, reject) => {
      const db = DatabaseService.getConnection();
      if (!db) {
        reject(new Error('Database not connected'));
        return;
      }

      db.get(
        'SELECT * FROM users WHERE telegram_id = ?',
        [telegramId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? new User(row) : null);
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = DatabaseService.getConnection();
      if (!db) {
        reject(new Error('Database not connected'));
        return;
      }

      db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? new User(row) : null);
        }
      );
    });
  }

  static async create(data) {
    return new Promise((resolve, reject) => {
      const db = DatabaseService.getConnection();
      if (!db) {
        reject(new Error('Database not connected'));
        return;
      }

      const sql = `INSERT INTO users (
        telegram_id, username, first_name, last_name, email, phone,
        resume, preferences, templates, settings, statistics
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        data.telegramId,
        data.username || null,
        data.firstName || null,
        data.lastName || null,
        data.email || null,
        data.phone || null,
        data.resume ? JSON.stringify(data.resume) : null,
        data.preferences ? JSON.stringify(data.preferences) : JSON.stringify({}),
        data.templates ? JSON.stringify(data.templates) : JSON.stringify({
          coverLetter: `Уважаемый работодатель,\n\nМеня заинтересовала вакансия {{position}} в вашей компании.\n\nМои навыки и опыт позволяют мне успешно выполнять поставленные задачи.\nБуду рад обсудить возможности сотрудничества.\n\nС уважением,\n{{name}}`,
          emailSubject: 'Отклик на вакансию {{position}}'
        }),
        data.settings ? JSON.stringify(data.settings) : JSON.stringify({
          autoApply: false,
          notifications: true,
          maxApplicationsPerDay: 5
        }),
        data.statistics ? JSON.stringify(data.statistics) : JSON.stringify({
          totalApplications: 0,
          successfulApplications: 0
        })
      ];

      db.run(sql, values, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ id: this.lastID, ...data });
      });
    });
  }

  async save() {
    return new Promise((resolve, reject) => {
      const db = DatabaseService.getConnection();
      if (!db) {
        reject(new Error('Database not connected'));
        return;
      }

      const sql = `UPDATE users SET
        username = ?, first_name = ?, last_name = ?, email = ?, phone = ?,
        resume = ?, preferences = ?, templates = ?, settings = ?, statistics = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id = ?`;

      const values = [
        this.username,
        this.firstName,
        this.lastName,
        this.email,
        this.phone,
        this.resume ? JSON.stringify(this.resume) : null,
        JSON.stringify(this.preferences),
        JSON.stringify(this.templates),
        JSON.stringify(this.settings),
        JSON.stringify(this.statistics),
        this.telegramId
      ];

      db.run(sql, values, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(this);
      });
    });
  }

  toJSON() {
    return {
      id: this.id,
      telegramId: this.telegramId,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      resume: this.resume,
      preferences: this.preferences,
      templates: this.templates,
      settings: this.settings,
      statistics: this.statistics,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = User;
