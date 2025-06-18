const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const { web3Service } = require('../services/web3Service');
const Token = require('../models/Token');
const logger = require('../utils/logger');

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

// Middleware to check admin authorization
const requireAdmin = (req, res, next) => {
  const adminPassword = req.headers['x-admin-password'];
  
  // Check if admin password is provided and matches
  if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid admin password'
    });
  }
  
  // Check if admin private key is configured
  if (!process.env.ADMIN_PRIVATE_KEY) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Admin private key not configured'
    });
  }
  
  // Set admin private key from environment (secure)
  req.adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  next();
};

// GET /api/admin/dashboard - Get admin dashboard statistics
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalTokens,
      activeTokens,
      finalizedTokens,
      preBondingTokens,
      bondingTokens,
      deploymentFee,
      bondingCurveSettings
    ] = await Promise.all([
      Token.countDocuments(),
      Token.countDocuments({ isActive: true }),
      Token.countDocuments({ isFinalized: true }),
      Token.countDocuments({ currentPhase: 0, isActive: true }),
      Token.countDocuments({ currentPhase: 1, isActive: true }),
      web3Service.getDeploymentFee(),
      web3Service.getBondingCurveSettings()
    ]);

    // Calculate total volume and fees (from database)
    const volumeStats = await Token.aggregate([
      {
        $group: {
          _id: null,
          totalVolume: { $sum: { $toDouble: "$volume24h" } },
          totalETHCollected: { $sum: { $toDouble: "$totalETHCollected" } }
        }
      }
    ]);

    const recentTokens = await Token.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name symbol tokenAddress createdAt totalETHCollected currentPhase');

    const stats = volumeStats[0] || { totalVolume: 0, totalETHCollected: 0 };

    res.json({
      success: true,
      data: {
        statistics: {
          totalTokens,
          activeTokens,
          finalizedTokens,
          preBondingTokens,
          bondingTokens,
          totalVolume: stats.totalVolume.toString(),
          totalETHCollected: stats.totalETHCollected.toString(),
          deploymentFee
        },
        settings: bondingCurveSettings,
        recentTokens
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/settings - Get current factory settings
router.get('/settings', async (req, res, next) => {
  try {
    const [deploymentFee, bondingCurveSettings] = await Promise.all([
      web3Service.getDeploymentFee(),
      web3Service.getBondingCurveSettings()
    ]);

    res.json({
      success: true,
      data: {
        deploymentFee,
        bondingCurveSettings
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/settings/deployment-fee - Update deployment fee
router.put('/settings/deployment-fee',
  requireAdmin,
  [
    body('fee')
      .isFloat({ min: 0 })
      .withMessage('Fee must be a positive number')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { fee } = req.body;
      
      const result = await web3Service.updateDeploymentFee(fee, req.adminPrivateKey);
      
      logger.info(`Admin updated deployment fee to ${fee} ETH`, {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber
      });

      res.json({
        success: true,
        message: 'Deployment fee updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/admin/settings/bonding-curve - Update bonding curve settings
router.put('/settings/bonding-curve',
  requireAdmin,
  [
    body('virtualEth').isFloat({ min: 0 }).withMessage('Virtual ETH must be positive'),
    body('preBondingTarget').isFloat({ min: 0 }).withMessage('Pre-bonding target must be positive'),
    body('bondingTarget').isFloat({ min: 0 }).withMessage('Bonding target must be positive'),
    body('minContribution').isFloat({ min: 0 }).withMessage('Min contribution must be positive'),
    body('poolFee').isInt({ min: 100, max: 10000 }).withMessage('Pool fee must be between 100-10000'),
    body('sellFee').isInt({ min: 0, max: 1000 }).withMessage('Sell fee must be between 0-1000'),
    body('feeTo').isEthereumAddress().withMessage('Invalid fee recipient address'),
    body('uniswapV3Factory').isEthereumAddress().withMessage('Invalid Uniswap factory address'),
    body('weth').isEthereumAddress().withMessage('Invalid WETH address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const settings = req.body;
      
      const result = await web3Service.updateBondingCurveSettings(settings, req.adminPrivateKey);
      
      logger.info('Admin updated bonding curve settings', {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        settings
      });

      res.json({
        success: true,
        message: 'Bonding curve settings updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/withdraw-fees - Withdraw collected fees
router.post('/withdraw-fees',
  requireAdmin,
  [
    body('recipient')
      .isEthereumAddress()
      .withMessage('Invalid recipient address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { recipient } = req.body;
      
      const result = await web3Service.withdrawFees(recipient, req.adminPrivateKey);
      
      logger.info(`Admin withdrew fees to ${recipient}`, {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber
      });

      res.json({
        success: true,
        message: 'Fees withdrawn successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/tokens - Get all tokens with admin details
router.get('/tokens',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
    query('phase').optional().isIn(['0', '1', '2']).withMessage('Invalid phase'),
    query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    query('search').optional().isString().withMessage('Search must be string')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      if (req.query.phase !== undefined) {
        filter.currentPhase = parseInt(req.query.phase);
      }
      if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === 'true';
      }
      if (req.query.search) {
        filter.$text = { $search: req.query.search };
      }

      const [tokens, total] = await Promise.all([
        Token.find(filter)
          .sort({ createdAt: -1 })
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
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/admin/tokens/:address/status - Update token status
router.put('/tokens/:address/status',
  requireAdmin,
  [
    param('address').isEthereumAddress().withMessage('Invalid token address'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    body('isFeatured').optional().isBoolean().withMessage('isFeatured must be boolean'),
    body('isVerified').optional().isBoolean().withMessage('isVerified must be boolean'),
    body('adminNotes').optional().isString().withMessage('Admin notes must be string')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const updates = req.body;

      const token = await Token.findByAddress(address);
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Update token status
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          token[key] = updates[key];
        }
      });

      await token.save();

      logger.info(`Admin updated token status: ${address}`, { updates });

      res.json({
        success: true,
        message: 'Token status updated successfully',
        data: token
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 