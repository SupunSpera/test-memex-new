const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const { web3Service } = require('../services/web3Service');
const Token = require('../models/Token');

const router = express.Router();

// Middleware to validate request
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/tokens - Get all tokens with filtering and pagination
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
    query('phase').optional().isIn(['0', '1', '2']).withMessage('Invalid phase'),
    query('sortBy').optional().isIn(['createdAt', 'volume24h', 'marketCap', 'totalETHCollected']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    query('isFeatured').optional().isBoolean().withMessage('isFeatured must be boolean'),
    query('isFinalized').optional().isBoolean().withMessage('isFinalized must be boolean')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

      // Build filter
      const filter = {};
      if (req.query.phase !== undefined) {
        filter.currentPhase = parseInt(req.query.phase);
      }
      if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === 'true';
      }
      if (req.query.isFeatured !== undefined) {
        filter.isFeatured = req.query.isFeatured === 'true';
      }
      if (req.query.isFinalized !== undefined) {
        filter.isFinalized = req.query.isFinalized === 'true';
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder;

      const [tokens, total] = await Promise.all([
        Token.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Token.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          tokens,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          },
          filters: {
            phase: req.query.phase,
            isActive: req.query.isActive,
            isFeatured: req.query.isFeatured,
            isFinalized: req.query.isFinalized
          },
          sorting: {
            sortBy,
            sortOrder: req.query.sortOrder || 'desc'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tokens/:address - Get specific token details
router.get('/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid token address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      
      const token = await Token.findByAddress(address);
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Get live blockchain data
      const [bondingCurveInfo, tokenInfo] = await Promise.all([
        web3Service.getBondingCurveInfo(token.bondingCurveAddress),
        web3Service.getTokenInfo(token.tokenAddress)
      ]);

      // Update token with latest data
      await token.updateTradingStats({
        totalETHCollected: bondingCurveInfo.totalETHCollected,
        ethReserve: bondingCurveInfo.ethReserve,
        tokenReserve: bondingCurveInfo.tokenReserve,
        currentPhase: bondingCurveInfo.currentPhase,
        isFinalized: bondingCurveInfo.isFinalized
      });

      res.json({
        success: true,
        data: {
          token,
          bondingCurve: bondingCurveInfo,
          tokenInfo,
          addresses: {
            token: token.tokenAddress,
            bondingCurve: token.bondingCurveAddress,
            factory: process.env.FACTORY_ADDRESS
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tokens/:address/stats - Get token trading statistics
router.get('/:address/stats',
  [
    param('address').isEthereumAddress().withMessage('Invalid token address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      
      const token = await Token.findByAddress(address);
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      const bondingCurveInfo = await web3Service.getBondingCurveInfo(token.bondingCurveAddress);

      const stats = {
        currentPhase: bondingCurveInfo.currentPhase,
        isFinalized: bondingCurveInfo.isFinalized,
        totalETHCollected: bondingCurveInfo.totalETHCollected,
        ethReserve: bondingCurveInfo.ethReserve,
        tokenReserve: bondingCurveInfo.tokenReserve,
        totalPreBondingContributions: bondingCurveInfo.totalPreBondingContributions,
        progressPercentage: token.progressPercentage,
        settings: bondingCurveInfo.settings,
        // Database stats
        volume24h: token.volume24h,
        marketCap: token.marketCap,
        currentPrice: token.currentPrice,
        priceChange24h: token.priceChange24h,
        totalTrades: token.totalTrades,
        uniqueTraders: token.uniqueTraders
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tokens/:address/holders - Get token holder information
router.get('/:address/holders',
  [
    param('address').isEthereumAddress().withMessage('Invalid token address'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      
      const token = await Token.findByAddress(address);
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Note: In a full implementation, you'd track holders in a separate collection
      // or query the blockchain for Transfer events. For now, return basic info.
      
      res.json({
        success: true,
        data: {
          message: 'Holder information would be implemented with event tracking',
          tokenAddress: token.tokenAddress,
          totalSupply: '10000000000', // 10B tokens
          // In real implementation, you'd have:
          // holders: [...], // Array of holder addresses and balances
          // holderCount: number,
          // topHolders: [...] // Top holders by balance
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tokens/:address/price-history - Get token price history
router.get('/:address/price-history',
  [
    param('address').isEthereumAddress().withMessage('Invalid token address'),
    query('period').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('Invalid period'),
    query('interval').optional().isIn(['1m', '5m', '15m', '1h', '1d']).withMessage('Invalid interval')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const period = req.query.period || '24h';
      const interval = req.query.interval || '1h';
      
      const token = await Token.findByAddress(address);
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Note: In a full implementation, you'd store price data in a time series
      // collection and return historical price data. For now, return current data.
      
      res.json({
        success: true,
        data: {
          message: 'Price history would be implemented with time series data',
          currentPrice: token.currentPrice,
          priceChange24h: token.priceChange24h,
          period,
          interval,
          // In real implementation:
          // priceData: [...] // Array of {timestamp, price, volume} objects
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tokens/trending - Get trending tokens
router.get('/trending',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50'),
    query('period').optional().isIn(['1h', '24h', '7d']).withMessage('Invalid period')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const period = req.query.period || '24h';

      // Get trending tokens based on volume and price change
      const trendingTokens = await Token.find({ isActive: true })
        .sort({ 
          volume24h: -1, 
          priceChange24h: -1,
          totalTrades: -1 
        })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: {
          tokens: trendingTokens,
          period,
          criteria: 'volume24h, priceChange24h, totalTrades'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tokens/gainers - Get top gainers
router.get('/gainers',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const gainers = await Token.find({ 
        isActive: true,
        priceChange24h: { $gt: '0' }
      })
        .sort({ priceChange24h: -1 })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: gainers
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tokens/losers - Get top losers
router.get('/losers',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const losers = await Token.find({ 
        isActive: true,
        priceChange24h: { $lt: '0' }
      })
        .sort({ priceChange24h: 1 })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: losers
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tokens/new - Get newest tokens
router.get('/new',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50'),
    query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Hours must be between 1-168')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const hours = parseInt(req.query.hours) || 24;

      const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      const newTokens = await Token.find({ 
        isActive: true,
        createdAt: { $gte: sinceDate }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: {
          tokens: newTokens,
          period: `${hours} hours`,
          count: newTokens.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 