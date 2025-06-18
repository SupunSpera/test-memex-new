const express = require('express');
const { query, validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
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

// GET /api/analytics/overview - Get platform overview analytics
router.get('/overview',
  [
    query('period').optional().isIn(['24h', '7d', '30d', '90d', 'all']).withMessage('Invalid period')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const period = req.query.period || '30d';
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date(0); // Default to all time
      
      if (period !== 'all') {
        const periodHours = {
          '24h': 24,
          '7d': 24 * 7,
          '30d': 24 * 30,
          '90d': 24 * 90
        };
        startDate = new Date(now.getTime() - periodHours[period] * 60 * 60 * 1000);
      }

      const filter = period === 'all' ? {} : { createdAt: { $gte: startDate } };

      const [
        totalTokens,
        activeTokens,
        finalizedTokens,
        volumeStats,
        phaseDistribution
      ] = await Promise.all([
        Token.countDocuments(filter),
        Token.countDocuments({ ...filter, isActive: true }),
        Token.countDocuments({ ...filter, isFinalized: true }),
        Token.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              totalVolume: { $sum: { $toDouble: "$volume24h" } },
              totalETHCollected: { $sum: { $toDouble: "$totalETHCollected" } },
              avgMarketCap: { $avg: { $toDouble: "$marketCap" } },
              totalTrades: { $sum: "$totalTrades" },
              uniqueTraders: { $sum: "$uniqueTraders" }
            }
          }
        ]),
        Token.aggregate([
          { $match: { ...filter, isActive: true } },
          {
            $group: {
              _id: '$currentPhase',
              count: { $sum: 1 },
              totalETH: { $sum: { $toDouble: '$totalETHCollected' } }
            }
          }
        ])
      ]);

      const stats = volumeStats[0] || {
        totalVolume: 0,
        totalETHCollected: 0,
        avgMarketCap: 0,
        totalTrades: 0,
        uniqueTraders: 0
      };

      res.json({
        success: true,
        data: {
          period,
          overview: {
            totalTokens,
            activeTokens,
            finalizedTokens,
            successRate: totalTokens > 0 ? ((finalizedTokens / totalTokens) * 100).toFixed(2) : '0',
            totalVolume: stats.totalVolume.toString(),
            totalETHCollected: stats.totalETHCollected.toString(),
            avgMarketCap: stats.avgMarketCap.toString(),
            totalTrades: stats.totalTrades,
            uniqueTraders: stats.uniqueTraders
          },
          phaseDistribution: phaseDistribution.map(phase => ({
            phase: phase._id,
            phaseName: ['PreBonding', 'Bonding', 'Finalized'][phase._id] || 'Unknown',
            count: phase.count,
            totalETH: phase.totalETH.toString()
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/analytics/tokens-by-date - Get token creation timeline
router.get('/tokens-by-date',
  [
    query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period'),
    query('interval').optional().isIn(['hour', 'day', 'week']).withMessage('Invalid interval')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const period = req.query.period || '30d';
      const interval = req.query.interval || 'day';
      
      // Calculate date range
      const now = new Date();
      const periodHours = {
        '7d': 24 * 7,
        '30d': 24 * 30,
        '90d': 24 * 90,
        '1y': 24 * 365
      };
      
      const startDate = new Date(now.getTime() - periodHours[period] * 60 * 60 * 1000);

      // Define date format based on interval
      const dateFormat = {
        'hour': "%Y-%m-%d %H:00",
        'day': "%Y-%m-%d",
        'week': "%Y-%U"
      };

      const tokensByDate = await Token.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat[interval],
                date: "$createdAt"
              }
            },
            count: { $sum: 1 },
            totalETH: { $sum: { $toDouble: "$totalETHCollected" } },
            finalized: {
              $sum: { $cond: [{ $eq: ["$isFinalized", true] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        data: {
          period,
          interval,
          timeline: tokensByDate.map(item => ({
            date: item._id,
            tokensCreated: item.count,
            totalETHCollected: item.totalETH.toString(),
            tokensFinalized: item.finalized
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/analytics/volume-by-date - Get volume timeline
router.get('/volume-by-date',
  [
    query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const period = req.query.period || '30d';
      
      // Note: In a full implementation, you'd have volume data by date
      // This would require tracking trades and storing historical data
      
      res.json({
        success: true,
        data: {
          message: 'Volume by date would be implemented with trade tracking',
          period,
          // In real implementation:
          // volumeTimeline: [...] // Array of {date, volume, trades} objects
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/analytics/top-performers - Get top performing tokens
router.get('/top-performers',
  [
    query('metric').optional().isIn(['volume', 'marketCap', 'ethCollected', 'trades']).withMessage('Invalid metric'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
    query('period').optional().isIn(['24h', '7d', '30d', 'all']).withMessage('Invalid period')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const metric = req.query.metric || 'volume';
      const limit = parseInt(req.query.limit) || 10;
      const period = req.query.period || '30d';

      // Build date filter
      let dateFilter = {};
      if (period !== 'all') {
        const now = new Date();
        const periodHours = {
          '24h': 24,
          '7d': 24 * 7,
          '30d': 24 * 30
        };
        const startDate = new Date(now.getTime() - periodHours[period] * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: startDate } };
      }

      // Map metric to field name
      const sortField = {
        'volume': 'volume24h',
        'marketCap': 'marketCap',
        'ethCollected': 'totalETHCollected',
        'trades': 'totalTrades'
      };

      const topPerformers = await Token.find({ 
        isActive: true,
        ...dateFilter
      })
        .sort({ [sortField[metric]]: -1 })
        .limit(limit)
        .select('name symbol tokenAddress volume24h marketCap totalETHCollected totalTrades currentPhase')
        .lean();

      res.json({
        success: true,
        data: {
          metric,
          period,
          topPerformers
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/analytics/phase-transition - Get phase transition analytics
router.get('/phase-transition',
  [
    query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const period = req.query.period || '30d';
      
      const now = new Date();
      const periodHours = {
        '7d': 24 * 7,
        '30d': 24 * 30,
        '90d': 24 * 90
      };
      
      const startDate = new Date(now.getTime() - periodHours[period] * 60 * 60 * 1000);

      const [
        phaseStats,
        transitionStats
      ] = await Promise.all([
        Token.aggregate([
          {
            $match: { 
              createdAt: { $gte: startDate },
              isActive: true 
            }
          },
          {
            $group: {
              _id: '$currentPhase',
              count: { $sum: 1 },
              avgTimeToPhase: { $avg: { $subtract: [new Date(), '$createdAt'] } },
              avgETHCollected: { $avg: { $toDouble: '$totalETHCollected' } }
            }
          }
        ]),
        // Calculate success rates
        Token.aggregate([
          {
            $match: { 
              createdAt: { $gte: startDate },
              isActive: true 
            }
          },
          {
            $group: {
              _id: null,
              totalTokens: { $sum: 1 },
              reachedBonding: { 
                $sum: { $cond: [{ $gte: ['$currentPhase', 1] }, 1, 0] }
              },
              finalized: {
                $sum: { $cond: [{ $eq: ['$isFinalized', true] }, 1, 0] }
              }
            }
          }
        ])
      ]);

      const transitionData = transitionStats[0] || {
        totalTokens: 0,
        reachedBonding: 0,
        finalized: 0
      };

      res.json({
        success: true,
        data: {
          period,
          phaseDistribution: phaseStats.map(phase => ({
            phase: phase._id,
            phaseName: ['PreBonding', 'Bonding', 'Finalized'][phase._id] || 'Unknown',
            count: phase.count,
            avgTimeInPhase: Math.round(phase.avgTimeToPhase / (1000 * 60 * 60)), // Convert to hours
            avgETHCollected: phase.avgETHCollected.toString()
          })),
          successRates: {
            preBondingToBoindingRate: transitionData.totalTokens > 0 
              ? ((transitionData.reachedBonding / transitionData.totalTokens) * 100).toFixed(2)
              : '0',
            bondingToFinalizedRate: transitionData.reachedBonding > 0
              ? ((transitionData.finalized / transitionData.reachedBonding) * 100).toFixed(2)
              : '0',
            overallSuccessRate: transitionData.totalTokens > 0
              ? ((transitionData.finalized / transitionData.totalTokens) * 100).toFixed(2)
              : '0'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/analytics/market-metrics - Get market metrics
router.get('/market-metrics', async (req, res, next) => {
  try {
    const [
      marketStats,
      priceStats,
      liquidityStats
    ] = await Promise.all([
      Token.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: null,
            totalMarketCap: { $sum: { $toDouble: '$marketCap' } },
            avgMarketCap: { $avg: { $toDouble: '$marketCap' } },
            totalVolume24h: { $sum: { $toDouble: '$volume24h' } },
            avgVolume24h: { $avg: { $toDouble: '$volume24h' } }
          }
        }
      ]),
      Token.aggregate([
        {
          $match: { 
            isActive: true,
            currentPrice: { $ne: '0' }
          }
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: { $toDouble: '$currentPrice' } },
            maxPrice: { $max: { $toDouble: '$currentPrice' } },
            minPrice: { $min: { $toDouble: '$currentPrice' } }
          }
        }
      ]),
      Token.aggregate([
        {
          $match: { 
            isActive: true,
            currentPhase: { $in: [0, 1] } // Active bonding curves
          }
        },
        {
          $group: {
            _id: null,
            totalETHLiquidity: { $sum: { $toDouble: '$ethReserve' } },
            avgETHLiquidity: { $avg: { $toDouble: '$ethReserve' } },
            totalTokenLiquidity: { $sum: { $toDouble: '$tokenReserve' } }
          }
        }
      ])
    ]);

    const market = marketStats[0] || {
      totalMarketCap: 0,
      avgMarketCap: 0,
      totalVolume24h: 0,
      avgVolume24h: 0
    };

    const price = priceStats[0] || {
      avgPrice: 0,
      maxPrice: 0,
      minPrice: 0
    };

    const liquidity = liquidityStats[0] || {
      totalETHLiquidity: 0,
      avgETHLiquidity: 0,
      totalTokenLiquidity: 0
    };

    res.json({
      success: true,
      data: {
        market: {
          totalMarketCap: market.totalMarketCap.toString(),
          avgMarketCap: market.avgMarketCap.toString(),
          totalVolume24h: market.totalVolume24h.toString(),
          avgVolume24h: market.avgVolume24h.toString()
        },
        pricing: {
          avgPrice: price.avgPrice.toString(),
          maxPrice: price.maxPrice.toString(),
          minPrice: price.minPrice.toString()
        },
        liquidity: {
          totalETHLiquidity: liquidity.totalETHLiquidity.toString(),
          avgETHLiquidity: liquidity.avgETHLiquidity.toString(),
          totalTokenLiquidity: liquidity.totalTokenLiquidity.toString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/user-behavior - Get user behavior analytics
router.get('/user-behavior', async (req, res, next) => {
  try {
    // Note: This would require user tracking and more detailed models
    // For now, return aggregated data from tokens
    
    const [
      deploymentStats,
      engagementStats
    ] = await Promise.all([
      Token.aggregate([
        {
          $group: {
            _id: '$owner',
            tokensDeployed: { $sum: 1 },
            totalETHRaised: { $sum: { $toDouble: '$totalETHCollected' } },
            successfulTokens: {
              $sum: { $cond: [{ $eq: ['$isFinalized', true] }, 1, 0] }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            avgTokensPerUser: { $avg: '$tokensDeployed' },
            avgETHPerUser: { $avg: '$totalETHRaised' },
            totalSuccessfulDeployers: {
              $sum: { $cond: [{ $gt: ['$successfulTokens', 0] }, 1, 0] }
            }
          }
        }
      ]),
      Token.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: null,
            avgTrades: { $avg: '$totalTrades' },
            totalUniqueTraders: { $sum: '$uniqueTraders' },
            highActivityTokens: {
              $sum: { $cond: [{ $gt: ['$totalTrades', 100] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const deployment = deploymentStats[0] || {
      totalUsers: 0,
      avgTokensPerUser: 0,
      avgETHPerUser: 0,
      totalSuccessfulDeployers: 0
    };

    const engagement = engagementStats[0] || {
      avgTrades: 0,
      totalUniqueTraders: 0,
      highActivityTokens: 0
    };

    res.json({
      success: true,
      data: {
        deployment: {
          totalUsers: deployment.totalUsers,
          avgTokensPerUser: deployment.avgTokensPerUser.toFixed(2),
          avgETHPerUser: deployment.avgETHPerUser.toString(),
          successfulDeployerRate: deployment.totalUsers > 0
            ? ((deployment.totalSuccessfulDeployers / deployment.totalUsers) * 100).toFixed(2)
            : '0'
        },
        engagement: {
          avgTradesPerToken: engagement.avgTrades.toFixed(2),
          totalUniqueTraders: engagement.totalUniqueTraders,
          highActivityTokens: engagement.highActivityTokens
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 