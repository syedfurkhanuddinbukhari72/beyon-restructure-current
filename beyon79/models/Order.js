import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    customerNumber: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/
    },
    items: {
      type: [
        {
          name: { type: String, required: true },
          price: { type: Number, required: true, min: 0 },
          quantity: { type: Number, required: true, min: 1 }
        }
      ],
      validate: [(val) => val.length > 0, 'Order must have at least one item']
    },
    total: { type: Number, required: true, min: 0 },
    note: { type: String },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'ready', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true }
);


// Always recalc total before saving
orderSchema.pre('save', function(next) {
  this.total = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  next();
});

// Recalc total on findOneAndUpdate
orderSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && update.items) {
    const total = update.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    this.set({ total });
  }
  next();
});

// Virtual for itemCount
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Indexes for performance
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerNumber: 1 });

export default mongoose.models.Order || mongoose.model('Order', orderSchema);
