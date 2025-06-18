const express = require('express');
const { query, validationResult } = require('express-validator');
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

// GET /api/factory/info - Get factory basic information
router.get('/info', async (req, res, next) => {
  try {
    const [deploymentFee, settings] = await Promise.all([
      web3Service.getDeploymentFee(),
      web3Service.getBondingCurveSettings()
    ]);

    res.json({
      success: true,
      data: {
        factoryAddress: process.env.FACTORY_ADDRESS,
        deploymentFee,
        settings,
        network: {
          name: 'Abstract L2',
          chainId: process.env.ABSTRACT_CHAIN_ID,
          rpcUrl: process.env.ABSTRACT_RPC_URL,
          explorerUrl: 'https://abscan.org'
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/factory/stats - Get factory statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalTokens,
      activeTokens,
      finalizedTokens,
      preBondingTokens,
      bondingTokens
    ] = await Promise.all([
      Token.countDocuments(),
      Token.countDocuments({ isActive: true }),
      Token.countDocuments({ isFinalized: true }),
      Token.countDocuments({ currentPhase: 0, isActive: true }),
      Token.countDocuments({ currentPhase: 1, isActive: true })
    ]);

    // Calculate total volume and ETH collected
    const volumeStats = await Token.aggregate([
      {
        $group: {
          _id: null,
          totalVolume24h: { $sum: { $toDouble: "$volume24h" } },
          totalETHCollected: { $sum: { $toDouble: "$totalETHCollected" } },
          avgMarketCap: { $avg: { $toDouble: "$marketCap" } }
        }
      }
    ]);

    const stats = volumeStats[0] || { 
      totalVolume24h: 0, 
      totalETHCollected: 0, 
      avgMarketCap: 0 
    };

    res.json({
      success: true,
      data: {
        totalTokens,
        activeTokens,
        finalizedTokens,
        preBondingTokens,
        bondingTokens,
        totalVolume24h: stats.totalVolume24h.toString(),
        totalETHCollected: stats.totalETHCollected.toString(),
        avgMarketCap: stats.avgMarketCap.toString(),
        successRate: totalTokens > 0 ? ((finalizedTokens / totalTokens) * 100).toFixed(2) : '0'
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/factory/recent-deployments - Get recent token deployments
router.get('/recent-deployments',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const recentTokens = await Token.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name symbol tokenAddress bondingCurveAddress currentPhase totalETHCollected createdAt')
        .lean();

      res.json({
        success: true,
        data: recentTokens
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/factory/top-performers - Get top performing tokens
router.get('/top-performers',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50'),
    query('sortBy').optional().isIn(['volume24h', 'marketCap', 'totalETHCollected']).withMessage('Invalid sort field')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const sortBy = req.query.sortBy || 'volume24h';

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = -1;

      const topTokens = await Token.find({ isActive: true })
        .sort(sortObj)
        .limit(limit)
        .select('name symbol tokenAddress currentPhase volume24h marketCap totalETHCollected progressPercentage')
        .lean();

      res.json({
        success: true,
        data: topTokens
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/factory/featured-tokens - Get featured tokens
router.get('/featured-tokens',
  [
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1-20')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 5;

      const featuredTokens = await Token.findFeatured()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: featuredTokens
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/factory/tokens-by-phase - Get tokens grouped by phase
router.get('/tokens-by-phase', async (req, res, next) => {
  try {
    const tokensByPhase = await Token.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$currentPhase',
          count: { $sum: 1 },
          totalETH: { $sum: { $toDouble: '$totalETHCollected' } },
          tokens: {
            $push: {
              name: '$name',
              symbol: '$symbol',
              tokenAddress: '$tokenAddress',
              totalETHCollected: '$totalETHCollected',
              createdAt: '$createdAt'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Map phase numbers to readable names
    const phaseNames = {
      0: 'PreBonding',
      1: 'Bonding',
      2: 'Finalized'
    };

    const result = tokensByPhase.map(phase => ({
      phase: phase._id,
      phaseName: phaseNames[phase._id] || 'Unknown',
      count: phase.count,
      totalETH: phase.totalETH.toString(),
      tokens: phase.tokens.slice(0, 5) // Limit to 5 tokens per phase for overview
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/factory/search - Search tokens
router.get('/search',
  [
    query('q').isString().isLength({ min: 1 }).withMessage('Search query is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { q } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Build search filter
      const filter = {
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { symbol: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tags: { $in: [new RegExp(q, 'i')] } }
        ]
      };

      const [tokens, total] = await Promise.all([
        Token.find(filter)
          .sort({ volume24h: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Token.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          tokens,
          query: q,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/factory/tags - Get popular tags
router.get('/tags',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 20;

      const popularTags = await Token.aggregate([
        {
          $match: { isActive: true, tags: { $exists: true, $ne: [] } }
        },
        {
          $unwind: '$tags'
        },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: limit
        }
      ]);

      res.json({
        success: true,
        data: popularTags.map(tag => ({
          tag: tag._id,
          count: tag.count
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/factory/tokens-by-tag/:tag - Get tokens by tag
router.get('/tokens-by-tag/:tag',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { tag } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const filter = {
        isActive: true,
        tags: { $in: [tag.toLowerCase()] }
      };

      const [tokens, total] = await Promise.all([
        Token.find(filter)
          .sort({ volume24h: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Token.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          tokens,
          tag,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 