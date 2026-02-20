const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Database configuration
const DB_CONFIG = {
  // For Electron desktop app, use local MongoDB instance
  // Fallback to memory-based file storage if MongoDB is not available
  connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017/beyon_admin',
  dbName: 'beyon_admin',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false,
  }
};

let connection = null;
let isConnected = false;
let connectionPromise = null;

/**
 * Get the local data directory for fallback storage
 */
function getLocalDataDir() {
  const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
  let dataDir;
  
  if (isElectron) {
    // In Electron, use app data directory
    const { app } = require('electron');
    dataDir = path.join(app.getPath('userData'), 'data');
  } else {
    // In browser/development, use local data directory
    dataDir = path.join(process.cwd(), 'beyon79', 'data');
  }
  
  // Ensure directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  return dataDir;
}

/**
 * Check if MongoDB is available and running
 */
async function checkMongoDBAvailability() {
  try {
    // Try to connect with a short timeout
    const testConnection = mongoose.createConnection(DB_CONFIG.connectionString, {
      ...DB_CONFIG.options,
      serverSelectionTimeoutMS: 2000,
    });
    
    await new Promise((resolve, reject) => {
      testConnection.once('connected', resolve);
      testConnection.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 3000);
    });
    
    await testConnection.close();
    return true;
  } catch (error) {
    console.warn('MongoDB not available:', error.message);
    return false;
  }
}

/**
 * Connect to MongoDB with fallback to file-based storage
 */
async function connectToDatabase() {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      // First check if MongoDB is available
      const mongoAvailable = await checkMongoDBAvailability();
      
      if (mongoAvailable) {
        console.log('Connecting to MongoDB...');
        connection = await mongoose.connect(DB_CONFIG.connectionString, DB_CONFIG.options);
        
        isConnected = true;
        console.log('Connected to MongoDB successfully');
        
        // Set up connection event handlers
        mongoose.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
          isConnected = false;
        });
        
        mongoose.connection.on('disconnected', () => {
          console.warn('MongoDB disconnected');
          isConnected = false;
        });
        
        mongoose.connection.on('reconnected', () => {
          console.log('MongoDB reconnected');
          isConnected = true;
        });
        
        return { connected: true, usingMongoDB: true };
      } else {
        console.log('MongoDB not available, using file-based storage fallback');
        return { connected: true, usingMongoDB: false };
      }
    } catch (error) {
      console.error('Failed to connect to MongoDB, falling back to file storage:', error);
      return { connected: true, usingMongoDB: false };
    }
  })();

  return connectionPromise;
}

/**
 * Get current connection status
 */
function getConnectionStatus() {
  return {
    isConnected,
    usingMongoDB: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState
  };
}

/**
 * Disconnect from database
 */
async function disconnectFromDatabase() {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    isConnected = false;
    connection = null;
    connectionPromise = null;
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
}

/**
 * Initialize database with default data if needed
 */
async function initializeDatabase() {
  try {
    const { usingMongoDB } = await connectToDatabase();
    
    if (usingMongoDB) {
      console.log('Initializing MongoDB collections...');
      
      // Create collections with validation schemas will be handled by models
      console.log('MongoDB initialization completed');
    } else {
      console.log('Using file-based storage, no database initialization needed');
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown() {
  console.log('Shutting down database connection...');
  await disconnectFromDatabase();
  process.exit(0);
}

// Register graceful shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGUSR2', gracefulShutdown); // For nodemon restart
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  getConnectionStatus,
  initializeDatabase,
  getLocalDataDir,
  DB_CONFIG
};
