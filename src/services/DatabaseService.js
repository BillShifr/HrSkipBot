const mongoose = require('mongoose');

class DatabaseService {
  static async connect(mongoUri) {
    try {
      const mongoURI = mongoUri || 'mongodb://localhost:27017/hrskipbot';

      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log('Connected to MongoDB successfully');

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  static async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }

  static async healthCheck() {
    try {
      const dbState = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      return {
        status: states[dbState] || 'unknown',
        isHealthy: dbState === 1
      };
    } catch (error) {
      return {
        status: 'error',
        isHealthy: false,
        error: error.message
      };
    }
  }

  static getConnection() {
    return mongoose.connection;
  }
}

module.exports = DatabaseService;