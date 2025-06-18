const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  // Token basic information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  symbol: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 20
  },
  
  // Contract addresses
  tokenAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  bondingCurveAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  
  // Owner information
  owner: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  
  // Deployment information
  deploymentTxHash: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  deploymentBlockNumber: {
    type: Number,
    required: true
  },
  deploymentFee: {
    type: String,
    required: true
  },
  
  // Token metadata
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  twitter: {
    type: String,
    default: ''
  },
  telegram: {
    type: String,
    default: ''
  },
  discord: {
    type: String,
    default: ''
  },
  
  // Bonding curve status
  currentPhase: {
    type: Number,
    enum: [0, 1], // 0: Bonding, 1: Finalized
    default: 0
  },
  isFinalized: {
    type: Boolean,
    default: false
  },
  
  // Trading statistics
  totalETHCollected: {
    type: String,
    default: '0'
  },
  ethReserve: {
    type: String,
    default: '0'
  },
  tokenReserve: {
    type: String,
    default: '0'
  },
  
  // Pricing data
  currentPrice: {
    type: String,
    default: '0'
  },
  priceChange24h: {
    type: String,
    default: '0'
  },
  volume24h: {
    type: String,
    default: '0'
  },
  marketCap: {
    type: String,
    default: '0'
  },
  
  // LP information (when finalized)
  uniswapPool: {
    type: String,
    default: '',
    lowercase: true
  },
  lpTokenId: {
    type: String,
    default: ''
  },
  
  // Activity metrics
  totalTrades: {
    type: Number,
    default: 0
  },
  uniqueTraders: {
    type: Number,
    default: 0
  },
  
  // Status and visibility
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // Admin notes
  adminNotes: {
    type: String,
    default: ''
  },
  
  // Last update timestamp
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
tokenSchema.index({ tokenAddress: 1 });
tokenSchema.index({ bondingCurveAddress: 1 });
tokenSchema.index({ owner: 1 });
tokenSchema.index({ currentPhase: 1 });
tokenSchema.index({ isFinalized: 1 });
tokenSchema.index({ isActive: 1 });
tokenSchema.index({ isFeatured: 1 });
tokenSchema.index({ createdAt: -1 });
tokenSchema.index({ volume24h: -1 });
tokenSchema.index({ marketCap: -1 });
tokenSchema.index({ symbol: 'text', name: 'text', description: 'text' });

// Virtual for progress percentage
tokenSchema.virtual('progressPercentage').get(function() {
  if (this.currentPhase === 0) {
    // PreBonding phase
    const target = parseFloat(this.settings?.preBondingTarget || '1');
    const current = parseFloat(this.totalPreBondingContributions || '0');
    return Math.min((current / target) * 100, 100);
  } else if (this.currentPhase === 1) {
    // Bonding phase
    const target = parseFloat(this.settings?.bondingTarget || '30');
    const current = parseFloat(this.totalETHCollected || '0');
    return Math.min((current / target) * 100, 100);
  }
  return 100; // Finalized
});

// Methods
tokenSchema.methods.updateTradingStats = async function(newStats) {
  this.totalETHCollected = newStats.totalETHCollected || this.totalETHCollected;
  this.ethReserve = newStats.ethReserve || this.ethReserve;
  this.tokenReserve = newStats.tokenReserve || this.tokenReserve;
  this.currentPhase = newStats.currentPhase !== undefined ? newStats.currentPhase : this.currentPhase;
  this.isFinalized = newStats.isFinalized !== undefined ? newStats.isFinalized : this.isFinalized;
  this.currentPrice = newStats.currentPrice || this.currentPrice;
  this.volume24h = newStats.volume24h || this.volume24h;
  this.marketCap = newStats.marketCap || this.marketCap;
  this.lastUpdated = new Date();
  
  return this.save();
};

// Static methods
tokenSchema.statics.findByAddress = function(address) {
  return this.findOne({
    $or: [
      { tokenAddress: address.toLowerCase() },
      { bondingCurveAddress: address.toLowerCase() }
    ]
  });
};

tokenSchema.statics.findByOwner = function(ownerAddress) {
  return this.find({ owner: ownerAddress.toLowerCase() });
};

tokenSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

tokenSchema.statics.findFeatured = function() {
  return this.find({ isFeatured: true, isActive: true });
};

tokenSchema.statics.findByPhase = function(phase) {
  return this.find({ currentPhase: phase, isActive: true });
};

module.exports = mongoose.model('Token', tokenSchema); 