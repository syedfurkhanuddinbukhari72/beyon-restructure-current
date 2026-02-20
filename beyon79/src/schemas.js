const mongoose = require('mongoose');

// =============================================================================
// ORDER SCHEMA
// =============================================================================

const OrderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  qty: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  isOfferReward: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    isOfferReward: {
      type: Boolean,
      default: false
    }
  }],
  note: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'ready', 'paid', 'cancelled', 'completed'],
    default: 'pending'
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    required: true,
    enum: ['local', 'backend'],
    default: 'local'
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true,
  _id: false
});

// Indexes for better query performance
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ source: 1 });
OrderSchema.index({ 'items.name': 1 });

// =============================================================================
// MENU SCHEMA
// =============================================================================

const MenuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  inStock: {
    type: Boolean,
    default: true
  },
  image: {
    type: String,
    trim: true
  },
  isChicken: {
    type: Boolean,
    default: false
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  manualOverride: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const MenuCategorySchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  items: [MenuItemSchema]
}, { _id: false });

const MenuSchema = new mongoose.Schema({
  categories: {
    type: Map,
    of: [MenuItemSchema],
    default: new Map()
  }
}, { _id: false });

// =============================================================================
// SHOP STATUS SCHEMA
// =============================================================================

const ShopStatusSchema = new mongoose.Schema({
  isOpen: {
    type: Boolean,
    required: true,
    default: true
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

// =============================================================================
// OFFERS SCHEMA
// =============================================================================

const OfferMatchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const OfferBaseSchema = new mongoose.Schema({
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  match: OfferMatchSchema,
  rewardPrice: {
    type: Number,
    min: 0
  }
}, { _id: false });

const OfferRewardItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isOfferReward: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const OfferRewardSchema = new mongoose.Schema({
  items: [OfferRewardItemSchema]
}, { _id: false });

const OfferSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  active: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    required: true,
    enum: ['buy_x_get_y', 'discount', 'bundle']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  base: OfferBaseSchema,
  reward: OfferRewardSchema,
  limitPerOrder: {
    type: Number,
    min: 0
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true,
  _id: false
});

// Indexes for offers
OfferSchema.index({ active: 1 });
OfferSchema.index({ type: 1 });

// =============================================================================
// MAIN DATA SCHEMA (Single Document Approach)
// =============================================================================

const AppDataSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    default: 'app_data'
  },
  orders: [OrderSchema],
  menu: MenuSchema,
  shopStatus: ShopStatusSchema,
  offers: [OfferSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create models
const AppData = mongoose.model('AppData', AppDataSchema);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get or create the main app data document
 */
async function getAppData() {
  let appData = await AppData.findById('app_data');
  
  if (!appData) {
    appData = new AppData({
      _id: 'app_data',
      orders: [],
      menu: { categories: new Map() },
      shopStatus: { isOpen: true },
      offers: []
    });
    await appData.save();
  }
  
  return appData;
}

/**
 * Update the lastModified timestamp
 */
AppDataSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  AppData,
  OrderSchema,
  MenuSchema,
  ShopStatusSchema,
  OfferSchema,
  MenuItemSchema,
  getAppData
};
