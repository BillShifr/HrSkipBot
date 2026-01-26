const DatabaseService = require('../services/DatabaseService');

class JobApplication {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.jobId = data.job_id;
    this.company = data.company ? JSON.parse(data.company) : {};
    this.position = data.position ? JSON.parse(data.position) : {};
    this.status = data.status || 'pending';
    this.searchResults = data.search_results ? JSON.parse(data.search_results) : {};
    this.applicationDetails = data.application_details ? JSON.parse(data.application_details) : {};
    this.metadata = data.metadata ? JSON.parse(data.metadata) : {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const db = DatabaseService.getConnection();
      if (!db) {
        reject(new Error('Database not connected'));
        return;
      }

      db.get(
        'SELECT * FROM job_applications WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? new JobApplication(row) : null);
        }
      );
    });
  }

  static async findByUserId(userId, options = {}) {
    return new Promise((resolve, reject) => {
      const db = DatabaseService.getConnection();
      if (!db) {
        reject(new Error('Database not connected'));
        return;
      }

      let sql = 'SELECT * FROM job_applications WHERE user_id = ?';
      const params = [userId];

      if (options.status) {
        sql += ' AND status = ?';
        params.push(options.status);
      }

      if (options.limit) {
        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(options.limit);
      } else {
        sql += ' ORDER BY created_at DESC';
      }

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows.map(row => new JobApplication(row)));
      });
    });
  }

  static async findByJobId(jobId) {
    return new Promise((resolve, reject) => {
      const db = DatabaseService.getConnection();
      if (!db) {
        reject(new Error('Database not connected'));
        return;
      }

      db.get(
        'SELECT * FROM job_applications WHERE job_id = ?',
        [jobId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? new JobApplication(row) : null);
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

      const sql = `INSERT INTO job_applications (
        user_id, job_id, company, position, status,
        search_results, application_details, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        data.userId,
        data.jobId,
        data.company ? JSON.stringify(data.company) : JSON.stringify({}),
        data.position ? JSON.stringify(data.position) : JSON.stringify({}),
        data.status || 'pending',
        data.searchResults ? JSON.stringify(data.searchResults) : JSON.stringify({}),
        data.applicationDetails ? JSON.stringify(data.applicationDetails) : JSON.stringify({}),
        data.metadata ? JSON.stringify(data.metadata) : JSON.stringify({ source: 'hh.ru', priority: 1 })
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

      const sql = `UPDATE job_applications SET
        company = ?, position = ?, status = ?,
        search_results = ?, application_details = ?, metadata = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;

      const values = [
        JSON.stringify(this.company),
        JSON.stringify(this.position),
        this.status,
        JSON.stringify(this.searchResults),
        JSON.stringify(this.applicationDetails),
        JSON.stringify(this.metadata),
        this.id
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
      userId: this.userId,
      jobId: this.jobId,
      company: this.company,
      position: this.position,
      status: this.status,
      searchResults: this.searchResults,
      applicationDetails: this.applicationDetails,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = JobApplication;
