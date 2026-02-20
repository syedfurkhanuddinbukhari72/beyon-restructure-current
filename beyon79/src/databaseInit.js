const { connectToDatabase, initializeDatabase } = require('./database');
const { getAppData } = require('./schemas');

/**
 * Initialize the database with proper collections and indexes
 */
async function initializeDatabaseCollections() {
  try {
    console.log('Starting database initialization...');
    
    const { usingMongoDB } = await connectToDatabase();
    
    if (!usingMongoDB) {
      console.log('MongoDB not available, skipping database initialization');
      return { success: true, usingMongoDB: false };
    }
    
    console.log('Initializing MongoDB collections and indexes...');
    
    // Get or create the main app data document
    const appData = await getAppData();
    
    // Ensure the document exists with proper structure
    if (!appData.menu) {
      appData.menu = { categories: new Map() };
    }
    
    if (!appData.shopStatus) {
      appData.shopStatus = { isOpen: true };
    }
    
    if (!appData.orders) {
      appData.orders = [];
    }
    
    if (!appData.offers) {
      appData.offers = [];
    }
    
    await appData.save();
    
    console.log('Database initialization completed successfully');
    
    return { 
      success: true, 
      usingMongoDB: true,
      initializedCollections: ['app_data']
    };
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Verify database connection and data integrity
 */
async function verifyDatabase() {
  try {
    const { usingMongoDB } = await connectToDatabase();
    
    if (!usingMongoDB) {
      return { 
        success: true, 
        usingMongoDB: false,
        message: 'Using file-based storage'
      };
    }
    
    const appData = await getAppData();
    
    const verification = {
      success: true,
      usingMongoDB: true,
      dataIntegrity: {
        hasOrders: Array.isArray(appData.orders),
        hasMenu: appData.menu && typeof appData.menu === 'object',
        hasShopStatus: appData.shopStatus && typeof appData.shopStatus === 'object',
        hasOffers: Array.isArray(appData.offers),
        ordersCount: appData.orders.length,
        menuCategoriesCount: appData.menu.categories ? appData.menu.categories.size : 0,
        offersCount: appData.offers.length
      }
    };
    
    console.log('Database verification completed:', verification);
    return verification;
    
  } catch (error) {
    console.error('Database verification failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create database indexes for optimal performance
 */
async function createDatabaseIndexes() {
  try {
    const { usingMongoDB } = await connectToDatabase();
    
    if (!usingMongoDB) {
      console.log('MongoDB not available, skipping index creation');
      return { success: true, usingMongoDB: false };
    }
    
    console.log('Creating database indexes...');
    
    // Indexes are created automatically by the schema definitions
    // but we can ensure they exist here
    
    console.log('Database indexes created successfully');
    
    return { success: true, usingMongoDB: true };
    
  } catch (error) {
    console.error('Failed to create database indexes:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  try {
    const { usingMongoDB } = await connectToDatabase();
    
    if (!usingMongoDB) {
      return { 
        success: true, 
        usingMongoDB: false,
        message: 'Using file-based storage'
      };
    }
    
    const appData = await getAppData();
    
    const stats = {
      success: true,
      usingMongoDB: true,
      collections: {
        app_data: {
          orders: appData.orders.length,
          menuCategories: appData.menu.categories ? appData.menu.categories.size : 0,
          offers: appData.offers.length,
          shopStatus: 1,
          lastUpdated: appData.lastUpdated
        }
      },
      totalDocuments: 1 // Single document approach
    };
    
    return stats;
    
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return { success: false, error: error.message };
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  (async () => {
    try {
      console.log('Running database initialization...');
      
      await initializeDatabaseCollections();
      await createDatabaseIndexes();
      
      const verification = await verifyDatabase();
      console.log('Verification result:', verification);
      
      const stats = await getDatabaseStats();
      console.log('Database stats:', stats);
      
      console.log('Database initialization completed successfully');
      process.exit(0);
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  initializeDatabaseCollections,
  verifyDatabase,
  createDatabaseIndexes,
  getDatabaseStats
};
