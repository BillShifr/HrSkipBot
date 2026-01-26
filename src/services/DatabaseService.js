const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
  static db = null;

  static async connect(databaseUrl) {
    return new Promise((resolve, reject) => {
      try {
        // Parse database URL (format: sqlite:./database.sqlite or just ./database.sqlite)
        const dbPath = databaseUrl 
          ? databaseUrl.replace(/^sqlite:/, '')
          : './database.sqlite';

        const fullPath = path.resolve(process.cwd(), dbPath);

        // Open database connection
        this.db = new sqlite3.Database(fullPath, (err) => {
          if (err) {
            console.error('Failed to connect to SQLite:', err);
            reject(err);
            return;
          }

          console.log('Connected to SQLite successfully');
          console.log(`Database file: ${fullPath}`);

          // Initialize tables
          this.initializeTables()
            .then(() => resolve())
            .catch(reject);
        });

        // Handle connection errors
        this.db.on('error', (err) => {
          console.error('SQLite connection error:', err);
        });

      } catch (error) {
        console.error('Failed to connect to SQLite:', error);
        reject(error);
      }
    });
  }

  static async initializeTables() {
    return new Promise((resolve, reject) => {
      const tableQueries = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id TEXT UNIQUE NOT NULL,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          email TEXT,
          phone TEXT,
          resume TEXT,
          preferences TEXT DEFAULT '{}',
          templates TEXT DEFAULT '{}',
          settings TEXT DEFAULT '{}',
          statistics TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Job applications table
        `CREATE TABLE IF NOT EXISTS job_applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          job_id TEXT NOT NULL,
          company TEXT DEFAULT '{}',
          position TEXT DEFAULT '{}',
          status TEXT DEFAULT 'pending',
          search_results TEXT DEFAULT '{}',
          application_details TEXT DEFAULT '{}',
          metadata TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // Cached vacancies table
        `CREATE TABLE IF NOT EXISTS cached_vacancies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vacancy_id TEXT UNIQUE NOT NULL,
          data TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // User sessions table
        `CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER NOT NULL,
          session_data TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      const indexQueries = [
        // Indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)`,
        `CREATE INDEX IF NOT EXISTS idx_applications_user_id ON job_applications(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_applications_job_id ON job_applications(job_id)`,
        `CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status)`,
        `CREATE INDEX IF NOT EXISTS idx_cached_vacancies_expires ON cached_vacancies(expires_at)`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_telegram_id ON user_sessions(telegram_id)`
      ];

      // First create all tables sequentially
      let tableIndex = 0;
      const createNextTable = () => {
        if (tableIndex >= tableQueries.length) {
          // All tables created, now create indexes
          let indexIndex = 0;
          const createNextIndex = () => {
            if (indexIndex >= indexQueries.length) {
              console.log('All database tables and indexes initialized successfully');
              resolve();
              return;
            }
            this.db.run(indexQueries[indexIndex], (err) => {
              if (err) {
                console.error('Error creating index:', err);
                // Don't reject, indexes are optional
              }
              indexIndex++;
              createNextIndex();
            });
          };
          createNextIndex();
          return;
        }

        this.db.run(tableQueries[tableIndex], (err) => {
          if (err) {
            console.error('Error creating table:', err);
            reject(err);
            return;
          }
          tableIndex++;
          createNextTable();
        });
      };

      createNextTable();
    });
  }

  static async disconnect() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          console.error('Error disconnecting from SQLite:', err);
          reject(err);
          return;
        }
        console.log('Disconnected from SQLite');
        this.db = null;
        resolve();
      });
    });
  }

  static async healthCheck() {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({
          status: 'disconnected',
          isHealthy: false
        });
        return;
      }

      this.db.get('SELECT 1', (err) => {
        if (err) {
          resolve({
            status: 'error',
            isHealthy: false,
            error: err.message
          });
          return;
        }

        resolve({
          status: 'connected',
          isHealthy: true
        });
      });
    });
  }

  static getConnection() {
    return this.db;
  }

  // Helper methods for common operations
  static async getUserByTelegramId(telegramId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE telegram_id = ?',
        [telegramId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static async createUser(telegramId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO users (telegram_id) VALUES (?)',
        [telegramId],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, telegram_id: telegramId });
        }
      );
    });
  }

  static async updateUser(telegramId, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(telegramId);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
}

module.exports = DatabaseService;
